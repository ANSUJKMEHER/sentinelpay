import os
import pytest
from app.agents.llm_provider import OpenAICompatibleLLMProvider, PolicyAdvisoryOutput, RecommendedAction
from app.core.config import settings


@pytest.mark.external_llm
@pytest.mark.asyncio
async def test_real_external_openai_provider_live_request():
    """
    OPTIONAL EXTERNAL INTEGRATION GATE:
    Executes a single genuine API request to an explicitly configured OpenAI-compatible endpoint.
    - Active ONLY when OPENAI_API_KEY environment variable is provided.
    - Verifies genuine network request, structured Pydantic response parsing, and fields.
    - Confirms that API key is NEVER exposed in assertions or outputs.
    - Zero real financial movement occurs.
    """
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        pytest.skip(
            "Skipping real external LLM verification: OPENAI_API_KEY environment variable is not set. "
            "Set OPENAI_API_KEY (and optionally OPENAI_BASE_URL, OPENAI_MODEL) to run this test."
        )

    base_url = os.getenv("OPENAI_BASE_URL", settings.OPENAI_BASE_URL).strip()
    model = os.getenv("OPENAI_MODEL", settings.OPENAI_MODEL).strip()

    provider = OpenAICompatibleLLMProvider(
        api_key=api_key,
        base_url=base_url,
        model=model,
        timeout_seconds=15.0,
        max_retries=1,
    )

    state = {
        "dispute_id": "disp_real_ext_01",
        "dispute_type": "goods_not_received",
        "disputed_amount": 4200.0,
        "customer_id": "cust_ext_live_01",
        "merchant_id": "mch_ext_live_01",
        "claim_reason": "Purchased wireless headset. Tracking indicates delivery, but package was never received.",
        "investigation_findings": {
            "transaction_amount": 4200.0,
            "transaction_status": "SETTLED",
            "refunded_amount": 0.0,
            "customer_risk_tier": "LOW",
            "customer_prior_chargebacks": 0,
            "merchant_risk_score": 0.05,
            "merchant_dispute_rate": 0.003,
        },
        "evidence_findings": {
            "item_count": 1,
            "average_authenticity_score": 0.95,
            "contains_adversarial_payload": False,
        },
    }

    try:
        result = await provider.generate_advisory(state)
    except Exception as exc:
        pytest.fail(f"Real external LLM request to '{base_url}' (model: {model}) failed with error: {type(exc).__name__}: {str(exc)}")

    # Verify structured Pydantic output
    assert isinstance(result, PolicyAdvisoryOutput), f"Expected PolicyAdvisoryOutput, got {type(result)}"
    assert result.recommended_action in [
        RecommendedAction.APPROVE_REFUND,
        RecommendedAction.ESCALATE_TO_HUMAN,
        RecommendedAction.REJECT_DISPUTE,
    ]
    assert 0.0 <= result.confidence_score <= 1.0
    assert isinstance(result.cited_rules, list)
    assert len(result.rationale) > 0
    assert len(result.risk_summary) > 0
    assert result.provider_used == "openai"
    assert result.fallback_triggered is False

    # Security invariant: Assert that API key is NEVER leaked in the rationale or output fields
    assert api_key not in result.rationale
    assert api_key not in result.risk_summary
    for rule in result.cited_rules:
        assert api_key not in rule
