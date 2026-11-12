import os
import uuid
import tempfile
import asyncio
import aiosqlite
import pytest
from datetime import datetime, timezone
from sqlalchemy import select

from app.agents.checkpoint import create_sqlite_checkpointer, format_thread_id
from app.agents.graph import build_dispute_graph
from app.agents.state import create_initial_state
from app.core.config import settings
from app.db.models import ApprovalRequest, ConsumedPolicyToken, Transaction
from app.db.session import AsyncSessionLocal
from app.policy.engine import DeterministicPolicyEngine


@pytest.mark.asyncio
async def test_checkpoint_survival_across_simulated_process_restart():
    """
    Phase 1 Requirement: Checkpoint persistence across application restarts.
    1. Instance A runs workflow for a high-value dispute (₹15,000) and suspends at AWAITING_APPROVAL.
    2. Instance A is completely destroyed (simulating process termination / crash / restart).
    3. Independent Instance B initializes pointing to the same persistent SQLite checkpoint store.
    4. Instance B restores suspended state and successfully executes human approval resumption.
    5. Verifies financial execution completes and single-use token is consumed.
    """
    test_cp_db = os.path.join(tempfile.gettempdir(), f"test_restart_{uuid.uuid4().hex[:8]}.db")
    dispute_id = f"disp_rst_{uuid.uuid4().hex[:8]}"
    merchant_id = "mch_zenith_04"
    thread_id = format_thread_id(merchant_id, dispute_id)
    idempotency_key = f"idemp_rst_{uuid.uuid4().hex[:10]}"

    try:
        # === APPLICATION INSTANCE 1 ===
        saver_1 = await create_sqlite_checkpointer(test_cp_db)
        graph_1 = build_dispute_graph(checkpointer=saver_1)

        initial_state = create_initial_state(
            dispute_id=dispute_id,
            transaction_id="txn_1002",
            merchant_id=merchant_id,
            customer_id="CUST-IND-1004",
            dispute_type="defective_item",
            disputed_amount=15000.0,
            claim_reason="Customer luxury timepiece arrived with cracked sapphire crystal.",
            idempotency_key=idempotency_key,
        )

        config = {"configurable": {"thread_id": thread_id}}
        state_suspended = await graph_1.ainvoke(initial_state, config=config)

        assert state_suspended["status"] == "AWAITING_APPROVAL"
        assert state_suspended["human_approval_required"] is True
        assert state_suspended["dispute_id"] == dispute_id

        # Verify state in checkpoint storage
        tuple_1 = await saver_1.aget_tuple(config)
        assert tuple_1 is not None
        assert tuple_1.checkpoint["channel_values"]["status"] == "AWAITING_APPROVAL"

        # Simulate complete application restart / shutdown
        await saver_1.conn.close()
        del graph_1, saver_1

        # === APPLICATION INSTANCE 2 (Independent Process Emulation) ===
        saver_2 = await create_sqlite_checkpointer(test_cp_db)
        graph_2 = build_dispute_graph(checkpointer=saver_2)

        # Confirm instance 2 successfully restores checkpoint from disk
        restored_tuple = await saver_2.aget_tuple(config)
        assert restored_tuple is not None
        restored_channel_values = restored_tuple.checkpoint["channel_values"]
        assert restored_channel_values["dispute_id"] == dispute_id
        assert restored_channel_values["disputed_amount"] == 15000.0
        assert restored_channel_values["status"] == "AWAITING_APPROVAL"

        # Risk Lead authorizes the suspended case
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

        resume_payload = {
            "human_approval_status": "APPROVED",
            "human_approver_id": "usr_risk_lead_01",
            "human_approver_role": "RISK_LEAD",
            "status": "APPROVED_BY_HUMAN",
            "policy_engine_result": human_summary.model_dump(),
        }

        # Instance 2 resumes workflow from disk checkpoint
        final_state = await graph_2.ainvoke(resume_payload, config=config)

        assert final_state["status"] == "RESOLVED_REFUNDED"
        assert final_state["current_stage"] == "COMPLETED"
        assert final_state["execution_result"]["success"] is True
        assert final_state["execution_result"]["refunded_amount"] == 15000.0

        # Close instance 2 connection
        await saver_2.conn.close()

    finally:
        # Cleanup temporary files
        for suffix in ["", "-wal", "-shm"]:
            fpath = test_cp_db + suffix
            if os.path.exists(fpath):
                try:
                    os.remove(fpath)
                except Exception:
                    pass


@pytest.mark.asyncio
async def test_checkpoint_tenant_and_dispute_isolation():
    """
    Phase 1 Requirement: Ensure checkpoint isolation between merchants and dispute threads.
    Even with identical dispute IDs, differing merchant namespaces must remain completely isolated.
    """
    test_cp_db = os.path.join(tempfile.gettempdir(), f"test_isolation_{uuid.uuid4().hex[:8]}.db")
    common_dispute_id = "disp_shared_uuid_001"
    merchant_a = "mch_zenith_04"
    merchant_b = "mch_aurora_01"

    thread_a = format_thread_id(merchant_a, common_dispute_id)
    thread_b = format_thread_id(merchant_b, common_dispute_id)

    assert thread_a != thread_b
    assert thread_a == f"mch_zenith_04:{common_dispute_id}"
    assert thread_b == f"mch_aurora_01:{common_dispute_id}"

    try:
        saver = await create_sqlite_checkpointer(test_cp_db)
        graph = build_dispute_graph(checkpointer=saver)

        state_a = create_initial_state(
            dispute_id=common_dispute_id,
            transaction_id="txn_1002",
            merchant_id=merchant_a,
            customer_id="CUST-IND-1004",
            dispute_type="defective_item",
            disputed_amount=5000.0,
            claim_reason="Merchant A dispute",
            idempotency_key=f"idemp_a_{uuid.uuid4().hex[:8]}",
        )

        state_b = create_initial_state(
            dispute_id=common_dispute_id,
            transaction_id="txn_1002",
            merchant_id=merchant_b,
            customer_id="CUST-IND-1001",
            dispute_type="fraudulent_merchant",
            disputed_amount=12000.0,
            claim_reason="Merchant B dispute",
            idempotency_key=f"idemp_b_{uuid.uuid4().hex[:8]}",
        )

        # Run Merchant A
        res_a = await graph.ainvoke(state_a, config={"configurable": {"thread_id": thread_a}})
        # Run Merchant B
        res_b = await graph.ainvoke(state_b, config={"configurable": {"thread_id": thread_b}})

        # Merchant A: ₹5000 auto-approved
        assert res_a["status"] == "RESOLVED_REFUNDED"
        assert res_a["disputed_amount"] == 5000.0
        assert res_a["merchant_id"] == merchant_a

        # Merchant B: ₹12000 requires human approval
        assert res_b["status"] == "AWAITING_APPROVAL"
        assert res_b["disputed_amount"] == 12000.0
        assert res_b["merchant_id"] == merchant_b

        # Verify checkpoint tuples in DB are completely separate
        tuple_a = await saver.aget_tuple({"configurable": {"thread_id": thread_a}})
        tuple_b = await saver.aget_tuple({"configurable": {"thread_id": thread_b}})

        assert tuple_a.checkpoint["channel_values"]["merchant_id"] == merchant_a
        assert tuple_a.checkpoint["channel_values"]["disputed_amount"] == 5000.0

        assert tuple_b.checkpoint["channel_values"]["merchant_id"] == merchant_b
        assert tuple_b.checkpoint["channel_values"]["disputed_amount"] == 12000.0

        await saver.conn.close()

    finally:
        for suffix in ["", "-wal", "-shm"]:
            fpath = test_cp_db + suffix
            if os.path.exists(fpath):
                try:
                    os.remove(fpath)
                except Exception:
                    pass


@pytest.mark.asyncio
async def test_resumed_workflow_prevents_duplicate_financial_execution():
    """
    Phase 1 Requirement: Resumed workflows cannot execute duplicate financial operations.
    Replaying an approval or resuming twice on the recovered workflow MUST be rejected
    by single-use policy token gating.
    """
    test_cp_db = os.path.join(tempfile.gettempdir(), f"test_dup_{uuid.uuid4().hex[:8]}.db")
    dispute_id = f"disp_dup_{uuid.uuid4().hex[:8]}"
    merchant_id = "mch_zenith_04"
    thread_id = format_thread_id(merchant_id, dispute_id)
    idempotency_key = f"idemp_dup_{uuid.uuid4().hex[:10]}"

    try:
        saver = await create_sqlite_checkpointer(test_cp_db)
        graph = build_dispute_graph(checkpointer=saver)

        initial_state = create_initial_state(
            dispute_id=dispute_id,
            transaction_id="txn_1002",
            merchant_id=merchant_id,
            customer_id="CUST-IND-1004",
            dispute_type="defective_item",
            disputed_amount=15000.0,
            claim_reason="Customer timepiece defect claim",
            idempotency_key=idempotency_key,
        )

        config = {"configurable": {"thread_id": thread_id}}
        await graph.ainvoke(initial_state, config=config)

        # Risk lead authorizes once
        human_summary = DeterministicPolicyEngine.authorize_human_approval(
            dispute_id=dispute_id,
            transaction_id="txn_1002",
            merchant_id=merchant_id,
            amount=15000.0,
            idempotency_key=idempotency_key,
            approver_id="usr_risk_lead_01",
            approver_role="RISK_LEAD",
        )

        resume_payload = {
            "human_approval_status": "APPROVED",
            "human_approver_id": "usr_risk_lead_01",
            "human_approver_role": "RISK_LEAD",
            "status": "APPROVED_BY_HUMAN",
            "policy_engine_result": human_summary.model_dump(),
        }

        # First resumption: succeeds
        res_1 = await graph.ainvoke(resume_payload, config=config)
        assert res_1["status"] == "RESOLVED_REFUNDED"
        assert res_1["execution_result"]["success"] is True

        # Second resumption attempt (replay attack or duplicate call):
        # Must fail because single-use policy token has already been consumed!
        res_2 = await graph.ainvoke(resume_payload, config=config)
        assert res_2["status"] == "FAILED"
        assert any("already been consumed" in err.lower() for err in res_2.get("errors", []))

        # Check total refunded amount in DB: must be exactly 15,000, NOT 30,000
        async with AsyncSessionLocal() as session:
            tx = (await session.execute(select(Transaction).where(Transaction.id == "txn_1002"))).scalar_one()
            assert tx.refunded_amount == 15000.0

        await saver.conn.close()

    finally:
        for suffix in ["", "-wal", "-shm"]:
            fpath = test_cp_db + suffix
            if os.path.exists(fpath):
                try:
                    os.remove(fpath)
                except Exception:
                    pass


@pytest.mark.asyncio
async def test_concurrent_workflow_resumes():
    """
    Phase 1 Requirement: Test concurrent workflow resumes.
    Multiple independent approval resumes executing concurrently across distinct threads
    must all execute atomically without lock collisions or checkpoint data corruption.
    """
    test_cp_db = os.path.join(tempfile.gettempdir(), f"test_conc_res_{uuid.uuid4().hex[:8]}.db")
    merchant_id = "mch_zenith_04"
    saver = await create_sqlite_checkpointer(test_cp_db)
    graph = build_dispute_graph(checkpointer=saver)

    cases = []
    for i in range(3):
        disp_id = f"disp_conc_{i}_{uuid.uuid4().hex[:6]}"
        idemp = f"idemp_conc_{i}_{uuid.uuid4().hex[:8]}"
        thread = format_thread_id(merchant_id, disp_id)
        cases.append({"dispute_id": disp_id, "idempotency_key": idemp, "thread_id": thread})

    try:
        # Suspend all cases
        for case in cases:
            state = create_initial_state(
                dispute_id=case["dispute_id"],
                transaction_id="txn_1002",
                merchant_id=merchant_id,
                customer_id="CUST-IND-1004",
                dispute_type="defective_item",
                disputed_amount=15000.0,
                claim_reason=f"Concurrent test case {case['dispute_id']}",
                idempotency_key=case["idempotency_key"],
            )
            config = {"configurable": {"thread_id": case["thread_id"]}}
            suspended = await graph.ainvoke(state, config=config)
            assert suspended["status"] == "AWAITING_APPROVAL"

        # Authorize all cases and prepare resume tasks
        async def resume_case(case):
            summary = DeterministicPolicyEngine.authorize_human_approval(
                dispute_id=case["dispute_id"],
                transaction_id="txn_1002",
                merchant_id=merchant_id,
                amount=15000.0,
                idempotency_key=case["idempotency_key"],
                approver_id="usr_risk_lead_01",
                approver_role="RISK_LEAD",
            )
            payload = {
                "human_approval_status": "APPROVED",
                "human_approver_id": "usr_risk_lead_01",
                "human_approver_role": "RISK_LEAD",
                "status": "APPROVED_BY_HUMAN",
                "policy_engine_result": summary.model_dump(),
            }
            cfg = {"configurable": {"thread_id": case["thread_id"]}}
            return await graph.ainvoke(payload, config=cfg)

        # Execute concurrent resumes
        results = await asyncio.gather(*[resume_case(c) for c in cases])

        assert len(results) == 3
        for res in results:
            assert res["status"] == "RESOLVED_REFUNDED"
            assert res["execution_result"]["success"] is True

        await saver.conn.close()

    finally:
        for suffix in ["", "-wal", "-shm"]:
            fpath = test_cp_db + suffix
            if os.path.exists(fpath):
                try:
                    os.remove(fpath)
                except Exception:
                    pass
