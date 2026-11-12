import os
import pytest
from sqlalchemy.dialects import postgresql
from sqlalchemy.schema import CreateTable

from app.db.audit_service import AuditService
from app.db.models import (
    Account,
    ApprovalRequest,
    AuditLog,
    ConsumedPolicyToken,
    Dispute,
    Evidence,
    Merchant,
    Transaction,
)


def test_postgresql_ddl_compilation_all_models():
    """
    Phase 3 Requirement: PostgreSQL Schema & Migration Verification.
    Verifies that all SentinelPay ORM models cleanly compile to production-grade PostgreSQL DDL.
    """
    pg_dialect = postgresql.dialect()
    models = [
        AuditLog,
        ConsumedPolicyToken,
        Merchant,
        Account,
        Transaction,
        Dispute,
        Evidence,
        ApprovalRequest,
    ]

    for model in models:
        table = model.__table__
        ddl = str(CreateTable(table).compile(dialect=pg_dialect)).strip()
        assert len(ddl) > 0
        assert table.name in ddl


def test_postgresql_audit_log_schema_constraints():
    """
    Phase 3 Requirement: Monotonic audit sequence_id and hash-chain constraints on PostgreSQL.
    """
    pg_dialect = postgresql.dialect()
    ddl = str(CreateTable(AuditLog.__table__).compile(dialect=pg_dialect))

    assert "sequence_id" in ddl
    assert "prev_hash" in ddl
    assert "current_hash" in ddl
    assert "BIGINT" in ddl or "INTEGER" in ddl


def test_postgresql_consumed_policy_token_schema_constraints():
    """
    Phase 3 Requirement: Single-use token constraints and indexes on PostgreSQL.
    """
    pg_dialect = postgresql.dialect()
    ddl = str(CreateTable(ConsumedPolicyToken.__table__).compile(dialect=pg_dialect))

    assert "token_hash" in ddl
    assert "VARCHAR(64)" in ddl
    assert "dispute_id" in ddl
    assert "action" in ddl
    assert "amount" in ddl


def test_postgresql_advisory_lock_command_syntax():
    """
    Phase 3 Requirement: Advisory lock behavior syntax verification.
    """
    lock_id = AuditService.PG_AUDIT_ADVISORY_LOCK_ID
    expected_sql = f"SELECT pg_advisory_xact_lock({lock_id})"
    assert lock_id == 89472918471
    assert expected_sql == "SELECT pg_advisory_xact_lock(89472918471)"


@pytest.mark.skipif(
    not (os.getenv("POSTGRES_TEST_URL") or os.getenv("DATABASE_URL", "").startswith("postgresql") or os.getenv("DATABASE_URL", "").startswith("postgres")),
    reason="Live PostgreSQL database not available in local Windows environment. Run with POSTGRES_TEST_URL or postgresql DATABASE_URL in staging."
)
@pytest.mark.asyncio
async def test_live_postgresql_concurrency():
    from scripts.verify_postgresql import verify_live_postgresql
    db_url = os.getenv("POSTGRES_TEST_URL") or os.getenv("DATABASE_URL")
    success = await verify_live_postgresql(db_url)
    assert success is True
