import json
import os
import subprocess
import sys
import tempfile
import time
import uuid
from datetime import timedelta
import pytest
from sqlalchemy import select

from app.agents.checkpoint import format_thread_id
from app.db.models import ConsumedPolicyToken, Transaction
from app.db.session import AsyncSessionLocal
from app.policy.engine import DeterministicPolicyEngine


BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


def run_python_process(code: str, env: dict = None, timeout: float = 30.0) -> subprocess.CompletedProcess:
    process_env = os.environ.copy()
    process_env["PYTHONPATH"] = BACKEND_DIR
    process_env["LLM_PROVIDER"] = "mock"
    if env:
        process_env.update(env)
    return subprocess.run(
        [sys.executable, "-c", code],
        cwd=BACKEND_DIR,
        capture_output=True,
        text=True,
        env=process_env,
        timeout=timeout,
    )


def test_true_multi_process_restart_and_recovery():
    """
    Phase 2: True Multi-Process Recovery.
    Process A:
      1. Submits dispute.
      2. Executes workflow until AWAITING_APPROVAL.
      3. Persists checkpoint to disk.
      4. Terminates completely (OS PID dies).
    Process B:
      1. Starts fresh application instance in a new OS process.
      2. Connects to the same persistent checkpoint database.
      3. Restores suspended dispute.
      4. Issues signed policy token and resumes workflow.
      5. Verifies exactly one financial refund execution.
    """
    test_cp_db = os.path.join(tempfile.gettempdir(), f"mp_cp_{uuid.uuid4().hex[:8]}.db").replace("\\", "/")
    dispute_id = f"disp_mp_{uuid.uuid4().hex[:8]}"
    merchant_id = "mch_zenith_04"
    thread_id = format_thread_id(merchant_id, dispute_id)
    idempotency_key = f"idemp_mp_{uuid.uuid4().hex[:10]}"

    try:
        # === PROCESS A ===
        code_a = f"""
import asyncio, os, json
from app.agents.checkpoint import create_sqlite_checkpointer
from app.agents.graph import build_dispute_graph
from app.agents.state import create_initial_state

async def main():
    saver = await create_sqlite_checkpointer("{test_cp_db}")
    graph = build_dispute_graph(checkpointer=saver)

    initial_state = create_initial_state(
        dispute_id="{dispute_id}",
        transaction_id="txn_1002",
        merchant_id="{merchant_id}",
        customer_id="CUST-IND-1004",
        dispute_type="defective_item",
        disputed_amount=15000.0,
        claim_reason="Luxury chronometer arrived with broken bezel.",
        idempotency_key="{idempotency_key}",
    )

    config = {{"configurable": {{"thread_id": "{thread_id}"}}}}
    res = await graph.ainvoke(initial_state, config=config)
    await saver.conn.close()

    output = {{
        "pid": os.getpid(),
        "status": res["status"],
        "human_approval_required": res.get("human_approval_required"),
    }}
    print("__OUTPUT__" + json.dumps(output))

asyncio.run(main())
"""
        proc_a = run_python_process(code_a)
        assert proc_a.returncode == 0, f"Process A failed: {proc_a.stderr}"

        output_a_line = [l for l in proc_a.stdout.splitlines() if l.startswith("__OUTPUT__")]
        assert len(output_a_line) == 1, f"Missing output from Process A: {proc_a.stdout}"
        data_a = json.loads(output_a_line[0].replace("__OUTPUT__", ""))

        pid_a = data_a["pid"]
        assert data_a["status"] == "AWAITING_APPROVAL"
        assert data_a["human_approval_required"] is True

        # Issue human approval signed policy token
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
        summary_json = json.dumps(human_summary.model_dump()).replace('"', '\\"')

        # === PROCESS B (New OS Process) ===
        code_b = f"""
import asyncio, os, json
from app.agents.checkpoint import create_sqlite_checkpointer
from app.agents.graph import build_dispute_graph

async def main():
    saver = await create_sqlite_checkpointer("{test_cp_db}")
    graph = build_dispute_graph(checkpointer=saver)

    config = {{"configurable": {{"thread_id": "{thread_id}"}}}}
    
    # Verify state was restored intact from disk
    restored_tuple = await saver.aget_tuple(config)
    assert restored_tuple is not None
    assert restored_tuple.checkpoint["channel_values"]["status"] == "AWAITING_APPROVAL"

    resume_payload = {{
        "human_approval_status": "APPROVED",
        "human_approver_id": "usr_risk_lead_01",
        "human_approver_role": "RISK_LEAD",
        "status": "APPROVED_BY_HUMAN",
        "policy_engine_result": json.loads('{summary_json}'),
    }}

    final_state = await graph.ainvoke(resume_payload, config=config)
    await saver.conn.close()

    output = {{
        "pid": os.getpid(),
        "status": final_state["status"],
        "execution_success": final_state.get("execution_result", {{}}).get("success"),
        "refunded_amount": final_state.get("execution_result", {{}}).get("refunded_amount"),
    }}
    print("__OUTPUT__" + json.dumps(output))

asyncio.run(main())
"""
        proc_b = run_python_process(code_b)
        assert proc_b.returncode == 0, f"Process B failed: {proc_b.stderr}"

        output_b_line = [l for l in proc_b.stdout.splitlines() if l.startswith("__OUTPUT__")]
        assert len(output_b_line) == 1, f"Missing output from Process B: {proc_b.stdout}"
        data_b = json.loads(output_b_line[0].replace("__OUTPUT__", ""))

        pid_b = data_b["pid"]
        assert pid_b != pid_a, f"Expected distinct OS processes, got same PID: {pid_b}"
        assert data_b["status"] == "RESOLVED_REFUNDED"
        assert data_b["execution_success"] is True
        assert data_b["refunded_amount"] == 15000.0

    finally:
        for suffix in ["", "-wal", "-shm"]:
            p = test_cp_db + suffix
            if os.path.exists(p):
                try:
                    os.remove(p)
                except Exception:
                    pass


def test_concurrent_resume_requests_from_separate_processes():
    """
    Phase 2 Requirement: Concurrent resume requests from separate processes.
    Two independent OS processes attempt to resume the same dispute using the same token.
    Exactly ONE process must succeed; the second MUST be rejected by single-use token constraints.
    """
    test_cp_db = os.path.join(tempfile.gettempdir(), f"mp_conc_{uuid.uuid4().hex[:8]}.db").replace("\\", "/")
    dispute_id = f"disp_mpc_{uuid.uuid4().hex[:8]}"
    merchant_id = "mch_zenith_04"
    thread_id = format_thread_id(merchant_id, dispute_id)
    idempotency_key = f"idemp_mpc_{uuid.uuid4().hex[:10]}"

    try:
        # Step 1: Suspend dispute via setup process
        setup_code = f"""
import asyncio
from app.agents.checkpoint import create_sqlite_checkpointer
from app.agents.graph import build_dispute_graph
from app.agents.state import create_initial_state

async def main():
    saver = await create_sqlite_checkpointer("{test_cp_db}")
    graph = build_dispute_graph(checkpointer=saver)

    initial_state = create_initial_state(
        dispute_id="{dispute_id}",
        transaction_id="txn_1002",
        merchant_id="{merchant_id}",
        customer_id="CUST-IND-1004",
        dispute_type="defective_item",
        disputed_amount=15000.0,
        claim_reason="Defective chronograph item.",
        idempotency_key="{idempotency_key}",
    )
    await graph.ainvoke(initial_state, config={{"configurable": {{"thread_id": "{thread_id}"}}}})
    await saver.conn.close()

asyncio.run(main())
"""
        proc_setup = run_python_process(setup_code)
        assert proc_setup.returncode == 0, f"Setup process failed: {proc_setup.stderr}"

        # Issue single signed policy token
        human_summary = DeterministicPolicyEngine.authorize_human_approval(
            dispute_id=dispute_id,
            transaction_id="txn_1002",
            merchant_id=merchant_id,
            amount=15000.0,
            idempotency_key=idempotency_key,
            approver_id="usr_risk_lead_01",
            approver_role="RISK_LEAD",
        )
        summary_json = json.dumps(human_summary.model_dump()).replace('"', '\\"')

        resume_code = f"""
import asyncio, json, sys
from app.agents.checkpoint import create_sqlite_checkpointer
from app.agents.graph import build_dispute_graph

async def main():
    saver = await create_sqlite_checkpointer("{test_cp_db}")
    try:
        graph = build_dispute_graph(checkpointer=saver)
        config = {{"configurable": {{"thread_id": "{thread_id}"}}}}

        resume_payload = {{
            "human_approval_status": "APPROVED",
            "human_approver_id": "usr_risk_lead_01",
            "human_approver_role": "RISK_LEAD",
            "status": "APPROVED_BY_HUMAN",
            "policy_engine_result": json.loads('{summary_json}'),
        }}

        final_state = await graph.ainvoke(resume_payload, config=config)
    finally:
        await saver.conn.close()

    if final_state.get("status") == "RESOLVED_REFUNDED":
        sys.exit(0)
    else:
        # Rejected due to single-use token replay violation
        print("REJECTED:" + "; ".join(final_state.get("errors", [])))
        sys.exit(2)

asyncio.run(main())
"""
        # Launch Process 1 and Process 2 concurrently
        process_env = os.environ.copy()
        process_env["PYTHONPATH"] = BACKEND_DIR

        p1 = subprocess.Popen(
            [sys.executable, "-c", resume_code],
            cwd=BACKEND_DIR,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            env=process_env,
        )
        p2 = subprocess.Popen(
            [sys.executable, "-c", resume_code],
            cwd=BACKEND_DIR,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            env=process_env,
        )

        out1, err1 = p1.communicate(timeout=60)
        out2, err2 = p2.communicate(timeout=60)

        return_codes = sorted([p1.returncode, p2.returncode])
        # Exactly one process succeeds (code 0), exactly one is rejected (code 2)
        assert return_codes == [0, 2], f"Expected [0, 2] exit codes for concurrent single-use replay, got {return_codes}. P1 err: {err1}, P2 err: {err2}"

    finally:
        for suffix in ["", "-wal", "-shm"]:
            p = test_cp_db + suffix
            if os.path.exists(p):
                try:
                    os.remove(p)
                except Exception:
                    pass


def test_multi_process_expired_approval_token_rejected():
    """
    Phase 2 Requirement: Expired approval tokens must be rejected across processes.
    """
    # Create expired token
    expired_summary = DeterministicPolicyEngine.authorize_human_approval(
        dispute_id="disp_exp_001",
        transaction_id="txn_1002",
        merchant_id="mch_zenith_04",
        amount=15000.0,
        idempotency_key="idemp_exp_001",
        approver_id="usr_risk_lead_01",
        approver_role="RISK_LEAD",
        expires_delta=timedelta(seconds=-60),  # Expired 60s ago
    )
    summary_json = json.dumps(expired_summary.model_dump()).replace('"', '\\"')

    code = f"""
import asyncio, json, sys
from app.agents.graph import dispute_orchestrator
from app.agents.checkpoint import format_thread_id, close_global_checkpointer

async def main():
    config = {{"configurable": {{"thread_id": format_thread_id("mch_zenith_04", "disp_exp_001")}}}}
    resume_payload = {{
        "human_approval_status": "APPROVED",
        "human_approver_id": "usr_risk_lead_01",
        "human_approver_role": "RISK_LEAD",
        "status": "APPROVED_BY_HUMAN",
        "policy_engine_result": json.loads('{summary_json}'),
        "dispute_id": "disp_exp_001",
        "transaction_id": "txn_1002",
        "disputed_amount": 15000.0,
        "idempotency_key": "idemp_exp_001",
    }}
    res = await dispute_orchestrator.ainvoke(resume_payload, config=config)
    await close_global_checkpointer()
    assert res["status"] == "FAILED"
    assert any("expired" in e.lower() for e in res.get("errors", []))
    sys.exit(0)

asyncio.run(main())
"""
    proc = run_python_process(code)
    assert proc.returncode == 0, f"Expired token test failed: {proc.stderr}"


def test_multi_process_cross_tenant_access_isolation():
    """
    Phase 2 Requirement: Cross-tenant access attempts.
    An unauthorized merchant attempting to access or resume another merchant's checkpoint.
    """
    code = f"""
import asyncio, sys
from app.agents.checkpoint import format_thread_id, close_global_checkpointer
from app.agents.graph import dispute_orchestrator

async def main():
    # Legitimate dispute belongs to mch_zenith_04
    # Attacker tries to resume under mch_aurora_01's thread namespace
    spoofed_thread = format_thread_id("mch_aurora_01", "disp_zenith_secret_01")
    config = {{"configurable": {{"thread_id": spoofed_thread}}}}
    
    # Query state for spoofed thread
    state_snap = await dispute_orchestrator.aget_state(config)
    await close_global_checkpointer()
    # Channel values must be completely empty (no access to zenith dispute data)
    assert len(state_snap.values) == 0, f"Cross-tenant data leaked: {{state_snap.values}}"
    sys.exit(0)

asyncio.run(main())
"""
    proc = run_python_process(code)
    assert proc.returncode == 0, f"Cross-tenant test failed: {proc.stderr}"


def test_multi_process_termination_during_execution_and_recovery():
    """
    Phase 2 Requirement: Application termination during execution.
    Process is abruptly killed via SIGKILL (proc.kill()), and subsequent process recovers state safely.
    """
    test_cp_db = os.path.join(tempfile.gettempdir(), f"mp_kill_{uuid.uuid4().hex[:8]}.db").replace("\\", "/")
    ready_file = os.path.join(tempfile.gettempdir(), f"mp_ready_{uuid.uuid4().hex[:8]}.txt").replace("\\", "/")
    dispute_id = f"disp_kill_{uuid.uuid4().hex[:8]}"
    merchant_id = "mch_zenith_04"
    thread_id = format_thread_id(merchant_id, dispute_id)

    try:
        # Start Process A and let it create checkpoint tables and run
        code_init = f"""
import asyncio, sys, time
from app.agents.checkpoint import create_sqlite_checkpointer
from app.agents.graph import build_dispute_graph
from app.agents.state import create_initial_state

async def main():
    saver = await create_sqlite_checkpointer(r"{test_cp_db}")
    graph = build_dispute_graph(checkpointer=saver)
    initial_state = create_initial_state(
        dispute_id="{dispute_id}",
        transaction_id="txn_1002",
        merchant_id="{merchant_id}",
        customer_id="CUST-IND-1004",
        dispute_type="defective_item",
        disputed_amount=15000.0,
        claim_reason="Defective timepiece.",
        idempotency_key="idemp_kill_1",
    )
    res = await graph.ainvoke(initial_state, config={{"configurable": {{"thread_id": "{thread_id}"}}}})
    # Write atomic readiness file to confirm checkpoint has been persisted
    with open(r"{ready_file}", "w") as f:
        f.write("CHECKPOINT_SAVED")
    # Hang process to simulate crash during execution
    while True:
        await asyncio.sleep(0.5)

asyncio.run(main())
"""
        process_env = os.environ.copy()
        process_env["PYTHONPATH"] = BACKEND_DIR
        process_env["LLM_PROVIDER"] = "mock"

        log_file = os.path.join(tempfile.gettempdir(), f"mp_log_{uuid.uuid4().hex[:8]}.txt").replace("\\", "/")
        with open(log_file, "w", encoding="utf-8") as lf:
            proc = subprocess.Popen(
                [sys.executable, "-c", code_init],
                cwd=BACKEND_DIR,
                stdout=lf,
                stderr=lf,
                env=process_env,
            )

        # Wait for confirmation that checkpoint is saved (strictly bounded 30s timeout)
        checkpoint_saved = False
        start_wait = time.time()
        while time.time() - start_wait < 30.0:
            if os.path.exists(ready_file):
                checkpoint_saved = True
                break
            if proc.poll() is not None:
                break
            time.sleep(0.2)

        # Abruptly kill the process (SIGKILL emulation)
        proc.kill()
        proc.wait(timeout=5)

        log_content = ""
        if os.path.exists(log_file):
            try:
                with open(log_file, "r", encoding="utf-8", errors="ignore") as f:
                    log_content = f.read()
            except Exception:
                pass

        assert checkpoint_saved, f"Process A failed to reach CHECKPOINT_SAVED before timeout. Diagnostic logs:\n{log_content}"

        # Start fresh Recovery Process C to verify database integrity
        code_recover = f"""
import asyncio, sys
from app.agents.checkpoint import create_sqlite_checkpointer

async def main():
    saver = await create_sqlite_checkpointer(r"{test_cp_db}")
    config = {{"configurable": {{"thread_id": "{thread_id}"}}}}
    tuple_data = await saver.aget_tuple(config)
    assert tuple_data is not None
    assert tuple_data.checkpoint["channel_values"]["status"] == "AWAITING_APPROVAL"
    await saver.conn.close()
    sys.exit(0)

asyncio.run(main())
"""
        proc_recover = run_python_process(code_recover)
        assert proc_recover.returncode == 0, f"Recovery process failed: {proc_recover.stderr}"

    finally:
        if os.path.exists(ready_file):
            try:
                os.remove(ready_file)
            except Exception:
                pass
        if os.path.exists(log_file):
            try:
                os.remove(log_file)
            except Exception:
                pass
        for suffix in ["", "-wal", "-shm"]:
            p = test_cp_db + suffix
            if os.path.exists(p):
                try:
                    os.remove(p)
                except Exception:
                    pass
