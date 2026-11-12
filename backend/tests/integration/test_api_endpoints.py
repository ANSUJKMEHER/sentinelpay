import pytest
import httpx
from app.main import app


@pytest.mark.asyncio
async def test_health_endpoint():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "HEALTHY"
        assert data["components"]["audit_ledger"]["chain_intact"] is True


@pytest.mark.asyncio
async def test_auth_login():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post("/api/v1/auth/login", json={"username": "risk_lead"})
        assert res.status_code == 200
        data = res.json()
        assert "access_token" in data
        assert data["role"] == "RISK_LEAD"


@pytest.mark.asyncio
async def test_list_transactions_and_details():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Login as ops analyst
        login_res = await client.post("/api/v1/auth/login", json={"username": "ops_analyst"})
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. List transactions
        res = await client.get("/api/v1/transactions", headers=headers)
        assert res.status_code == 200
        transactions = res.json()
        assert len(transactions) > 0

        # 3. Get single transaction
        tx_id = transactions[0]["id"]
        tx_res = await client.get(f"/api/v1/transactions/{tx_id}", headers=headers)
        assert tx_res.status_code == 200
        assert tx_res.json()["id"] == tx_id


@pytest.mark.asyncio
async def test_dispute_creation_and_agent_investigation_api():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        login_res = await client.post("/api/v1/auth/login", json={"username": "ops_analyst"})
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Create a dispute for txn_1001
        create_payload = {
            "transaction_id": "txn_1001",
            "dispute_type": "goods_not_received",
            "disputed_amount": 50.0,
            "claim_reason": "Order placed on QuickBite was never delivered to customer apartment.",
        }
        res = await client.post("/api/v1/disputes", json=create_payload, headers=headers)
        assert res.status_code == 200
        dispute_data = res.json()
        dispute_id = dispute_data["id"]

        # 2. Trigger agent investigation
        inv_res = await client.post(f"/api/v1/disputes/{dispute_id}/investigate", headers=headers)
        assert inv_res.status_code == 200
        inv_data = inv_res.json()
        assert inv_data["dispute_id"] == dispute_id
        assert inv_data["policy_verdict"] == "AUTO_APPROVED"
        assert len(inv_data["timeline"]) > 0


@pytest.mark.asyncio
async def test_audit_verify_and_rules_api():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Verify audit ledger
        audit_res = await client.get("/api/v1/audit/verify")
        assert audit_res.status_code == 200
        assert audit_res.json()["chain_intact"] is True

        # List policy rules
        rules_res = await client.get("/api/v1/policy/rules")
        assert rules_res.status_code == 200
        rules = rules_res.json()
        assert len(rules) >= 5
        rule_codes = [r["rule_code"] for r in rules]
        assert "RULE_MAX_AUTO_REFUND" in rule_codes
