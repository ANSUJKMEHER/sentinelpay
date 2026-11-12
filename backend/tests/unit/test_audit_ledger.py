import pytest
from app.db.session import AsyncSessionLocal
from app.db.audit_service import AuditService
from app.db.models import AuditLog


@pytest.mark.asyncio
async def test_audit_chain_verification():
    async with AsyncSessionLocal() as session:
        # Verify genesis or current chain
        is_valid, error = await AuditService.verify_chain(session)
        assert is_valid is True, f"Audit chain validation failed: {error}"

        # Append two consecutive audit events
        event1 = await AuditService.append_event(
            session=session,
            trace_id="test_trace_1",
            event_type="DISPUTE_INTAKE",
            actor_type="AGENT",
            actor_id="intake_agent",
            payload={"dispute_id": "disp_test_001", "amount": 1500.0},
        )
        assert event1.current_hash is not None

        event2 = await AuditService.append_event(
            session=session,
            trace_id="test_trace_1",
            event_type="POLICY_EVALUATED",
            actor_type="POLICY_ENGINE",
            actor_id="deterministic_policy_engine",
            payload={"dispute_id": "disp_test_001", "verdict": "AUTO_APPROVED"},
        )
        assert event2.prev_hash == event1.current_hash

        # Verify chain integrity
        is_valid, error = await AuditService.verify_chain(session)
        assert is_valid is True
        assert error is None


@pytest.mark.asyncio
async def test_audit_tampering_detection():
    async with AsyncSessionLocal() as session:
        # Append event
        event = await AuditService.append_event(
            session=session,
            trace_id="test_tamper_trace",
            event_type="FINANCIAL_EXECUTION",
            actor_type="MCP_TOOL",
            actor_id="execute_refund",
            payload={"amount": 500.0, "status": "SUCCESS"},
        )

        # Manually tamper with the record's payload in memory/DB
        event.event_payload = '{"amount":999999.0,"status":"FRAUDULENT"}'
        await session.commit()

        # Chain verification must detect the tampering
        is_valid, error = await AuditService.verify_chain(session)
        assert is_valid is False
        assert "Tampered record" in error

        # Restore legitimate payload to leave clean state
        event.event_payload = AuditService.canonical_json({"amount": 500.0, "status": "SUCCESS"})
        await session.commit()
