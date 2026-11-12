from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class PolicyVerdict(str, Enum):
    AUTO_APPROVED = "AUTO_APPROVED"
    REQUIRES_HUMAN_APPROVAL = "REQUIRES_HUMAN_APPROVAL"
    POLICY_REJECTED = "POLICY_REJECTED"


class PolicyContext(BaseModel):
    dispute_id: str
    transaction_id: str
    merchant_id: str
    customer_id: str
    disputed_amount: float = Field(..., gt=0)
    transaction_amount: float = Field(..., gt=0)
    cumulative_refunded_amount: float = Field(0.0, ge=0)
    transaction_status: str = "SETTLED"
    transaction_timestamp: datetime
    dispute_timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # Merchant context
    merchant_tier: str = "STANDARD"
    merchant_risk_score: float = Field(0.1, ge=0.0, le=1.0)
    merchant_dispute_rate: float = Field(0.005, ge=0.0, le=1.0)
    merchant_status: str = "ACTIVE"
    payout_frozen: bool = False

    # Customer context
    customer_risk_tier: str = "LOW"
    customer_prior_chargebacks: int = Field(0, ge=0)
    customer_status: str = "ACTIVE"

    # Evidence & idempotency
    idempotency_key: str
    is_duplicate_request: bool = False
    evidence_authenticity_score: float = Field(1.0, ge=0.0, le=1.0)

    # Actor context
    actor_id: str = "system"
    actor_role: str = "POLICY_ENGINE"


class RuleEvaluationResult(BaseModel):
    rule_code: str
    rule_name: str
    passed: bool
    verdict_impact: PolicyVerdict
    reason: str
    details: Dict[str, Any] = Field(default_factory=dict)


class PolicyEvaluationSummary(BaseModel):
    dispute_id: str
    overall_verdict: PolicyVerdict
    reasons: List[str]
    evaluations: List[RuleEvaluationResult]
    evaluated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    execution_permitted: bool
    policy_token: Optional[str] = None
