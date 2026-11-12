import os
import sys
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import settings

# For SQLite, ensure check_same_thread=False
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

is_test = (
    os.getenv("TESTING", "").lower() in ("true", "1")
    or os.getenv("ENVIRONMENT", "").lower() in ("test", "testing")
    or "pytest" in sys.modules
    or any("pytest" in arg for arg in sys.argv)
)

engine_kwargs = {
    "echo": settings.DEBUG,
    "connect_args": connect_args,
    "future": True,
}

if is_test:
    # Use NullPool during test execution to prevent asyncpg connections from being reused across
    # different event loops or sessions, eliminating asyncpg InterfaceError contention.
    engine_kwargs["poolclass"] = NullPool

engine = create_async_engine(
    settings.DATABASE_URL,
    **engine_kwargs,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
