import hashlib
import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import verify_policy_execution_token
from app.db.audit_service import AuditService
from app.db.base import generate_uuid
from app.db.session import AsyncSessionLocal
from app.db.models import (
    Account,
    AuditLog,
    ConsumedPolicyToken,
    Dispute,
    Evidence,
    ExecutionLedger,
    Merchant,
    Transaction,
)
from app.mcp.schemas import (
    AuditLogItem,
    CalculateRefundEligibilityInput,
    CalculateRefundEligibilityOutput,
    CreateRefundRequestInput,
    CreateRefundRequestOutput,
    DisputeStatusOutput,
    EvidenceItem,
    GetAuditHistoryInput,
    GetAuditHistoryOutput,
    GetDisputeStatusInput,
    GetMerchantProfileInput,
    GetTransactionDetailsInput,
    MCPCallerIdentity,
    MerchantProfileOutput,
    PaymentHistoryItem,
    RetrieveDisputeEvidenceInput,
    RetrieveDisputeEvidenceOutput,
    SearchPaymentHistoryInput,
    SearchPaymentHistoryOutput,
    SubmitDisputeResolutionInput,
    SubmitDisputeResolutionOutput,
    TransactionDetailsOutput,
)
from app.security.pii_scrubber import PIIScrubber
from app.security.rbac import RBACManager, UserRole


class MCPExecutionError(Exception):
    def __init__(self, message: str, code: int = -32603, details: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.message = message
        self.code = code
        self.details = details or {}


class FinancialMCPServer:
    """
    Dedicated Model Context Protocol (MCP) server for SentinelPay.
    Exposes controlled financial tools with strict Pydantic schemas,
    identity-scoped authorization, signed policy token verification,
    and automatic tamper-evident audit logging.
    """

    TOOLS_REGISTRY = [
        {
            "name": "get_transaction_details",
            "description": "Retrieves comprehensive details of a specific payment transaction.",
            "inputSchema": GetTransactionDetailsInput.model_json_schema(),
        },
        {
            "name": "get_merchant_profile",
            "description": "Retrieves risk profile, tier, and dispute velocity of a merchant.",
            "inputSchema": GetMerchantProfileInput.model_json_schema(),
        },
        {
            "name": "get_dispute_status",
            "description": "Retrieves current status, stage, and AI/policy assessments of a dispute.",
            "inputSchema": GetDisputeStatusInput.model_json_schema(),
        },
        {
            "name": "search_payment_history",
            "description": "Searches past transactions for a customer or merchant.",
            "inputSchema": SearchPaymentHistoryInput.model_json_schema(),
        },
        {
            "name": "retrieve_dispute_evidence",
            "description": "Retrieves uploaded synthetic evidence files, extracted text, and authenticity scores.",
            "inputSchema": RetrieveDisputeEvidenceInput.model_json_schema(),
        },
        {
            "name": "calculate_refund_eligibility",
            "description": "Calculates remaining eligible balance and checks dispute limits for a transaction.",
            "inputSchema": CalculateRefundEligibilityInput.model_json_schema(),
        },
        {
            "name": "create_refund_request",
            "description": "Executes a sandboxed financial refund. STRICT REQUIREMENT: Must provide a signed, short-lived PolicyToken from PolicyEngine.",
            "inputSchema": CreateRefundRequestInput.model_json_schema(),
        },
        {
            "name": "submit_dispute_resolution",
            "description": "Finalizes the resolution stage of a dispute (REFUND_ISSUED, DISPUTE_REJECTED, ESCALATED_TO_HUMAN).",
            "inputSchema": SubmitDisputeResolutionInput.model_json_schema(),
        },
        {
            "name": "get_audit_history",
            "description": "Queries the cryptographically chained audit log and validates ledger integrity.",
            "inputSchema": GetAuditHistoryInput.model_json_schema(),
        },
    ]

    @classmethod
    def list_tools(cls) -> List[Dict[str, Any]]:
        return cls.TOOLS_REGISTRY

    # 1. get_transaction_details
    @classmethod
    async def get_transaction_details(
        cls, session: AsyncSession, caller: MCPCallerIdentity, args: Dict[str, Any]
    ) -> TransactionDetailsOutput:
        inp = GetTransactionDetailsInput(**args)
        query = select(Transaction).where(Transaction.id == inp.transaction_id)
        result = await session.execute(query)
        tx = result.scalar_one_or_none()
        if not tx:
            raise MCPExecutionError(f"Transaction '{inp.transaction_id}' not found", code=-32004)

        if caller.actor_role == UserRole.MERCHANT_ANALYST.value:
            if caller.merchant_id and tx.merchant_id != caller.merchant_id:
                raise MCPExecutionError("Tenant Isolation: Unauthorized access to transaction of another merchant", code=-32003)

        meta = json.loads(tx.metadata_json) if tx.metadata_json else {}
        eligible_balance = round(max(0.0, tx.amount - tx.refunded_amount), 2)

        return TransactionDetailsOutput(
            transaction_id=tx.id,
            merchant_id=tx.merchant_id,
            account_id=tx.account_id,
            amount=tx.amount,
            currency=tx.currency,
            status=tx.status,
            payment_method=tx.payment_method,
            refunded_amount=tx.refunded_amount,
            eligible_refund_balance=eligible_balance,
            idempotency_key=tx.idempotency_key,
            created_at=tx.created_at.isoformat() if hasattr(tx.created_at, "isoformat") else str(tx.created_at),
            metadata=meta,
        )

    # 2. get_merchant_profile
    @classmethod
    async def get_merchant_profile(
        cls, session: AsyncSession, caller: MCPCallerIdentity, args: Dict[str, Any]
    ) -> MerchantProfileOutput:
        inp = GetMerchantProfileInput(**args)
        if caller.actor_role == UserRole.MERCHANT_ANALYST.value:
            if caller.merchant_id and inp.merchant_id != caller.merchant_id:
                raise MCPExecutionError("Tenant Isolation: Cannot access profile of another merchant", code=-32003)

        query = select(Merchant).where(Merchant.id == inp.merchant_id)
        result = await session.execute(query)
        merchant = result.scalar_one_or_none()
        if not merchant:
            raise MCPExecutionError(f"Merchant '{inp.merchant_id}' not found", code=-32004)

        return MerchantProfileOutput(
            merchant_id=merchant.id,
            name=merchant.name,
            tier=merchant.tier,
            risk_score=merchant.risk_score,
            status=merchant.status,
            dispute_rate=merchant.dispute_rate,
            payout_frozen=merchant.payout_frozen,
        )

    # 3. get_dispute_status
    @classmethod
    async def get_dispute_status(
        cls, session: AsyncSession, caller: MCPCallerIdentity, args: Dict[str, Any]
    ) -> DisputeStatusOutput:
        inp = GetDisputeStatusInput(**args)
        query = select(Dispute).where(Dispute.id == inp.dispute_id)
        result = await session.execute(query)
        disp = result.scalar_one_or_none()
        if not disp:
            raise MCPExecutionError(f"Dispute '{inp.dispute_id}' not found", code=-32004)

        if caller.actor_role == UserRole.MERCHANT_ANALYST.value:
            if caller.merchant_id and disp.merchant_id != caller.merchant_id:
                raise MCPExecutionError("Tenant Isolation: Cannot access dispute of another merchant", code=-32003)

        return DisputeStatusOutput(
            dispute_id=disp.id,
            transaction_id=disp.transaction_id,
            merchant_id=disp.merchant_id,
            dispute_type=disp.dispute_type,
            disputed_amount=disp.disputed_amount,
            status=disp.status,
            current_stage=disp.current_stage,
            ai_confidence=disp.ai_confidence,
            policy_verdict=disp.policy_verdict,
            human_required=disp.human_required,
            final_resolution=disp.final_resolution,
            created_at=disp.created_at.isoformat() if hasattr(disp.created_at, "isoformat") else str(disp.created_at),
        )

    # 4. search_payment_history
    @classmethod
    async def search_payment_history(
        cls, session: AsyncSession, caller: MCPCallerIdentity, args: Dict[str, Any]
    ) -> SearchPaymentHistoryOutput:
        inp = SearchPaymentHistoryInput(**args)
        query = select(Transaction)

        if caller.actor_role == UserRole.MERCHANT_ANALYST.value and caller.merchant_id:
            query = query.where(Transaction.merchant_id == caller.merchant_id)
        elif inp.merchant_id:
            query = query.where(Transaction.merchant_id == inp.merchant_id)

        if inp.customer_id:
            # Join with account
            query = query.join(Account).where(Account.customer_id == inp.customer_id)
        if inp.status:
            query = query.where(Transaction.status == inp.status)

        query = query.order_by(Transaction.created_at.desc()).limit(inp.limit)
        result = await session.execute(query)
        records = result.scalars().all()

        items = [
            PaymentHistoryItem(
                transaction_id=tx.id,
                amount=tx.amount,
                currency=tx.currency,
                status=tx.status,
                created_at=tx.created_at.isoformat() if hasattr(tx.created_at, "isoformat") else str(tx.created_at),
            )
            for tx in records
        ]
        return SearchPaymentHistoryOutput(transactions=items, total_found=len(items))

    # 5. retrieve_dispute_evidence
    @classmethod
    async def retrieve_dispute_evidence(
        cls, session: AsyncSession, caller: MCPCallerIdentity, args: Dict[str, Any]
    ) -> RetrieveDisputeEvidenceOutput:
        inp = RetrieveDisputeEvidenceInput(**args)
        query = select(Evidence).where(Evidence.dispute_id == inp.dispute_id)
        result = await session.execute(query)
        evidence_list = result.scalars().all()

        items = [
            EvidenceItem(
                evidence_id=ev.id,
                document_type=ev.document_type,
                filename=ev.filename,
                file_hash=ev.file_hash,
                extracted_text=ev.extracted_text,
                authenticity_score=ev.authenticity_score,
                is_verified=ev.is_verified,
            )
            for ev in evidence_list
        ]
        avg_score = sum(ev.authenticity_score for ev in items) / len(items) if items else 1.0

        return RetrieveDisputeEvidenceOutput(
            dispute_id=inp.dispute_id,
            evidence_items=items,
            average_authenticity_score=round(avg_score, 2),
        )

    # 6. calculate_refund_eligibility
    @classmethod
    async def calculate_refund_eligibility(
        cls, session: AsyncSession, caller: MCPCallerIdentity, args: Dict[str, Any]
    ) -> CalculateRefundEligibilityOutput:
        inp = CalculateRefundEligibilityInput(**args)
        tx_query = select(Transaction).where(Transaction.id == inp.transaction_id)
        tx_res = await session.execute(tx_query)
        tx = tx_res.scalar_one_or_none()
        if not tx:
            raise MCPExecutionError(f"Transaction '{inp.transaction_id}' not found", code=-32004)

        remaining = round(max(0.0, tx.amount - tx.refunded_amount), 2)
        requested = round(inp.requested_refund_amount, 2)

        if tx.status not in ["SETTLED", "PARTIALLY_REFUNDED"]:
            return CalculateRefundEligibilityOutput(
                transaction_id=tx.id,
                is_eligible=False,
                requested_amount=requested,
                original_amount=tx.amount,
                already_refunded=tx.refunded_amount,
                remaining_balance=remaining,
                rejection_reason=f"Transaction is in non-refundable state: {tx.status}",
            )

        if requested > remaining:
            return CalculateRefundEligibilityOutput(
                transaction_id=tx.id,
                is_eligible=False,
                requested_amount=requested,
                original_amount=tx.amount,
                already_refunded=tx.refunded_amount,
                remaining_balance=remaining,
                rejection_reason=f"Requested refund (₹{requested}) exceeds remaining balance (₹{remaining})",
            )

        return CalculateRefundEligibilityOutput(
            transaction_id=tx.id,
            is_eligible=True,
            requested_amount=requested,
            original_amount=tx.amount,
            already_refunded=tx.refunded_amount,
            remaining_balance=remaining,
            rejection_reason=None,
        )

    # 7. create_refund_request (MUTATION - REQUIRES SIGNED POLICY TOKEN)
    @classmethod
    async def create_refund_request(
        cls, session: AsyncSession, caller: MCPCallerIdentity, args: Dict[str, Any]
    ) -> CreateRefundRequestOutput:
        inp = CreateRefundRequestInput(**args)

        # 1. Verify signed policy token
        try:
            token_payload = verify_policy_execution_token(inp.policy_token)
        except Exception as e:
            raise MCPExecutionError(f"Policy Token Verification Failed: {str(e)}", code=-32001)

        # 2. Replay Protection: Verify token has not already been consumed (Single-Use Token Violation)
        token_hash = hashlib.sha256(inp.policy_token.encode("utf-8")).hexdigest()
        consumed_query = select(ConsumedPolicyToken).where(ConsumedPolicyToken.token_hash == token_hash)
        existing_consumed = (await session.execute(consumed_query)).scalar_one_or_none()
        if existing_consumed:
            raise MCPExecutionError(
                f"Replay Violation: Policy execution token has already been consumed (single-use token violation). Token hash: {token_hash[:16]}...",
                code=-32006,
            )

        # 3. Strict semantic claim validation
        if token_payload.get("sub") != inp.dispute_id:
            raise MCPExecutionError("Token dispute_id mismatch", code=-32002)
        if token_payload.get("transaction_id") != inp.transaction_id:
            raise MCPExecutionError("Token transaction_id mismatch", code=-32002)
        if round(float(token_payload.get("amount", 0)), 2) != round(inp.amount, 2):
            raise MCPExecutionError(f"Token amount mismatch: token specifies {token_payload.get('amount')}, requested {inp.amount}", code=-32002)
        if token_payload.get("idempotency_key") != inp.idempotency_key:
            raise MCPExecutionError("Token idempotency_key mismatch", code=-32002)
        if token_payload.get("action_type") not in ("REFUND", "PROVISIONAL_CREDIT", "REVERSAL"):
            raise MCPExecutionError("Token action_type mismatch: invalid financial action", code=-32002)

        # 4. Check duplicate execution in ledger
        ledger_query = select(ExecutionLedger).where(ExecutionLedger.idempotency_key == inp.idempotency_key)
        existing_exec = (await session.execute(ledger_query)).scalar_one_or_none()
        if existing_exec:
            raise MCPExecutionError(f"Idempotency violation: execution already recorded for key '{inp.idempotency_key}'", code=-32005)

        # 5. Fetch and update transaction
        tx_query = select(Transaction).where(Transaction.id == inp.transaction_id).with_for_update()
        tx = (await session.execute(tx_query)).scalar_one_or_none()
        if not tx:
            raise MCPExecutionError(f"Transaction '{inp.transaction_id}' not found", code=-32004)

        if token_payload.get("merchant_id") and token_payload.get("merchant_id") != tx.merchant_id:
            raise MCPExecutionError("Token merchant_id mismatch: token merchant does not match transaction", code=-32002)

        new_refunded = round(tx.refunded_amount + inp.amount, 2)
        if new_refunded > tx.amount:
            raise MCPExecutionError("Refund amount exceeds total transaction amount", code=-32002)

        tx.refunded_amount = new_refunded
        tx.status = "REFUNDED" if new_refunded >= tx.amount else "PARTIALLY_REFUNDED"

        # 6. Ensure parent dispute record exists for foreign key constraint compliance
        execution_id = generate_uuid()
        now_iso = datetime.now(timezone.utc).isoformat()
        mcp_ref = f"mcp_ref_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}_{execution_id[:8]}"

        disp_query = select(Dispute).where(Dispute.id == inp.dispute_id)
        disp = (await session.execute(disp_query)).scalar_one_or_none()
        if not disp:
            disp = Dispute(
                id=inp.dispute_id,
                transaction_id=inp.transaction_id,
                merchant_id=tx.merchant_id,
                dispute_type="unauthorized_transaction",
                disputed_amount=inp.amount,
                status="RESOLVED_REFUNDED",
                current_stage="COMPLETED",
                final_resolution=f"Refund of ₹{inp.amount:.2f} executed via MCP Gateway ({mcp_ref})",
            )
            session.add(disp)
        else:
            disp.status = "RESOLVED_REFUNDED"
            disp.current_stage = "COMPLETED"
            disp.final_resolution = f"Refund of ₹{inp.amount:.2f} executed via MCP Gateway ({mcp_ref})"

        # 7. Atomically consume policy token and record execution
        consumed_entry = ConsumedPolicyToken(
            token_hash=token_hash,
            dispute_id=inp.dispute_id,
            transaction_id=inp.transaction_id,
            merchant_id=tx.merchant_id,
            amount=inp.amount,
            action_type="REFUND",
            policy_version=int(token_payload.get("policy_version", 1)),
            idempotency_key=inp.idempotency_key,
            consumed_by=caller.actor_id,
            consumed_at=now_iso,
        )
        session.add(consumed_entry)

        ledger_entry = ExecutionLedger(
            id=execution_id,
            dispute_id=inp.dispute_id,
            transaction_id=inp.transaction_id,
            action_type="REFUND",
            amount=inp.amount,
            status="SUCCESS",
            idempotency_key=inp.idempotency_key,
            mcp_execution_ref=mcp_ref,
            signed_token_hash=token_hash,
        )
        session.add(ledger_entry)

        try:
            await session.commit()
        except IntegrityError as ie:
            await session.rollback()
            err_str = str(ie)
            if "consumed_policy_tokens" in err_str or "token_hash" in err_str:
                raise MCPExecutionError(
                    f"Replay Violation: Policy execution token has already been consumed (single-use token violation). Token hash: {token_hash[:16]}...",
                    code=-32006,
                )
            elif "execution_ledger" in err_str or "idempotency_key" in err_str:
                raise MCPExecutionError(
                    f"Idempotency violation: execution already recorded for key '{inp.idempotency_key}'",
                    code=-32005,
                )
            raise MCPExecutionError(f"Database integrity violation: {err_str}", code=-32005)

        return CreateRefundRequestOutput(
            success=True,
            execution_id=execution_id,
            dispute_id=inp.dispute_id,
            transaction_id=inp.transaction_id,
            refunded_amount=inp.amount,
            status="SUCCESS",
            idempotency_key=inp.idempotency_key,
            executed_at=datetime.now(timezone.utc).isoformat(),
            message=f"Refund of ₹{inp.amount:.2f} executed successfully in sandbox ledger",
        )

    # 8. submit_dispute_resolution
    @classmethod
    async def submit_dispute_resolution(
        cls, session: AsyncSession, caller: MCPCallerIdentity, args: Dict[str, Any]
    ) -> SubmitDisputeResolutionOutput:
        inp = SubmitDisputeResolutionInput(**args)
        disp_query = select(Dispute).where(Dispute.id == inp.dispute_id)
        disp = (await session.execute(disp_query)).scalar_one_or_none()
        if not disp:
            raise MCPExecutionError(f"Dispute '{inp.dispute_id}' not found", code=-32004)

        if caller.actor_role == UserRole.MERCHANT_ANALYST.value:
            raise MCPExecutionError("Merchant analysts cannot finalize dispute resolutions", code=-32003)

        disp.final_resolution = inp.resolution
        disp.policy_reason = inp.reason
        if inp.resolution == "DISPUTE_REJECTED":
            disp.status = "RESOLVED_REJECTED"
            disp.current_stage = "COMPLETED"
        elif inp.resolution == "ESCALATED_TO_HUMAN":
            disp.status = "PENDING_HUMAN_APPROVAL"
            disp.current_stage = "APPROVAL_QUEUE"
            disp.human_required = True

        await session.commit()
        return DisputeResolutionOutput(
            dispute_id=disp.id,
            status=disp.status,
            resolution=disp.final_resolution or inp.resolution,
            updated_at=datetime.now(timezone.utc).isoformat(),
            message=f"Dispute resolution updated to {inp.resolution}",
        )

    # 9. get_audit_history
    @classmethod
    async def get_audit_history(
        cls, session: AsyncSession, caller: MCPCallerIdentity, args: Dict[str, Any]
    ) -> GetAuditHistoryOutput:
        inp = GetAuditHistoryInput(**args)
        query = select(AuditLog)
        if inp.trace_id:
            query = query.where(AuditLog.trace_id == inp.trace_id)
        query = query.order_by(AuditLog.created_at.desc()).limit(inp.limit)

        result = await session.execute(query)
        logs = result.scalars().all()

        is_valid, tamper_msg = await AuditService.verify_chain(session)

        items = [
            AuditLogItem(
                id=log.id,
                trace_id=log.trace_id,
                event_type=log.event_type,
                actor_type=log.actor_type,
                actor_id=log.actor_id,
                prev_hash=log.prev_hash,
                current_hash=log.current_hash,
                created_at=log.created_at,
            )
            for log in logs
        ]
        return AuditHistoryOutput(logs=items, chain_tampered=not is_valid, tamper_details=tamper_msg)

    # Dispatcher with automatic audit interception
    @classmethod
    async def call_tool(
        cls, session: AsyncSession, tool_name: str, arguments: Dict[str, Any], caller: MCPCallerIdentity
    ) -> Dict[str, Any]:
        tool_methods = {
            "get_transaction_details": cls.get_transaction_details,
            "get_merchant_profile": cls.get_merchant_profile,
            "get_dispute_status": cls.get_dispute_status,
            "search_payment_history": cls.search_payment_history,
            "retrieve_dispute_evidence": cls.retrieve_dispute_evidence,
            "calculate_refund_eligibility": cls.calculate_refund_eligibility,
            "create_refund_request": cls.create_refund_request,
            "submit_dispute_resolution": cls.submit_dispute_resolution,
            "get_audit_history": cls.get_audit_history,
        }

        if tool_name not in tool_methods:
            raise MCPExecutionError(f"Unknown MCP tool: '{tool_name}'", code=-32601)

        # Intercept and append audit event
        scrubbed_args = PIIScrubber.scrub_payload(arguments)
        await AuditService.append_event(
            session=session,
            trace_id=caller.trace_id,
            event_type=f"MCP_TOOL_INVOKED:{tool_name}",
            actor_type="MCP_CLIENT",
            actor_id=caller.actor_id,
            payload={
                "tool_name": tool_name,
                "caller_role": caller.actor_role,
                "merchant_id": caller.merchant_id,
                "arguments": scrubbed_args,
            },
        )

        try:
            handler = tool_methods[tool_name]
            output = await handler(session=session, caller=caller, args=arguments)
            output_dict = output.model_dump()

            await AuditService.append_event(
                session=session,
                trace_id=caller.trace_id,
                event_type=f"MCP_TOOL_SUCCESS:{tool_name}",
                actor_type="MCP_SERVER",
                actor_id="mcp_gateway",
                payload={"tool_name": tool_name, "success": True},
            )
            return {"content": [{"type": "text", "text": json.dumps(output_dict)}], "isError": False}

        except MCPExecutionError as err:
            # P1 Hardening: Explicitly rollback any failed/dirty transaction state
            await session.rollback()
            try:
                await AuditService.append_event(
                    session=session,
                    trace_id=caller.trace_id,
                    event_type=f"MCP_TOOL_ERROR:{tool_name}",
                    actor_type="MCP_SERVER",
                    actor_id="mcp_gateway",
                    payload={"tool_name": tool_name, "error": err.message, "code": err.code},
                )
            except Exception:
                # Dedicated clean session fallback to ensure audit event is never lost
                async with AsyncSessionLocal() as audit_session:
                    await AuditService.append_event(
                        session=audit_session,
                        trace_id=caller.trace_id,
                        event_type=f"MCP_TOOL_ERROR:{tool_name}",
                        actor_type="MCP_SERVER",
                        actor_id="mcp_gateway",
                        payload={"tool_name": tool_name, "error": err.message, "code": err.code},
                    )
            return {"content": [{"type": "text", "text": json.dumps({"error": err.message, "code": err.code})}], "isError": True}

        except Exception as exc:
            # P1 Hardening: Explicitly rollback any failed/dirty transaction state
            await session.rollback()
            try:
                await AuditService.append_event(
                    session=session,
                    trace_id=caller.trace_id,
                    event_type=f"MCP_TOOL_EXCEPTION:{tool_name}",
                    actor_type="MCP_SERVER",
                    actor_id="mcp_gateway",
                    payload={"tool_name": tool_name, "exception": str(exc)},
                )
            except Exception:
                # Dedicated clean session fallback
                async with AsyncSessionLocal() as audit_session:
                    await AuditService.append_event(
                        session=audit_session,
                        trace_id=caller.trace_id,
                        event_type=f"MCP_TOOL_EXCEPTION:{tool_name}",
                        actor_type="MCP_SERVER",
                        actor_id="mcp_gateway",
                        payload={"tool_name": tool_name, "exception": str(exc)},
                    )
            return {"content": [{"type": "text", "text": json.dumps({"error": f"Internal execution failure: {str(exc)}", "code": -32603})}], "isError": True}
