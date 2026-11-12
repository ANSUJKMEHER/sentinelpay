from datetime import datetime, timedelta, timezone
import logging
from typing import List, Optional
from app.core.config import settings
from app.core.security import create_policy_execution_token
from app.policy.models import PolicyContext, PolicyEvaluationSummary, PolicyVerdict, RuleEvaluationResult
from app.policy.rules import (
    evaluate_customer_standing,
    evaluate_dispute_window,
    evaluate_evidence_integrity,
    evaluate_idempotency_and_duplicate,
    evaluate_merchant_standing,
    evaluate_spend_limit,
    evaluate_transaction_eligibility,
)

logger = logging.getLogger("sentinelpay.policy")


class DeterministicPolicyEngine:
    """
    Independent, deterministic policy engine.
    Completely decoupled from LLM inference.
    Fails closed: Any unexpected error results in POLICY_REJECTED.
    """

    ALLOWED_HUMAN_APPROVER_ROLES = {"RISK_LEAD", "FIN_OPS_ADMIN"}

    @classmethod
    def evaluate(cls, ctx: PolicyContext) -> PolicyEvaluationSummary:
        try:
            evaluations: List[RuleEvaluationResult] = []

            # 1. Idempotency & Duplicate Request Check
            evaluations.append(evaluate_idempotency_and_duplicate(ctx))

            # 2. Transaction Balance & Status Check
            evaluations.append(evaluate_transaction_eligibility(ctx))

            # 3. Regulatory Dispute Window (60-day rule)
            evaluations.append(evaluate_dispute_window(ctx))

            # 4. Merchant Risk & Standing
            evaluations.append(evaluate_merchant_standing(ctx))

            # 5. Customer Abuse & Chargeback Cap
            evaluations.append(evaluate_customer_standing(ctx))

            # 6. Evidence Authenticity & Integrity
            evaluations.append(evaluate_evidence_integrity(ctx))

            # 7. Spend & Auto-Refund Threshold
            evaluations.append(evaluate_spend_limit(ctx))

            # Evaluate cumulative verdict
            reasons: List[str] = []
            has_rejection = False
            has_human_requirement = False

            for eval_res in evaluations:
                if eval_res.verdict_impact == PolicyVerdict.POLICY_REJECTED:
                    has_rejection = True
                    reasons.append(f"REJECTED by {eval_res.rule_code}: {eval_res.reason}")
                elif eval_res.verdict_impact == PolicyVerdict.REQUIRES_HUMAN_APPROVAL:
                    has_human_requirement = True
                    reasons.append(f"ESCALATED by {eval_res.rule_code}: {eval_res.reason}")

            if has_rejection:
                verdict = PolicyVerdict.POLICY_REJECTED
                execution_permitted = False
                token = None
            elif has_human_requirement:
                verdict = PolicyVerdict.REQUIRES_HUMAN_APPROVAL
                execution_permitted = False
                token = None
            else:
                verdict = PolicyVerdict.AUTO_APPROVED
                execution_permitted = True
                reasons.append("All deterministic policy rules satisfied. Automated execution permitted.")
                # Issue signed short-lived execution token
                token = create_policy_execution_token(
                    dispute_id=ctx.dispute_id,
                    transaction_id=ctx.transaction_id,
                    amount=ctx.disputed_amount,
                    action_type="REFUND",
                    idempotency_key=ctx.idempotency_key,
                    merchant_id=ctx.merchant_id,
                    approved_by="POLICY_ENGINE",
                    role="POLICY_ENGINE",
                )

            return PolicyEvaluationSummary(
                dispute_id=ctx.dispute_id,
                overall_verdict=verdict,
                reasons=reasons,
                evaluations=evaluations,
                execution_permitted=execution_permitted,
                policy_token=token,
            )

        except Exception as e:
            logger.error(f"Policy engine fail-closed exception on dispute {ctx.dispute_id}: {str(e)}", exc_info=True)
            return PolicyEvaluationSummary(
                dispute_id=ctx.dispute_id,
                overall_verdict=PolicyVerdict.POLICY_REJECTED,
                reasons=[f"Fail-closed policy exception triggered: {str(e)}"],
                evaluations=[],
                execution_permitted=False,
                policy_token=None,
            )

    @classmethod
    def authorize_human_approval(
        cls,
        dispute_id: str,
        transaction_id: str,
        merchant_id: str,
        amount: float,
        idempotency_key: str,
        approver_id: str,
        approver_role: str,
        action_type: str = "REFUND",
        expires_delta: Optional[timedelta] = None,
    ) -> PolicyEvaluationSummary:
        """
        Issues a signed PolicyToken when an authorized human (RISK_LEAD or FIN_OPS_ADMIN)
        explicitly signs off on an escalated dispute.
        """
        if approver_role not in cls.ALLOWED_HUMAN_APPROVER_ROLES:
            return PolicyEvaluationSummary(
                dispute_id=dispute_id,
                overall_verdict=PolicyVerdict.POLICY_REJECTED,
                reasons=[f"Unauthorized approver role '{approver_role}'. Requires one of: {cls.ALLOWED_HUMAN_APPROVER_ROLES}"],
                evaluations=[],
                execution_permitted=False,
                policy_token=None,
            )

        token = create_policy_execution_token(
            dispute_id=dispute_id,
            transaction_id=transaction_id,
            amount=amount,
            action_type=action_type,
            idempotency_key=idempotency_key,
            merchant_id=merchant_id,
            approved_by=approver_id,
            role=approver_role,
            expires_delta=expires_delta,
        )

        return PolicyEvaluationSummary(
            dispute_id=dispute_id,
            overall_verdict=PolicyVerdict.AUTO_APPROVED,
            reasons=[f"Human approval granted by {approver_role} ({approver_id})"],
            evaluations=[],
            execution_permitted=True,
            policy_token=token,
        )
