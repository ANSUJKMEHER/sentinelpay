from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from typing_extensions import TypedDict


class DisputeState(TypedDict, total=False):
    # Identifiers
    dispute_id: str
    transaction_id: str
    merchant_id: str
    customer_id: str
    trace_id: str

    # Claim inputs
    dispute_type: str
    disputed_amount: float
    currency: str
    claim_reason: str
    evidence_files: List[Dict[str, Any]]
    idempotency_key: str

    # Workflow controls
    iteration_count: int
    current_stage: str
    status: str  # INTAKE, INVESTIGATING, EVALUATING, POLICY_EVALUATION, AWAITING_APPROVAL, RESOLVED, FAILED
    human_approval_required: bool
    human_approval_status: Optional[str]  # PENDING, APPROVED, REJECTED
    human_approver_id: Optional[str]
    human_approver_role: Optional[str]

    # Agent findings
    validation_errors: List[str]
    intake_findings: Dict[str, Any]
    investigation_findings: Dict[str, Any]
    evidence_findings: Dict[str, Any]
    policy_advisory: Dict[str, Any]
    policy_engine_result: Dict[str, Any]
    execution_result: Dict[str, Any]

    # Diagnostics & Traceability
    timeline: List[Dict[str, Any]]
    errors: List[str]


def create_initial_state(
    dispute_id: str,
    transaction_id: str,
    merchant_id: str,
    customer_id: str,
    dispute_type: str,
    disputed_amount: float,
    claim_reason: str,
    idempotency_key: str,
    evidence_files: Optional[List[Dict[str, Any]]] = None,
    trace_id: Optional[str] = None,
    currency: str = "INR",
) -> DisputeState:
    timestamp = datetime.now(timezone.utc).isoformat()
    return {
        "dispute_id": dispute_id,
        "transaction_id": transaction_id,
        "merchant_id": merchant_id,
        "customer_id": customer_id,
        "trace_id": trace_id or f"trace_{dispute_id}",
        "dispute_type": dispute_type,
        "disputed_amount": round(float(disputed_amount), 2),
        "currency": currency,
        "claim_reason": claim_reason,
        "evidence_files": evidence_files or [],
        "idempotency_key": idempotency_key,
        "iteration_count": 0,
        "current_stage": "INTAKE",
        "status": "INTAKE",
        "human_approval_required": False,
        "human_approval_status": None,
        "human_approver_id": None,
        "human_approver_role": None,
        "validation_errors": [],
        "intake_findings": {},
        "investigation_findings": {},
        "evidence_findings": {},
        "policy_advisory": {},
        "policy_engine_result": {},
        "execution_result": {},
        "timeline": [
            {
                "stage": "INITIALIZATION",
                "timestamp": timestamp,
                "agent": "system",
                "message": f"Dispute workflow initialized for {dispute_id} (amount: ₹{disputed_amount:.2f})",
            }
        ],
        "errors": [],
    }
