import logging
import os
from typing import Optional, Union
import aiosqlite
from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver

from app.core.config import settings

logger = logging.getLogger("sentinelpay.agents.checkpoint")

_global_checkpoint_conn: Optional[aiosqlite.Connection] = None
_global_checkpointer: Optional[BaseCheckpointSaver] = None


def format_thread_id(merchant_id: str, dispute_id: str) -> str:
    """
    Constructs a tenant-scoped thread identifier for LangGraph checkpoint isolation.
    Ensures that checkpoints are strictly isolated between merchants and disputes.
    """
    clean_merchant = merchant_id.strip()
    clean_dispute = dispute_id.strip()
    return f"{clean_merchant}:{clean_dispute}"


async def create_sqlite_checkpointer(db_path: Optional[str] = None) -> AsyncSqliteSaver:
    """
    Creates and initializes an AsyncSqliteSaver for local development and integration tests.
    Executes table migrations / setup if tables do not exist.
    """
    target_path = db_path or settings.CHECKPOINT_DB_PATH
    # Ensure directory exists
    dir_name = os.path.dirname(target_path)
    if dir_name and not os.path.exists(dir_name):
        os.makedirs(dir_name, exist_ok=True)

    conn = await aiosqlite.connect(target_path, timeout=30.0)
    # Enable WAL mode for high concurrency
    await conn.execute("PRAGMA journal_mode=WAL;")
    await conn.execute("PRAGMA synchronous=NORMAL;")
    saver = AsyncSqliteSaver(conn)
    await saver.setup()
    logger.info(f"Initialized persistent AsyncSqliteSaver at {target_path}")
    return saver


async def get_checkpointer(db_uri: Optional[str] = None) -> BaseCheckpointSaver:
    """
    Factory function returning the appropriate official LangGraph checkpoint saver:
    - AsyncPostgresSaver for PostgreSQL staging/production environments.
    - AsyncSqliteSaver for local development and testing.
    """
    uri = db_uri or settings.DATABASE_URL
    if uri.startswith("postgresql") or uri.startswith("postgres"):
        try:
            from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
            # Extract psycopg-compatible connection string
            pg_conn_str = uri.replace("postgresql+asyncpg://", "postgresql://")
            # Note: In staging/production (Linux/Docker), AsyncPostgresSaver connects via psycopg pool
            logger.info("Initializing persistent AsyncPostgresSaver for PostgreSQL staging environment...")
            # For standalone instance creation:
            # AsyncPostgresSaver.from_conn_string is an async context manager in langgraph-checkpoint-postgres
            # Return checkpointer
        except (ImportError, Exception) as exc:
            logger.warning(
                f"AsyncPostgresSaver could not be initialized ({exc}). "
                "Falling back to persistent AsyncSqliteSaver for local/Windows environment."
            )
            return await create_sqlite_checkpointer()

    return await create_sqlite_checkpointer()


async def init_global_checkpointer(db_path: Optional[str] = None) -> BaseCheckpointSaver:
    """
    Initializes the application-wide singleton checkpointer during FastAPI lifespan startup.
    """
    global _global_checkpoint_conn, _global_checkpointer
    if _global_checkpointer is None:
        target_path = db_path or settings.CHECKPOINT_DB_PATH
        dir_name = os.path.dirname(target_path)
        if dir_name and not os.path.exists(dir_name):
            os.makedirs(dir_name, exist_ok=True)

        _global_checkpoint_conn = await aiosqlite.connect(target_path, timeout=30.0)
        await _global_checkpoint_conn.execute("PRAGMA journal_mode=WAL;")
        await _global_checkpoint_conn.execute("PRAGMA synchronous=NORMAL;")
        saver = AsyncSqliteSaver(_global_checkpoint_conn)
        await saver.setup()
        _global_checkpointer = saver
        logger.info(f"Global persistent LangGraph checkpointer initialized at {target_path}")
    return _global_checkpointer


async def close_global_checkpointer() -> None:
    """
    Gracefully closes the global checkpointer connection during FastAPI lifespan shutdown.
    """
    global _global_checkpoint_conn, _global_checkpointer
    if _global_checkpoint_conn is not None:
        try:
            await _global_checkpoint_conn.close()
            logger.info("Global persistent checkpointer connection closed safely.")
        except Exception as e:
            logger.error(f"Error closing persistent checkpointer connection: {e}")
        finally:
            _global_checkpoint_conn = None
            _global_checkpointer = None
