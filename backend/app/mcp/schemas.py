from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class MCPCallerIdentity(BaseModel):
    actor_id: str
    actor_role: str  # AGENT, OPS_ANALYST, RISK_LEAD, FIN_OPS_ADMIN, MERCHANT_ANALYST
    merchant_id: Optional[str] = None
    trace_id: str


# 1. get_transaction_details
class GetTransactionDetailsInput(BaseModel):
    transaction_id: str = Field(..., description="Unique transaction ID")


class TransactionDetailsOutput(BaseModel):
    transaction_id: str
    merchant_id: str
    account_id: str
    amount: float
    currency: str
    status: str
    payment_method: str
    refunded_amount: float
    eligible_refund_balance: float
    idempotency_key: str
    created_at: str
    metadata: Dict[str, Any] = {}


# 2. get_merchant_profile
class GetMerchantProfileInput(BaseModel):
    merchant_id: str = Field(..., description="Unique merchant ID")


class MerchantProfileOutput(BaseModel):
    merchant_id: str
    name: str
    tier: str
    risk_score: float
    status: str
    dispute_rate: float
    payout_frozen: bool


# 3. get_dispute_status
class GetDisputeStatusInput(BaseModel):
    dispute_id: str = Field(..., description="Unique dispute ID")


class DisputeStatusOutput(BaseModel):
    dispute_id: str
    transaction_id: str
    merchant_id: str
    dispute_type: str
    disputed_amount: float
    status: str
    current_stage: str
    ai_confidence: Optional[float] = None
    policy_verdict: Optional[str] = None
    human_required: bool
    final_resolution: Optional[str] = None
    created_at: str


# 4. search_payment_history
class SearchPaymentHistoryInput(BaseModel):
    customer_id: Optional[str] = None
    merchant_id: Optional[str] = None
    status: Optional[str] = None
    limit: int = Field(10, ge=1, le=100)


class PaymentHistoryItem(BaseModel):
    transaction_id: str
    amount: float
    currency: str
    status: str
    created_at: str


class SearchPaymentHistoryOutput(BaseModel):
    transactions: List[PaymentHistoryItem]
    total_found: int


# 5. retrieve_dispute_evidence
class RetrieveDisputeEvidenceInput(BaseModel):
    dispute_id: str = Field(..., description="Unique dispute ID")


class EvidenceItem(BaseModel):
    evidence_id: str
    document_type: str
    filename: str
    file_hash: str
    extracted_text: Optional[str] = None
    authenticity_score: float
    is_verified: bool


class RetrieveDisputeEvidenceOutput(BaseModel):
    dispute_id: str
    evidence_items: List[EvidenceItem]
    average_authenticity_score: float


# 6. calculate_refund_eligibility
class CalculateRefundEligibilityInput(BaseModel):
    transaction_id: str = Field(..., description="Target transaction ID")
    requested_refund_amount: float = Field(..., gt=0)


class CalculateRefundEligibilityOutput(BaseModel):
    transaction_id: str
    is_eligible: bool
    requested_amount: float
    original_amount: float
    already_refunded: float
    remaining_balance: float
    rejection_reason: Optional[str] = None


# 7. create_refund_request (Requires signed PolicyToken)
class CreateRefundRequestInput(BaseModel):
    dispute_id: str
    transaction_id: str
    amount: float = Field(..., gt=0)
    idempotency_key: str
    policy_token: str = Field(..., description="Short-lived signed PolicyToken from the PolicyEngine")


class CreateRefundRequestOutput(BaseModel):
    success: bool
    execution_id: str
    dispute_id: str
    transaction_id: str
    refunded_amount: float
    status: str
    idempotency_key: str
    executed_at: str
    message: str


# 8. submit_dispute_resolution
class SubmitDisputeResolutionInput(BaseModel):
    dispute_id: str
    resolution: str = Field(..., description="REFUND_ISSUED, DISPUTE_REJECTED, PROVISIONAL_CREDIT, ESCALATED_TO_HUMAN")
    reason: str
    policy_token: Optional[str] = None


class SubmitDisputeResolutionOutput(BaseModel):
    dispute_id: str
    status: str
    resolution: str
    updated_at: str
    message: str


# 9. get_audit_history
class GetAuditHistoryInput(BaseModel):
    trace_id: Optional[str] = None
    limit: int = Field(20, ge=1, le=100)


class AuditLogItem(BaseModel):
    id: str
    trace_id: str
    event_type: str
    actor_type: str
    actor_id: str
    prev_hash: str
    current_hash: str
    created_at: str


class GetAuditHistoryOutput(BaseModel):
    logs: List[AuditLogItem]
    chain_tampered: bool
    tamper_details: Optional[str] = None
