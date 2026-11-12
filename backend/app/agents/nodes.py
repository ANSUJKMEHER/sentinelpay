import hashlib
import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
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
from app.agents.llm_provider import get_llm_provider, LLMProviderUnavailableError


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
        "transaction_timestamp": tx_data.get("created_at"),
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
    if "warnings" not in state:
        state["warnings"] = []

    for item in evidence_items:
        text = item.get("extracted_text", "")
        if text:
            check = PromptInjectionShield.scan_and_sanitize(text, is_untrusted_evidence=True)
            item["is_untrusted_evidence"] = True
            item["sanitized_text"] = check.sanitized_text
            if check.warnings:
                state["warnings"].extend(check.warnings)
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
        "is_untrusted_evidence": True,
        "warnings": state.get("warnings", []),
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
    Uses configurable LLM provider (OpenAI-compatible or deterministic MockLLMProvider).
    """
    now = datetime.now(timezone.utc).isoformat()
    llm_provider = get_llm_provider()
    
    try:
        advisory_output = await llm_provider.generate_advisory(state)
    except LLMProviderUnavailableError as err:
        state.setdefault("errors", []).append(f"AI Policy Advisor Error: {str(err)}")
        state["status"] = "FAILED"
        state["current_stage"] = "SUPERVISOR"
        state.setdefault("timeline", []).append({
            "stage": "POLICY_ADVISORY_FAILED",
            "timestamp": now,
            "agent": "policy_advisor_agent",
            "message": f"LLM provider failed: {str(err)}",
        })
        return state

    rec_val = advisory_output.recommended_action.value if hasattr(advisory_output.recommended_action, "value") else str(advisory_output.recommended_action)

    state["policy_advisory"] = {
        "recommended_action": rec_val,
        "confidence_score": advisory_output.confidence_score,
        "cited_rules": advisory_output.cited_rules,
        "rationale": advisory_output.rationale,
        "risk_summary": advisory_output.risk_summary,
        "provider_used": advisory_output.provider_used,
        "fallback_triggered": advisory_output.fallback_triggered,
        "error_reason": advisory_output.error_reason,
        "is_advisory_only": True,
    }

    if advisory_output.fallback_triggered:
        state.setdefault("warnings", []).append(
            f"Observability Alert: Primary LLM provider failed ({advisory_output.error_reason}). Explicit fallback engaged."
        )
        state.setdefault("timeline", []).append({
            "stage": "POLICY_ADVISORY_FALLBACK_ENGAGED",
            "timestamp": now,
            "agent": "policy_advisor_agent",
            "message": f"Fell back to deterministic mock advisor: {advisory_output.error_reason}",
        })

    state["current_stage"] = "POLICY_ENGINE"

    state.setdefault("timeline", []).append({
        "stage": "POLICY_ADVISORY_PRODUCED",
        "timestamp": now,
        "agent": "policy_advisor_agent",
        "message": f"AI Recommendation: {rec_val} (Confidence: {advisory_output.confidence_score:.2f}, Provider: {advisory_output.provider_used}). Cited policies: {len(advisory_output.cited_rules)} rules.",
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

    # Extract and normalize authoritative transaction timestamp
    raw_tx_time = inv.get("transaction_timestamp")
    tx_timestamp: Optional[datetime] = None
    if raw_tx_time:
        if isinstance(raw_tx_time, datetime):
            tx_timestamp = raw_tx_time if raw_tx_time.tzinfo else raw_tx_time.replace(tzinfo=timezone.utc)
        else:
            try:
                parsed_dt = datetime.fromisoformat(str(raw_tx_time))
                tx_timestamp = parsed_dt if parsed_dt.tzinfo else parsed_dt.replace(tzinfo=timezone.utc)
            except Exception:
                tx_timestamp = None

    if tx_timestamp is None:
        state["errors"].append("Policy Error: Missing or unparseable authoritative transaction timestamp. Automated evaluation halted.")
        state["status"] = "POLICY_REJECTED"
        state["current_stage"] = "SUPERVISOR"
        state["policy_engine_result"] = {
            "dispute_id": state["dispute_id"],
            "overall_verdict": PolicyVerdict.POLICY_REJECTED.value,
            "reasons": ["REJECTED: Missing or unparseable authoritative transaction timestamp"],
            "evaluations": [],
            "execution_permitted": False,
            "policy_token": None,
        }
        state["timeline"].append({
            "stage": "POLICY_EVALUATION_FAILED",
            "timestamp": now,
            "agent": "deterministic_policy_engine",
            "message": "Deterministic policy rejected: Missing or invalid transaction timestamp.",
        })
        return state

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
        transaction_timestamp=tx_timestamp,
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
            try:
                # Check if approval request already created
                appr_q = select(ApprovalRequest).where(ApprovalRequest.dispute_id == state["dispute_id"])
                existing = (await session.execute(appr_q)).scalar_one_or_none()
                if not existing:
                    # Guarantee parent dispute row exists for foreign key constraint compliance
                    disp_q = select(Dispute).where(Dispute.id == state["dispute_id"])
                    disp = (await session.execute(disp_q)).scalar_one_or_none()
                    if not disp:
                        new_disp = Dispute(
                            id=state["dispute_id"],
                            transaction_id=state["transaction_id"],
                            merchant_id=state["merchant_id"],
                            dispute_type=state.get("dispute_type", "unauthorized_transaction"),
                            disputed_amount=state["disputed_amount"],
                            status="AWAITING_APPROVAL",
                            current_stage="AWAITING_APPROVAL",
                        )
                        session.add(new_disp)
                        await session.flush()

                    appr_req = ApprovalRequest(
                        dispute_id=state["dispute_id"],
                        required_role="RISK_LEAD",
                        amount=state["disputed_amount"],
                        status="PENDING",
                        requester_agent="supervisor_agent",
                    )
                    session.add(appr_req)
                    await session.commit()
            except Exception as exc:
                await session.rollback()
                # Non-fatal DB error logged while preserving workflow suspension
                pass

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
            state.setdefault("errors", []).append("Resolution error: Missing cryptographically signed PolicyToken for execution")
            state["status"] = "FAILED"
            return state

        try:
            async with AsyncSessionLocal() as session:
                mcp_res = await FinancialMCPServer.call_tool(
                    session=session,
                    tool_name="create_refund_request",
                    arguments={
                        "dispute_id": state.get("dispute_id", ""),
                        "transaction_id": state.get("transaction_id", ""),
                        "amount": state.get("disputed_amount", 0.0),
                        "idempotency_key": state.get("idempotency_key") or f"idemp_{state.get('dispute_id', 'disp')[:8]}_{uuid.uuid4().hex[:6]}",
                        "policy_token": token,
                    },
                    caller=caller,
                )
        except Exception as exc:
            state.setdefault("errors", []).append(f"Financial execution failed: {str(exc)}")
            state["status"] = "FAILED"
            return state

        if mcp_res["isError"]:
            err_data = json.loads(mcp_res["content"][0]["text"])
            state.setdefault("errors", []).append(f"Financial execution failed: {err_data.get('error')}")
            state["status"] = "FAILED"
        else:
            exec_data = json.loads(mcp_res["content"][0]["text"])
            state["execution_result"] = exec_data
            state["status"] = "RESOLVED_REFUNDED"
            state.setdefault("timeline", []).append({
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
