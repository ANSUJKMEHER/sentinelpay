from datetime import datetime, timezone
from typing import List
from app.core.config import settings
from app.policy.models import PolicyContext, PolicyVerdict, RuleEvaluationResult


def evaluate_idempotency_and_duplicate(ctx: PolicyContext) -> RuleEvaluationResult:
    if ctx.is_duplicate_request:
        return RuleEvaluationResult(
            rule_code="RULE_DUPLICATE_CLAIM_CHECK",
            rule_name="Duplicate Dispute & Double Refund Prevention",
            passed=False,
            verdict_impact=PolicyVerdict.POLICY_REJECTED,
            reason=f"Duplicate execution request detected for idempotency key '{ctx.idempotency_key}'",
            details={"idempotency_key": ctx.idempotency_key},
        )
    return RuleEvaluationResult(
        rule_code="RULE_DUPLICATE_CLAIM_CHECK",
        rule_name="Duplicate Dispute & Double Refund Prevention",
        passed=True,
        verdict_impact=PolicyVerdict.AUTO_APPROVED,
        reason="Idempotency key verified unique",
        details={"idempotency_key": ctx.idempotency_key},
    )


def evaluate_transaction_eligibility(ctx: PolicyContext) -> RuleEvaluationResult:
    allowed_statuses = ["SETTLED", "PARTIALLY_REFUNDED"]
    if ctx.transaction_status not in allowed_statuses:
        return RuleEvaluationResult(
            rule_code="RULE_TRANSACTION_STATUS",
            rule_name="Transaction Status Eligibility",
            passed=False,
            verdict_impact=PolicyVerdict.POLICY_REJECTED,
            reason=f"Transaction status '{ctx.transaction_status}' is ineligible for refund/dispute",
            details={"status": ctx.transaction_status, "allowed": allowed_statuses},
        )

    remaining_balance = round(ctx.transaction_amount - ctx.cumulative_refunded_amount, 2)
    if round(ctx.disputed_amount, 2) > remaining_balance:
        return RuleEvaluationResult(
            rule_code="RULE_BALANCE_CAP",
            rule_name="Refund Balance Cap",
            passed=False,
            verdict_impact=PolicyVerdict.POLICY_REJECTED,
            reason=f"Disputed amount (₹{ctx.disputed_amount:.2f}) exceeds remaining eligible transaction balance (₹{remaining_balance:.2f})",
            details={
                "disputed_amount": ctx.disputed_amount,
                "remaining_balance": remaining_balance,
                "transaction_amount": ctx.transaction_amount,
                "cumulative_refunded": ctx.cumulative_refunded_amount,
            },
        )

    return RuleEvaluationResult(
        rule_code="RULE_BALANCE_CAP",
        rule_name="Refund Balance Cap",
        passed=True,
        verdict_impact=PolicyVerdict.AUTO_APPROVED,
        reason=f"Disputed amount is within eligible balance of ₹{remaining_balance:.2f}",
        details={"remaining_balance": remaining_balance},
    )


def evaluate_dispute_window(ctx: PolicyContext, max_days: int = settings.POLICY_MAX_DISPUTE_WINDOW_DAYS) -> RuleEvaluationResult:
    tx_time = ctx.transaction_timestamp
    if tx_time.tzinfo is None:
        tx_time = tx_time.replace(tzinfo=timezone.utc)
    disp_time = ctx.dispute_timestamp
    if disp_time.tzinfo is None:
        disp_time = disp_time.replace(tzinfo=timezone.utc)

    delta = (disp_time - tx_time).total_seconds() / 86400.0

    if delta < 0:
        return RuleEvaluationResult(
            rule_code="RULE_DISPUTE_WINDOW",
            rule_name="Regulatory Dispute Window Check",
            passed=False,
            verdict_impact=PolicyVerdict.POLICY_REJECTED,
            reason="Transaction timestamp is in the future relative to dispute timestamp",
            details={"days_elapsed": round(delta, 1), "max_allowed_days": max_days},
        )

    if delta > max_days:
        return RuleEvaluationResult(
            rule_code="RULE_DISPUTE_WINDOW",
            rule_name="Regulatory Dispute Window Check",
            passed=False,
            verdict_impact=PolicyVerdict.POLICY_REJECTED,
            reason=f"Dispute filed {int(delta)} days after transaction; exceeds {max_days}-day limit",
            details={"days_elapsed": round(delta, 1), "max_allowed_days": max_days},
        )

    return RuleEvaluationResult(
        rule_code="RULE_DISPUTE_WINDOW",
        rule_name="Regulatory Dispute Window Check",
        passed=True,
        verdict_impact=PolicyVerdict.AUTO_APPROVED,
        reason=f"Dispute filed within regulatory window ({int(delta)} of {max_days} days)",
        details={"days_elapsed": round(delta, 1), "max_allowed_days": max_days},
    )


def evaluate_merchant_standing(ctx: PolicyContext, max_dispute_rate: float = settings.POLICY_MERCHANT_DISPUTE_RATIO_ALERT) -> RuleEvaluationResult:
    if ctx.merchant_status == "SUSPENDED":
        return RuleEvaluationResult(
            rule_code="RULE_MERCHANT_DISPUTE_VELOCITY",
            rule_name="Merchant Risk & Standing Check",
            passed=False,
            verdict_impact=PolicyVerdict.POLICY_REJECTED,
            reason="Merchant account is SUSPENDED. All automated operations blocked.",
            details={"merchant_status": ctx.merchant_status},
        )

    if ctx.payout_frozen or ctx.merchant_status == "PROBATION":
        return RuleEvaluationResult(
            rule_code="RULE_MERCHANT_DISPUTE_VELOCITY",
            rule_name="Merchant Risk & Standing Check",
            passed=False,
            verdict_impact=PolicyVerdict.REQUIRES_HUMAN_APPROVAL,
            reason=f"Merchant status is '{ctx.merchant_status}' (payout_frozen={ctx.payout_frozen}). Mandatory risk lead review required.",
            details={"merchant_status": ctx.merchant_status, "payout_frozen": ctx.payout_frozen},
        )

    if ctx.merchant_dispute_rate > max_dispute_rate or ctx.merchant_risk_score >= 0.70:
        return RuleEvaluationResult(
            rule_code="RULE_MERCHANT_DISPUTE_VELOCITY",
            rule_name="Merchant Risk & Standing Check",
            passed=False,
            verdict_impact=PolicyVerdict.REQUIRES_HUMAN_APPROVAL,
            reason=f"Merchant dispute rate ({ctx.merchant_dispute_rate*100:.2f}%) or risk score ({ctx.merchant_risk_score:.2f}) triggers operational escalation.",
            details={"dispute_rate": ctx.merchant_dispute_rate, "risk_score": ctx.merchant_risk_score},
        )

    return RuleEvaluationResult(
        rule_code="RULE_MERCHANT_DISPUTE_VELOCITY",
        rule_name="Merchant Risk & Standing Check",
        passed=True,
        verdict_impact=PolicyVerdict.AUTO_APPROVED,
        reason="Merchant is in good standing with acceptable dispute metrics",
        details={"merchant_status": ctx.merchant_status, "dispute_rate": ctx.merchant_dispute_rate},
    )


def evaluate_customer_standing(ctx: PolicyContext, max_prior_chargebacks: int = settings.POLICY_CUSTOMER_CHARGEBACK_LIMIT) -> RuleEvaluationResult:
    if ctx.customer_status == "LOCKED":
        return RuleEvaluationResult(
            rule_code="RULE_CUSTOMER_CHARGEBACK_CAP",
            rule_name="Customer Abuse & Risk Check",
            passed=False,
            verdict_impact=PolicyVerdict.POLICY_REJECTED,
            reason="Customer account is LOCKED for compliance violation",
            details={"customer_status": ctx.customer_status},
        )

    if ctx.customer_prior_chargebacks >= max_prior_chargebacks or ctx.customer_risk_tier == "HIGH":
        return RuleEvaluationResult(
            rule_code="RULE_CUSTOMER_CHARGEBACK_CAP",
            rule_name="Customer Abuse & Risk Check",
            passed=False,
            verdict_impact=PolicyVerdict.REQUIRES_HUMAN_APPROVAL,
            reason=f"Customer has {ctx.customer_prior_chargebacks} prior chargebacks (risk tier: {ctx.customer_risk_tier}). Automated resolution denied.",
            details={"prior_chargebacks": ctx.customer_prior_chargebacks, "risk_tier": ctx.customer_risk_tier},
        )

    return RuleEvaluationResult(
        rule_code="RULE_CUSTOMER_CHARGEBACK_CAP",
        rule_name="Customer Abuse & Risk Check",
        passed=True,
        verdict_impact=PolicyVerdict.AUTO_APPROVED,
        reason="Customer history meets risk criteria",
        details={"prior_chargebacks": ctx.customer_prior_chargebacks, "risk_tier": ctx.customer_risk_tier},
    )


def evaluate_evidence_integrity(ctx: PolicyContext, min_authenticity_score: float = 0.60) -> RuleEvaluationResult:
    if ctx.evidence_authenticity_score < min_authenticity_score:
        return RuleEvaluationResult(
            rule_code="RULE_EVIDENCE_INTEGRITY",
            rule_name="Evidence Authenticity & Completeness Check",
            passed=False,
            verdict_impact=PolicyVerdict.REQUIRES_HUMAN_APPROVAL,
            reason=f"Evidence authenticity score ({ctx.evidence_authenticity_score:.2f}) is below minimum threshold ({min_authenticity_score:.2f})",
            details={"score": ctx.evidence_authenticity_score, "min_score": min_authenticity_score},
        )

    return RuleEvaluationResult(
        rule_code="RULE_EVIDENCE_INTEGRITY",
        rule_name="Evidence Authenticity & Completeness Check",
        passed=True,
        verdict_impact=PolicyVerdict.AUTO_APPROVED,
        reason=f"Evidence authenticity score ({ctx.evidence_authenticity_score:.2f}) satisfies evidentiary criteria",
        details={"score": ctx.evidence_authenticity_score},
    )


def evaluate_spend_limit(ctx: PolicyContext, max_auto_amount: float = settings.POLICY_MAX_AUTO_REFUND_AMOUNT) -> RuleEvaluationResult:
    if ctx.disputed_amount > max_auto_amount:
        return RuleEvaluationResult(
            rule_code="RULE_MAX_AUTO_REFUND",
            rule_name="Maximum Automated Refund Cap",
            passed=False,
            verdict_impact=PolicyVerdict.REQUIRES_HUMAN_APPROVAL,
            reason=f"Disputed amount (₹{ctx.disputed_amount:.2f}) exceeds automated resolution limit of ₹{max_auto_amount:.2f}. Mandatory human approval required.",
            details={"disputed_amount": ctx.disputed_amount, "max_auto_amount": max_auto_amount},
        )

    return RuleEvaluationResult(
        rule_code="RULE_MAX_AUTO_REFUND",
        rule_name="Maximum Automated Refund Cap",
        passed=True,
        verdict_impact=PolicyVerdict.AUTO_APPROVED,
        reason=f"Disputed amount (₹{ctx.disputed_amount:.2f}) is within automated cap of ₹{max_auto_amount:.2f}",
        details={"disputed_amount": ctx.disputed_amount, "max_auto_amount": max_auto_amount},
    )
