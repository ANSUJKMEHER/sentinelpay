import os
import tempfile
import uuid
import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


def test_alembic_migrations_upgrade_and_downgrade():
    """
    Verifies that Alembic migrations run cleanly from 0001_initial_schema to head
    and can cleanly downgrade to base on a fresh database.
    """
    temp_db_path = os.path.join(tempfile.gettempdir(), f"alembic_test_{uuid.uuid4().hex[:8]}.db").replace("\\", "/")
    async_url = f"sqlite+aiosqlite:///{temp_db_path}"
    sync_url = f"sqlite:///{temp_db_path}"

    ini_path = os.path.join(BACKEND_DIR, "alembic.ini")
    cfg = Config(ini_path)
    cfg.set_main_option("script_location", os.path.join(BACKEND_DIR, "alembic"))
    cfg.set_main_option("sqlalchemy.url", async_url)

    try:
        # Run upgrade to head
        command.upgrade(cfg, "head")

        # Verify all tables exist
        engine = create_engine(sync_url)
        try:
            inspector = inspect(engine)
            table_names = set(inspector.get_table_names())

            expected_tables = {
                "alembic_version",
                "merchants",
                "accounts",
                "transactions",
                "disputes",
                "evidence",
                "policy_rules",
                "approval_requests",
                "execution_ledger",
                "audit_logs",
                "consumed_policy_tokens",
            }

            assert expected_tables.issubset(table_names), f"Missing tables: {expected_tables - table_names}"

            # Verify sequence_id index on audit_logs
            audit_indices = inspector.get_indexes("audit_logs")
            index_names = [idx["name"] for idx in audit_indices]
            assert "ix_audit_logs_sequence_id" in index_names
        finally:
            engine.dispose()

        # Run downgrade to base
        command.downgrade(cfg, "base")

        engine2 = create_engine(sync_url)
        try:
            inspector_after = inspect(engine2)
            tables_after = set(inspector_after.get_table_names())
            assert "merchants" not in tables_after
            assert "audit_logs" not in tables_after
        finally:
            engine2.dispose()

    finally:
        if os.path.exists(temp_db_path):
            try:
                os.remove(temp_db_path)
            except Exception:
                pass
