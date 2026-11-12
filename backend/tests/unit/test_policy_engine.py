from datetime import datetime, timedelta, timezone
import pytest
from app.core.security import verify_policy_execution_token
from app.policy.engine import DeterministicPolicyEngine
from app.policy.models import PolicyContext, PolicyVerdict


@pytest.fixture
def base_context() -> PolicyContext:
    now = datetime.now(timezone.utc)
    return PolicyContext(
        dispute_id="disp_test_01",
        transaction_id="txn_1001",
        merchant_id="mch_quickbite_02",
        customer_id="CUST-IND-1001",
        disputed_amount=750.0,
        transaction_amount=750.0,
        cumulative_refunded_amount=0.0,
        transaction_status="SETTLED",
        transaction_timestamp=now - timedelta(days=5),
        dispute_timestamp=now,
        merchant_tier="STANDARD",
        merchant_risk_score=0.10,
        merchant_dispute_rate=0.005,
        merchant_status="ACTIVE",
        customer_risk_tier="LOW",
        customer_prior_chargebacks=0,
        customer_status="ACTIVE",
        idempotency_key="idemp_unique_test_001",
        is_duplicate_request=False,
        evidence_authenticity_score=0.95,
    )


def test_auto_approval_for_eligible_low_amount(base_context):
    summary = DeterministicPolicyEngine.evaluate(base_context)
    assert summary.overall_verdict == PolicyVerdict.AUTO_APPROVED
    assert summary.execution_permitted is True
    assert summary.policy_token is not None

    # Validate generated PolicyToken
    token_payload = verify_policy_execution_token(summary.policy_token)
    assert token_payload["sub"] == base_context.dispute_id
    assert token_payload["amount"] == 750.0
    assert token_payload["role"] == "POLICY_ENGINE"


def test_high_amount_requires_human_approval(base_context):
    base_context.disputed_amount = 25000.0
    base_context.transaction_amount = 25000.0

    summary = DeterministicPolicyEngine.evaluate(base_context)
    assert summary.overall_verdict == PolicyVerdict.REQUIRES_HUMAN_APPROVAL
    assert summary.execution_permitted is False
    assert summary.policy_token is None
    assert any("RULE_MAX_AUTO_REFUND" in r for r in summary.reasons)


def test_duplicate_idempotency_request_rejected(base_context):
    base_context.is_duplicate_request = True

    summary = DeterministicPolicyEngine.evaluate(base_context)
    assert summary.overall_verdict == PolicyVerdict.POLICY_REJECTED
    assert summary.execution_permitted is False
    assert summary.policy_token is None
    assert any("RULE_DUPLICATE_CLAIM_CHECK" in r for r in summary.reasons)


def test_dispute_outside_60_day_window_rejected(base_context):
    now = datetime.now(timezone.utc)
    base_context.transaction_timestamp = now - timedelta(days=75)

    summary = DeterministicPolicyEngine.evaluate(base_context)
    assert summary.overall_verdict == PolicyVerdict.POLICY_REJECTED
    assert summary.execution_permitted is False
    assert summary.policy_token is None
    assert any("RULE_DISPUTE_WINDOW" in r for r in summary.reasons)


def test_refund_amount_exceeding_remaining_balance_rejected(base_context):
    base_context.disputed_amount = 500.0
    base_context.transaction_amount = 750.0
    base_context.cumulative_refunded_amount = 400.0  # Remaining balance is only 350.0

    summary = DeterministicPolicyEngine.evaluate(base_context)
    assert summary.overall_verdict == PolicyVerdict.POLICY_REJECTED
    assert summary.execution_permitted is False
    assert any("RULE_BALANCE_CAP" in r for r in summary.reasons)


def test_suspended_merchant_rejected(base_context):
    base_context.merchant_status = "SUSPENDED"

    summary = DeterministicPolicyEngine.evaluate(base_context)
    assert summary.overall_verdict == PolicyVerdict.POLICY_REJECTED
    assert summary.execution_permitted is False


def test_customer_chargeback_velocity_requires_human(base_context):
    base_context.customer_prior_chargebacks = 4

    summary = DeterministicPolicyEngine.evaluate(base_context)
    assert summary.overall_verdict == PolicyVerdict.REQUIRES_HUMAN_APPROVAL
    assert summary.execution_permitted is False
    assert any("RULE_CUSTOMER_CHARGEBACK_CAP" in r for r in summary.reasons)


def test_authorized_human_approval_issues_token():
    summary = DeterministicPolicyEngine.authorize_human_approval(
        dispute_id="disp_high_val_99",
        transaction_id="txn_1002",
        merchant_id="mch_zenith_04",
        amount=45000.0,
        idempotency_key="idemp_human_appr_99",
        approver_id="user_lead_01",
        approver_role="RISK_LEAD",
    )
    assert summary.overall_verdict == PolicyVerdict.AUTO_APPROVED
    assert summary.execution_permitted is True
    assert summary.policy_token is not None

    payload = verify_policy_execution_token(summary.policy_token)
    assert payload["sub"] == "disp_high_val_99"
    assert payload["amount"] == 45000.0
    assert payload["role"] == "RISK_LEAD"


def test_unauthorized_human_approval_rejected():
    summary = DeterministicPolicyEngine.authorize_human_approval(
        dispute_id="disp_high_val_99",
        transaction_id="txn_1002",
        merchant_id="mch_zenith_04",
        amount=45000.0,
        idempotency_key="idemp_human_appr_99",
        approver_id="user_merchant_01",
        approver_role="MERCHANT_ANALYST",  # Merchant analyst cannot sign off!
    )
    assert summary.overall_verdict == PolicyVerdict.POLICY_REJECTED
    assert summary.execution_permitted is False
    assert summary.policy_token is None


def test_dispute_future_transaction_timestamp_rejected(base_context):
    now = datetime.now(timezone.utc)
    base_context.transaction_timestamp = now + timedelta(days=2)  # Future timestamp

    summary = DeterministicPolicyEngine.evaluate(base_context)
    assert summary.overall_verdict == PolicyVerdict.POLICY_REJECTED
    assert summary.execution_permitted is False
    assert any("in the future" in r for r in summary.reasons)


def test_dispute_naive_transaction_timestamp_handled_safely(base_context):
    now_naive = datetime.now(timezone.utc).replace(tzinfo=None)
    base_context.transaction_timestamp = now_naive - timedelta(days=10)
    base_context.dispute_timestamp = now_naive

    summary = DeterministicPolicyEngine.evaluate(base_context)
    assert summary.overall_verdict == PolicyVerdict.AUTO_APPROVED
    assert summary.execution_permitted is True


def test_dispute_boundary_exact_within_60_days_passes(base_context):
    now = datetime.now(timezone.utc)
    base_context.transaction_timestamp = now - timedelta(days=59, hours=23)

    summary = DeterministicPolicyEngine.evaluate(base_context)
    assert summary.overall_verdict == PolicyVerdict.AUTO_APPROVED
    assert summary.execution_permitted is True

