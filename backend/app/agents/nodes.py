import hashlib
import json
from datetime import datetime, timezone
from typing import Any, Dict, List
from sqlalchemy import select

from app.core.config import settings
from app.db.audit_service import AuditService
from app.db.session import AsyncSessionLocal
from app.db.models import Account, ApprovalRequest, Dispute, Evidence, Merchant, Transaction
from app.mcp.schemas import MCPCallerIdentity
from app.mcp.server import FinancialMCPServer
from app.policy.engine import DeterministicPolicyEngine
from app.policy.models import PolicyContext, PolicyVerdict
from app.security.pii_scrubber import PIIScrubber
from app.security.prompt_injection import PromptInjectionShield
from app.agents.state import DisputeState


async def intake_node(state: DisputeState) -> DisputeState:
    """
    Dispute Intake Agent: Validates incoming claim, screens for adversarial prompt injection,
    redacts customer PII, and validates dispute metadata.
    """
    now = datetime.now(timezone.utc).isoformat()
    raw_reason = state.get("claim_reason", "")

    # 1. Prompt Injection Defense
    injection_check = PromptInjectionShield.scan_and_sanitize(raw_reason)
    if injection_check.threat_detected:
        state["errors"].append(f"Security Alert: Adversarial prompt injection detected ({injection_check.threat_type})")
        state["timeline"].append({
            "stage": "INTAKE_SECURITY_ALERT",
            "timestamp": now,
            "agent": "security_guard",
            "message": f"Blocked prompt injection pattern: {injection_check.threat_type}",
        })
        state["status"] = "FAILED"
        return state

    # 2. PII Sanitization
    sanitized_reason = PIIScrubber.scrub_text(injection_check.sanitized_text)

    # 3. Dispute Type & Requirements Validation
    valid_types = {
        "unauthorized_transaction": ["INVOICE", "COMMUNICATION_LOG"],
        "goods_not_received": ["DELIVERY_RECEIPT", "TRACKING_PROOF"],
        "duplicate_charge": ["INVOICE"],
        "subscription_cancelled": ["COMMUNICATION_LOG"],
        "fraudulent_merchant": ["INVOICE", "COMMUNICATION_LOG"],
        "defective_item": ["INVOICE", "DELIVERY_RECEIPT"],
    }

    dispute_type = state.get("dispute_type", "")
    validation_errors = []
    if dispute_type not in valid_types:
        validation_errors.append(f"Invalid dispute type '{dispute_type}'. Must be one of: {list(valid_types.keys())}")

    if state.get("disputed_amount", 0) <= 0:
        validation_errors.append("Disputed amount must be strictly greater than zero")

    state["claim_reason"] = sanitized_reason
    state["validation_errors"] = validation_errors
    state["intake_findings"] = {
        "dispute_type": dispute_type,
        "required_evidence_types": valid_types.get(dispute_type, []),
        "sanitized_claim": sanitized_reason,
        "is_valid": len(validation_errors) == 0,
    }
    state["current_stage"] = "INVESTIGATION" if len(validation_errors) == 0 else "FAILED"
    state["status"] = "INVESTIGATING" if len(validation_errors) == 0 else "FAILED"

    state["timeline"].append({
        "stage": "INTAKE_COMPLETED",
        "timestamp": now,
        "agent": "dispute_intake_agent",
        "message": f"Intake verified. Classified as '{dispute_type}' with {len(valid_types.get(dispute_type, []))} required evidence types.",
    })
    return state


async def investigation_node(state: DisputeState) -> DisputeState:
    """
    Transaction Investigation Agent: Queries transaction ledger, merchant risk profiles,
    and customer chargeback velocity through the custom MCP gateway.
    """
    now = datetime.now(timezone.utc).isoformat()
    caller = MCPCallerIdentity(
        actor_id="agent_investigation",
        actor_role="AGENT",
        trace_id=state.get("trace_id", "trace_investigation"),
    )

    async with AsyncSessionLocal() as session:
        # 1. Fetch transaction details via MCP
        tx_res = await FinancialMCPServer.call_tool(
            session=session,
            tool_name="get_transaction_details",
            arguments={"transaction_id": state["transaction_id"]},
            caller=caller,
        )

        if tx_res["isError"]:
            err_msg = json.loads(tx_res["content"][0]["text"])["error"]
            state["errors"].append(f"Investigation error: {err_msg}")
            state["status"] = "FAILED"
            return state

        tx_data = json.loads(tx_res["content"][0]["text"])

        # 2. Fetch merchant profile via MCP
        mch_res = await FinancialMCPServer.call_tool(
            session=session,
            tool_name="get_merchant_profile",
            arguments={"merchant_id": state["merchant_id"]},
            caller=caller,
        )
        mch_data = json.loads(mch_res["content"][0]["text"]) if not mch_res["isError"] else {}

        # 3. Query customer account context
        acc_query = select(Account).where(Account.customer_id == state["customer_id"])
        acc = (await session.execute(acc_query)).scalar_one_or_none()

    investigation_summary = {
        "transaction_amount": tx_data.get("amount"),
        "transaction_status": tx_data.get("status"),
        "payment_method": tx_data.get("payment_method"),
        "refunded_amount": tx_data.get("refunded_amount", 0.0),
        "eligible_refund_balance": tx_data.get("eligible_refund_balance"),
        "merchant_name": mch_data.get("name"),
        "merchant_risk_score": mch_data.get("risk_score", 0.1),
        "merchant_dispute_rate": mch_data.get("dispute_rate", 0.005),
        "merchant_status": mch_data.get("status", "ACTIVE"),
        "customer_risk_tier": acc.risk_tier if acc else "MEDIUM",
        "customer_prior_chargebacks": acc.total_chargebacks if acc else 0,
        "customer_status": acc.status if acc else "ACTIVE",
    }

    state["investigation_findings"] = investigation_summary
    state["current_stage"] = "EVIDENCE_ANALYSIS"
    state["status"] = "EVALUATING"

    state["timeline"].append({
        "stage": "INVESTIGATION_COMPLETED",
        "timestamp": now,
        "agent": "transaction_investigation_agent",
        "message": f"Transaction verified (amount: ₹{tx_data.get('amount')}, remaining balance: ₹{tx_data.get('eligible_refund_balance')}). Customer prior chargebacks: {investigation_summary['customer_prior_chargebacks']}.",
    })
    return state


async def evidence_analysis_node(state: DisputeState) -> DisputeState:
    """
    Evidence Analysis Agent: Analyzes uploaded documents, cross-checks dates, and screens for
    indirect prompt injections embedded in evidence text.
    """
    now = datetime.now(timezone.utc).isoformat()
    caller = MCPCallerIdentity(
        actor_id="agent_evidence",
        actor_role="AGENT",
        trace_id=state.get("trace_id", "trace_evidence"),
    )

    async with AsyncSessionLocal() as session:
        ev_res = await FinancialMCPServer.call_tool(
            session=session,
            tool_name="retrieve_dispute_evidence",
            arguments={"dispute_id": state["dispute_id"]},
            caller=caller,
        )

    ev_data = json.loads(ev_res["content"][0]["text"]) if not ev_res["isError"] else {"evidence_items": [], "average_authenticity_score": 1.0}
    evidence_items = ev_data.get("evidence_items", [])

    # Indirect prompt injection check in extracted text
    indirect_threat_found = False
    for item in evidence_items:
        text = item.get("extracted_text", "")
        if text:
            check = PromptInjectionShield.scan_and_sanitize(text, is_untrusted_evidence=True)
            if check.threat_detected:
                indirect_threat_found = True
                state["errors"].append(f"Security Alert: Indirect prompt injection detected in evidence file '{item.get('filename')}': {check.threat_type}")
                state["timeline"].append({
                    "stage": "EVIDENCE_SECURITY_ALERT",
                    "timestamp": now,
                    "agent": "security_guard",
                    "message": f"Blocked indirect prompt injection in evidence: {check.threat_type}",
                })

    avg_score = ev_data.get("average_authenticity_score", 1.0)
    if indirect_threat_found:
        avg_score = 0.1  # Severe penalty for adversarial evidence

    state["evidence_findings"] = {
        "item_count": len(evidence_items),
        "average_authenticity_score": avg_score,
        "contains_adversarial_payload": indirect_threat_found,
    }
    state["current_stage"] = "POLICY_ADVISORY"
    state["status"] = "POLICY_EVALUATION"

    state["timeline"].append({
        "stage": "EVIDENCE_EVALUATED",
        "timestamp": now,
        "agent": "evidence_analysis_agent",
        "message": f"Evaluated {len(evidence_items)} evidence files. Average authenticity score: {avg_score:.2f}.",
    })
    return state


async def policy_advisory_node(state: DisputeState) -> DisputeState:
    """
    Policy Agent: Formulates an ADVISORY recommendation citing financial policies.
    Explicit Boundary: Output is strictly advisory and treated as untrusted input by Policy Engine.
    """
    now = datetime.now(timezone.utc).isoformat()
    inv = state.get("investigation_findings", {})
    ev = state.get("evidence_findings", {})
    amount = state.get("disputed_amount", 0.0)

    # Advisory reasoning
    citations = []
    if amount > settings.POLICY_MAX_AUTO_REFUND_AMOUNT:
        citations.append("RULE_MAX_AUTO_REFUND (Dispute exceeds ₹10,000 threshold)")
    if inv.get("customer_prior_chargebacks", 0) >= settings.POLICY_CUSTOMER_CHARGEBACK_LIMIT:
        citations.append("RULE_CUSTOMER_CHARGEBACK_CAP (Customer has elevated chargebacks)")
    if ev.get("average_authenticity_score", 1.0) < 0.60:
        citations.append("RULE_EVIDENCE_INTEGRITY (Evidence authenticity is low)")

    if not citations and amount <= settings.POLICY_MAX_AUTO_REFUND_AMOUNT:
        recommended_action = "APPROVE_REFUND"
        rationale = "Claim meets low-risk thresholds and complies with automated dispute policy."
    elif any("RULE_MAX_AUTO_REFUND" in c or "CHARGEBACK_CAP" in c for c in citations):
        recommended_action = "ESCALATE_TO_HUMAN"
        rationale = f"Risk criteria triggered: {', '.join(citations)}"
    else:
        recommended_action = "REJECT_DISPUTE"
        rationale = f"Dispute failed evidentiary checks: {', '.join(citations)}"

    state["policy_advisory"] = {
        "recommended_action": recommended_action,
        "cited_rules": citations,
        "rationale": rationale,
        "is_advisory_only": True,
    }
    state["current_stage"] = "POLICY_ENGINE"

    state["timeline"].append({
        "stage": "POLICY_ADVISORY_PRODUCED",
        "timestamp": now,
        "agent": "policy_advisor_agent",
        "message": f"AI Recommendation: {recommended_action}. Cited policies: {len(citations)} rules.",
    })
    return state


async def policy_engine_node(state: DisputeState) -> DisputeState:
    """
    Deterministic Policy Engine Node: Pure Python evaluation with zero LLM dependence.
    Enforces spend limits, merchant standing, duplicate claims, and generates signed PolicyToken.
    """
    now = datetime.now(timezone.utc).isoformat()

    # If already approved by human risk lead, preserve approval and route forward
    if state.get("human_approval_status") == "APPROVED":
        state["status"] = "POLICY_APPROVED"
        state["current_stage"] = "SUPERVISOR"
        state["timeline"].append({
            "stage": "HUMAN_APPROVAL_ACKNOWLEDGED",
            "timestamp": now,
            "agent": "supervisor_agent",
            "message": f"Human risk lead approval verified for {state.get('human_approver_role')} ({state.get('human_approver_id')}). Proceeding to resolution.",
        })
        return state

    inv = state.get("investigation_findings", {})
    ev = state.get("evidence_findings", {})

    # Construct strict policy context
    ctx = PolicyContext(
        dispute_id=state["dispute_id"],
        transaction_id=state["transaction_id"],
        merchant_id=state["merchant_id"],
        customer_id=state["customer_id"],
        disputed_amount=state["disputed_amount"],
        transaction_amount=inv.get("transaction_amount", state["disputed_amount"]),
        cumulative_refunded_amount=inv.get("refunded_amount", 0.0),
        transaction_status=inv.get("transaction_status", "SETTLED"),
        transaction_timestamp=datetime.now(timezone.utc),  # or extracted from DB
        merchant_risk_score=inv.get("merchant_risk_score", 0.1),
        merchant_dispute_rate=inv.get("merchant_dispute_rate", 0.005),
        merchant_status=inv.get("merchant_status", "ACTIVE"),
        customer_risk_tier=inv.get("customer_risk_tier", "LOW"),
        customer_prior_chargebacks=inv.get("customer_prior_chargebacks", 0),
        customer_status=inv.get("customer_status", "ACTIVE"),
        idempotency_key=state["idempotency_key"],
        evidence_authenticity_score=ev.get("average_authenticity_score", 1.0),
    )

    summary = DeterministicPolicyEngine.evaluate(ctx)

    state["policy_engine_result"] = summary.model_dump()
    state["human_approval_required"] = summary.overall_verdict == PolicyVerdict.REQUIRES_HUMAN_APPROVAL

    if summary.overall_verdict == PolicyVerdict.REQUIRES_HUMAN_APPROVAL:
        state["human_approval_status"] = "PENDING"
        state["status"] = "AWAITING_APPROVAL"
    elif summary.overall_verdict == PolicyVerdict.AUTO_APPROVED:
        state["status"] = "POLICY_APPROVED"
    else:
        state["status"] = "POLICY_REJECTED"

    state["current_stage"] = "SUPERVISOR"

    state["timeline"].append({
        "stage": "POLICY_EVALUATED",
        "timestamp": now,
        "agent": "deterministic_policy_engine",
        "message": f"Deterministic policy verdict: {summary.overall_verdict.value}. Execution permitted: {summary.execution_permitted}.",
    })
    return state


async def supervisor_node(state: DisputeState) -> DisputeState:
    """
    Supervisor Agent: Manages bounded graph execution ($N \\le 6$), checkpointing,
    and routing between automated execution and human approval queues.
    """
    now = datetime.now(timezone.utc).isoformat()
    state["iteration_count"] = state.get("iteration_count", 0) + 1

    # Loop guard
    if state["iteration_count"] > settings.AGENT_MAX_ITERATIONS:
        state["status"] = "FAILED"
        state["errors"].append(f"Supervisor halted execution: Iteration count ({state['iteration_count']}) exceeded limit ({settings.AGENT_MAX_ITERATIONS})")
        state["current_stage"] = "COMPLETED"
        return state

    # If human approval has already been granted, route straight to resolution
    if state.get("human_approval_status") == "APPROVED":
        state["current_stage"] = "RESOLUTION"
        state["status"] = "RESOLVING"
        return state

    # If human approval is required and currently pending, persist approval request in DB
    if state.get("human_approval_required") and state.get("human_approval_status") == "PENDING":
        async with AsyncSessionLocal() as session:
            # Check if approval request already created
            appr_q = select(ApprovalRequest).where(ApprovalRequest.dispute_id == state["dispute_id"])
            existing = (await session.execute(appr_q)).scalar_one_or_none()
            if not existing:
                appr_req = ApprovalRequest(
                    dispute_id=state["dispute_id"],
                    required_role="RISK_LEAD",
                    amount=state["disputed_amount"],
                    status="PENDING",
                    requester_agent="supervisor_agent",
                )
                session.add(appr_req)
                await session.commit()

        state["timeline"].append({
            "stage": "HUMAN_APPROVAL_SUSPENDED",
            "timestamp": now,
            "agent": "supervisor_agent",
            "message": "Workflow suspended at checkpoint. Escalated to Human Risk Lead queue.",
        })
        state["current_stage"] = "AWAITING_APPROVAL"
        return state

    state["current_stage"] = "RESOLUTION"
    return state


async def resolution_node(state: DisputeState) -> DisputeState:
    """
    Resolution Agent: Executes authorized financial operations via the MCP server
    using signed PolicyTokens, or finalizes rejection.
    """
    now = datetime.now(timezone.utc).isoformat()
    policy_res = state.get("policy_engine_result", {})
    verdict = policy_res.get("overall_verdict")
    token = policy_res.get("policy_token")

    caller = MCPCallerIdentity(
        actor_id="agent_resolution",
        actor_role="AGENT",
        trace_id=state.get("trace_id", "trace_resolution"),
    )

    # 1. Execution path: Auto-Approved or Human-Approved
    if verdict == PolicyVerdict.AUTO_APPROVED.value or state.get("human_approval_status") == "APPROVED":
        if not token:
            state["errors"].append("Resolution error: Missing cryptographically signed PolicyToken for execution")
            state["status"] = "FAILED"
            return state

        async with AsyncSessionLocal() as session:
            mcp_res = await FinancialMCPServer.call_tool(
                session=session,
                tool_name="create_refund_request",
                arguments={
                    "dispute_id": state["dispute_id"],
                    "transaction_id": state["transaction_id"],
                    "amount": state["disputed_amount"],
                    "idempotency_key": state["idempotency_key"],
                    "policy_token": token,
                },
                caller=caller,
            )

        if mcp_res["isError"]:
            err_data = json.loads(mcp_res["content"][0]["text"])
            state["errors"].append(f"Financial execution failed: {err_data.get('error')}")
            state["status"] = "FAILED"
        else:
            exec_data = json.loads(mcp_res["content"][0]["text"])
            state["execution_result"] = exec_data
            state["status"] = "RESOLVED_REFUNDED"
            state["timeline"].append({
                "stage": "FINANCIAL_EXECUTION_COMPLETED",
                "timestamp": now,
                "agent": "resolution_agent",
                "message": f"Successfully executed refund of ₹{state['disputed_amount']:.2f} via MCP Gateway.",
            })

    # 2. Rejection path
    elif verdict == PolicyVerdict.POLICY_REJECTED.value or state.get("human_approval_status") == "REJECTED":
        async with AsyncSessionLocal() as session:
            await FinancialMCPServer.call_tool(
                session=session,
                tool_name="submit_dispute_resolution",
                arguments={
                    "dispute_id": state["dispute_id"],
                    "resolution": "DISPUTE_REJECTED",
                    "reason": "; ".join(policy_res.get("reasons", ["Policy rejection"])),
                },
                caller=caller,
            )
        state["status"] = "RESOLVED_REJECTED"
        state["timeline"].append({
            "stage": "DISPUTE_REJECTED",
            "timestamp": now,
            "agent": "resolution_agent",
            "message": f"Dispute rejected pursuant to policy engine verdict: {'; '.join(policy_res.get('reasons', []))}",
        })

    state["current_stage"] = "COMPLETED"
    return state
