import os
import tempfile
import uuid
import asyncio
import aiosqlite
import pytest
from datetime import datetime, timezone
from sqlalchemy import select

from app.agents.checkpoint import create_sqlite_checkpointer, format_thread_id
from app.agents.graph import build_dispute_graph
from app.agents.state import create_initial_state
from app.core.security import create_access_token
from app.db.audit_service import AuditService
from app.db.models import ApprovalRequest, AuditLog, ConsumedPolicyToken, Transaction
from app.db.session import AsyncSessionLocal
from app.mcp.schemas import MCPCallerIdentity
from app.mcp.server import FinancialMCPServer
from app.policy.engine import DeterministicPolicyEngine, PolicyVerdict
from app.security.prompt_injection import PromptInjectionShield


@pytest.mark.asyncio
async def test_complete_dispute_lifecycle_end_to_end():
    """
    Phase 4: Full End-to-End Governed FinTech Lifecycle Verification.
    Lifecycle Stages:
    1. Dispute Submission & JWT Authentication
    2. Security Screening & Unicode Normalization
    3. Multi-Agent Investigation & Context Retrieval
    4. Evidence Analysis & Adversarial Screening
    5. Deterministic Policy Evaluation (₹15,000 > ₹10,000 threshold)
    6. Human Approval Escalation & Checkpoint Suspension (AWAITING_APPROVAL)
    7. Simulated Server Crash & Independent Application Restart
    8. Checkpoint Restoration from Persistent Store
    9. Human Risk Lead Signed Authorization Token Issuance
    10. Resumed MCP Financial Execution & Single-Use Token Consumption
    11. Cryptographic Hash-Chain Audit Ledger Verification
    12. Adversarial Replay Protection Verification
    """
    test_cp_db = os.path.join(tempfile.gettempdir(), f"e2e_cp_{uuid.uuid4().hex[:8]}.db")
    dispute_id = f"disp_e2e_{uuid.uuid4().hex[:8]}"
    merchant_id = "mch_zenith_04"
    thread_id = format_thread_id(merchant_id, dispute_id)
    idempotency_key = f"idemp_e2e_{uuid.uuid4().hex[:10]}"

    try:
        # -------------------------------------------------------------
        # STAGE 1 & 2: SUBMISSION, AUTH & SECURITY SCREENING
        # -------------------------------------------------------------
        token = create_access_token(
            data={"sub": "usr_risk_lead_01", "role": "RISK_LEAD", "merchant_id": merchant_id}
        )
        assert token is not None

        raw_claim = "Customer luxury chronograph arrived with malfunctioning mechanical bezel. Please investigate."
        screen_res = PromptInjectionShield.scan_and_sanitize(raw_claim)
        assert screen_res.is_safe is True
        assert screen_res.threat_detected is False

        initial_state = create_initial_state(
            dispute_id=dispute_id,
            transaction_id="txn_1002",
            merchant_id=merchant_id,
            customer_id="CUST-IND-1004",
            dispute_type="defective_item",
            disputed_amount=15000.0,
            claim_reason=screen_res.sanitized_text,
            idempotency_key=idempotency_key,
        )

        # -------------------------------------------------------------
        # STAGE 3-6: INVESTIGATION, POLICY EVALUATION, & SUSPENSION
        # -------------------------------------------------------------
        saver_inst1 = await create_sqlite_checkpointer(test_cp_db)
        graph_inst1 = build_dispute_graph(checkpointer=saver_inst1)

        config = {"configurable": {"thread_id": thread_id}}
        state_suspended = await graph_inst1.ainvoke(initial_state, config=config)

        # Verify deterministic policy suspended for human approval
        assert state_suspended["status"] == "AWAITING_APPROVAL"
        assert state_suspended["human_approval_required"] is True
        assert state_suspended["policy_engine_result"]["overall_verdict"] == PolicyVerdict.REQUIRES_HUMAN_APPROVAL.value

        # Verify ApprovalRequest registered in database
        async with AsyncSessionLocal() as session:
            appr = (await session.execute(
                select(ApprovalRequest).where(ApprovalRequest.dispute_id == dispute_id)
            )).scalar_one_or_none()
            assert appr is not None
            assert appr.status == "PENDING"
            assert appr.amount == 15000.0

        # -------------------------------------------------------------
        # STAGE 7: SIMULATED SERVER CRASH & COMPLETE RESTART
        # -------------------------------------------------------------
        # Close connection and tear down Instance 1
        await saver_inst1.conn.close()
        del graph_inst1, saver_inst1

        # Instance 2 starts up fresh from disk checkpoint
        saver_inst2 = await create_sqlite_checkpointer(test_cp_db)
        graph_inst2 = build_dispute_graph(checkpointer=saver_inst2)

        # Verify state correctly recovered across restart
        recovered_tuple = await saver_inst2.aget_tuple(config)
        assert recovered_tuple is not None
        assert recovered_tuple.checkpoint["channel_values"]["status"] == "AWAITING_APPROVAL"
        assert recovered_tuple.checkpoint["channel_values"]["dispute_id"] == dispute_id

        # -------------------------------------------------------------
        # STAGE 8 & 9: SIGNED HUMAN AUTHORIZATION TOKEN ISSUANCE
        # -------------------------------------------------------------
        human_summary = DeterministicPolicyEngine.authorize_human_approval(
            dispute_id=dispute_id,
            transaction_id="txn_1002",
            merchant_id=merchant_id,
            amount=15000.0,
            idempotency_key=idempotency_key,
            approver_id="usr_risk_lead_01",
            approver_role="RISK_LEAD",
        )
        assert human_summary.execution_permitted is True
        assert human_summary.policy_token is not None

        # -------------------------------------------------------------
        # STAGE 10: RESUMED WORKFLOW & MCP FINANCIAL EXECUTION
        # -------------------------------------------------------------
        resume_payload = {
            "human_approval_status": "APPROVED",
            "human_approver_id": "usr_risk_lead_01",
            "human_approver_role": "RISK_LEAD",
            "status": "APPROVED_BY_HUMAN",
            "policy_engine_result": human_summary.model_dump(),
        }

        final_state = await graph_inst2.ainvoke(resume_payload, config=config)

        assert final_state["status"] == "RESOLVED_REFUNDED"
        assert final_state["current_stage"] == "COMPLETED"
        assert final_state["execution_result"]["success"] is True
        assert final_state["execution_result"]["refunded_amount"] == 15000.0

        # Verify transaction balance updated
        async with AsyncSessionLocal() as session:
            tx = (await session.execute(select(Transaction).where(Transaction.id == "txn_1002"))).scalar_one()
            assert tx.refunded_amount == 15000.0
            assert tx.status in ["REFUNDED", "PARTIALLY_REFUNDED"]

            # Verify single-use policy token was recorded in ConsumedPolicyToken
            consumed = (await session.execute(
                select(ConsumedPolicyToken).where(ConsumedPolicyToken.dispute_id == dispute_id)
            )).scalar_one_or_none()
            assert consumed is not None
            assert consumed.action_type == "REFUND"
            assert consumed.amount == 15000.0

        # -------------------------------------------------------------
        # STAGE 11: CRYPTOGRAPHIC HASH-CHAIN AUDIT VERIFICATION
        # -------------------------------------------------------------
        async with AsyncSessionLocal() as session:
            is_valid, err = await AuditService.verify_chain(session)
            assert is_valid is True, f"Cryptographic audit chain compromised: {err}"

            # Verify sequence ordering
            logs = (await session.execute(select(AuditLog).order_by(AuditLog.sequence_id.asc()))).scalars().all()
            assert len(logs) > 0
            for idx in range(1, len(logs)):
                assert logs[idx].sequence_id == logs[idx - 1].sequence_id + 1
                assert logs[idx].prev_hash == logs[idx - 1].current_hash

        # -------------------------------------------------------------
        # STAGE 12: ADVERSARIAL REPLAY PROTECTION
        # -------------------------------------------------------------
        # Attempt duplicate execution on recovered workflow
        replay_state = await graph_inst2.ainvoke(resume_payload, config=config)
        assert replay_state["status"] == "FAILED"
        assert any("already been consumed" in e.lower() for e in replay_state.get("errors", []))

        # Close instance 2 connection
        await saver_inst2.conn.close()

    finally:
        for suffix in ["", "-wal", "-shm"]:
            p = test_cp_db + suffix
            if os.path.exists(p):
                try:
                    os.remove(p)
                except Exception:
                    pass
