import json
import pytest
from app.core.security import create_policy_execution_token
from app.db.audit_service import AuditService
from app.db.session import AsyncSessionLocal
from app.mcp.schemas import MCPCallerIdentity
from app.mcp.server import FinancialMCPServer
from app.security.rbac import UserRole


@pytest.fixture
def agent_caller() -> MCPCallerIdentity:
    return MCPCallerIdentity(
        actor_id="agent_investigator_01",
        actor_role="AGENT",
        trace_id="trace_test_mcp_001",
    )


@pytest.fixture
def merchant_caller() -> MCPCallerIdentity:
    return MCPCallerIdentity(
        actor_id="merchant_analyst_apex",
        actor_role=UserRole.MERCHANT_ANALYST.value,
        merchant_id="mch_apex_01",
        trace_id="trace_test_mcp_002",
    )


@pytest.mark.asyncio
async def test_mcp_list_tools():
    tools = FinancialMCPServer.list_tools()
    assert len(tools) == 9
    tool_names = [t["name"] for t in tools]
    assert "get_transaction_details" in tool_names
    assert "create_refund_request" in tool_names
    assert "calculate_refund_eligibility" in tool_names
    assert "get_audit_history" in tool_names


@pytest.mark.asyncio
async def test_mcp_get_transaction_details(agent_caller):
    async with AsyncSessionLocal() as session:
        res = await FinancialMCPServer.call_tool(
            session=session,
            tool_name="get_transaction_details",
            arguments={"transaction_id": "txn_1001"},
            caller=agent_caller,
        )
        assert res["isError"] is False
        data = json.loads(res["content"][0]["text"])
        assert data["transaction_id"] == "txn_1001"
        assert data["amount"] == 750.0
        assert data["merchant_id"] == "mch_quickbite_02"


@pytest.mark.asyncio
async def test_mcp_tenant_isolation_violation(merchant_caller):
    async with AsyncSessionLocal() as session:
        # merchant_caller belongs to mch_apex_01; attempts to read txn_1001 (owned by mch_quickbite_02)
        res = await FinancialMCPServer.call_tool(
            session=session,
            tool_name="get_transaction_details",
            arguments={"transaction_id": "txn_1001"},
            caller=merchant_caller,
        )
        assert res["isError"] is True
        error_data = json.loads(res["content"][0]["text"])
        assert "Tenant Isolation" in error_data["error"]


@pytest.mark.asyncio
async def test_mcp_refund_rejected_without_signed_policy_token(agent_caller):
    async with AsyncSessionLocal() as session:
        # Agent attempts to execute refund directly without policy engine authorization
        res = await FinancialMCPServer.call_tool(
            session=session,
            tool_name="create_refund_request",
            arguments={
                "dispute_id": "disp_unauthorized_99",
                "transaction_id": "txn_1001",
                "amount": 750.0,
                "idempotency_key": "idemp_unauth_001",
                "policy_token": "malicious_fake_jwt_token_string",
            },
            caller=agent_caller,
        )
        assert res["isError"] is True
        error_data = json.loads(res["content"][0]["text"])
        assert "Policy Token Verification Failed" in error_data["error"]


@pytest.mark.asyncio
async def test_mcp_authorized_refund_and_idempotency_enforcement(agent_caller):
    import uuid
    async with AsyncSessionLocal() as session:
        idempotency_key = f"idemp_{uuid.uuid4().hex[:10]}"
        amount = 100.0
        dispute_id = f"disp_{uuid.uuid4().hex[:8]}"
        transaction_id = "txn_1001"
        merchant_id = "mch_quickbite_02"

        # 1. Generate legitimate PolicyToken
        valid_token = create_policy_execution_token(
            dispute_id=dispute_id,
            transaction_id=transaction_id,
            amount=amount,
            action_type="REFUND",
            idempotency_key=idempotency_key,
            merchant_id=merchant_id,
            approved_by="POLICY_ENGINE",
            role="POLICY_ENGINE",
        )

        # 2. Execute refund via MCP
        res = await FinancialMCPServer.call_tool(
            session=session,
            tool_name="create_refund_request",
            arguments={
                "dispute_id": dispute_id,
                "transaction_id": transaction_id,
                "amount": amount,
                "idempotency_key": idempotency_key,
                "policy_token": valid_token,
            },
            caller=agent_caller,
        )
        assert res["isError"] is False
        exec_data = json.loads(res["content"][0]["text"])
        assert exec_data["success"] is True
        assert exec_data["refunded_amount"] == 100.0

        # 3. Attempt duplicate execution with same idempotency key (must fail)
        replay_res = await FinancialMCPServer.call_tool(
            session=session,
            tool_name="create_refund_request",
            arguments={
                "dispute_id": dispute_id,
                "transaction_id": transaction_id,
                "amount": amount,
                "idempotency_key": idempotency_key,
                "policy_token": valid_token,
            },
            caller=agent_caller,
        )
        assert replay_res["isError"] is True
        replay_data = json.loads(replay_res["content"][0]["text"])
        assert "Idempotency violation" in replay_data["error"]

        # 4. Verify cryptographic audit chain integrity
        is_chain_valid, err = await AuditService.verify_chain(session)
        assert is_chain_valid is True
        assert err is None
