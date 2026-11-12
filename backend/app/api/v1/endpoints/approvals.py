from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.checkpoint import format_thread_id
from app.agents.graph import dispute_orchestrator
from app.api.deps import get_current_actor, require_role
from app.db.models import ApprovalRequest, Dispute
from app.db.session import get_db
from app.policy.engine import DeterministicPolicyEngine
from app.security.rbac import AuthenticatedActor, UserRole

router = APIRouter()


class ResolveApprovalRequest(BaseModel):
    action: str = Field(..., description="APPROVE or REJECT")
    review_notes: str


class ApprovalResponse(BaseModel):
    id: str
    dispute_id: str
    amount: float
    required_role: str
    status: str
    requester_agent: str
    approved_by: Optional[str] = None
    review_notes: Optional[str] = None
    created_at: str


@router.get("", response_model=List[ApprovalResponse])
async def list_pending_approvals(
    actor: AuthenticatedActor = Depends(get_current_actor),
    session: AsyncSession = Depends(get_db),
):
    query = select(ApprovalRequest).where(ApprovalRequest.status == "PENDING").order_by(ApprovalRequest.created_at.desc())
    result = await session.execute(query)
    approvals = result.scalars().all()

    return [
        ApprovalResponse(
            id=appr.id,
            dispute_id=appr.dispute_id,
            amount=appr.amount,
            required_role=appr.required_role,
            status=appr.status,
            requester_agent=appr.requester_agent,
            approved_by=appr.approved_by,
            review_notes=appr.review_notes,
            created_at=appr.created_at.isoformat() if hasattr(appr.created_at, "isoformat") else str(appr.created_at),
        )
        for appr in approvals
    ]


@router.post("/{approval_id}/resolve")
async def resolve_approval(
    approval_id: str,
    req: ResolveApprovalRequest,
    actor: AuthenticatedActor = Depends(require_role([UserRole.RISK_LEAD, UserRole.FIN_OPS_ADMIN])),
    session: AsyncSession = Depends(get_db),
):
    appr_q = select(ApprovalRequest).where(ApprovalRequest.id == approval_id)
    appr = (await session.execute(appr_q)).scalar_one_or_none()
    if not appr:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Approval request not found")

    if appr.status != "PENDING":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Approval request already in status '{appr.status}'")

    disp_q = select(Dispute).where(Dispute.id == appr.dispute_id)
    disp = (await session.execute(disp_q)).scalar_one_or_none()
    if not disp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dispute not found")

    now_iso = datetime.now(timezone.utc).isoformat()
    action_upper = req.action.upper()

    if action_upper == "APPROVE":
        idempotency_key = f"idemp_appr_{disp.id[:8]}_{int(datetime.now(timezone.utc).timestamp())}"
        # 1. Authorize and issue signed PolicyToken
        policy_summary = DeterministicPolicyEngine.authorize_human_approval(
            dispute_id=disp.id,
            transaction_id=disp.transaction_id,
            merchant_id=disp.merchant_id,
            amount=appr.amount,
            idempotency_key=idempotency_key,
            approver_id=actor.user_id,
            approver_role=actor.role.value,
        )

        if not policy_summary.execution_permitted or not policy_summary.policy_token:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Policy Engine rejected human authorization token issuance")

        # 2. Resume LangGraph workflow
        config = {"configurable": {"thread_id": format_thread_id(disp.merchant_id, disp.id)}}
        resume_payload = {
            "human_approval_status": "APPROVED",
            "human_approver_id": actor.user_id,
            "human_approver_role": actor.role.value,
            "status": "APPROVED_BY_HUMAN",
            "idempotency_key": idempotency_key,
            "policy_engine_result": policy_summary.model_dump(),
        }
        final_state = await dispute_orchestrator.ainvoke(resume_payload, config=config)

        # 3. Update DB records
        appr.status = "APPROVED"
        appr.approved_by = f"{actor.role.value}:{actor.user_id}"
        appr.review_notes = req.review_notes
        appr.resolved_at = now_iso

        disp.status = final_state.get("status", "RESOLVED_REFUNDED")
        disp.current_stage = "COMPLETED"
        disp.final_resolution = f"Approved by {actor.role.value} ({actor.user_id}): {req.review_notes}"
        await session.commit()

        return {
            "success": True,
            "dispute_id": disp.id,
            "approval_status": "APPROVED",
            "execution_result": final_state.get("execution_result"),
            "message": "Human approval processed. Refund executed successfully via MCP.",
        }

    elif action_upper == "REJECT":
        appr.status = "REJECTED"
        appr.approved_by = f"{actor.role.value}:{actor.user_id}"
        appr.review_notes = req.review_notes
        appr.resolved_at = now_iso

        disp.status = "RESOLVED_REJECTED"
        disp.current_stage = "COMPLETED"
        disp.final_resolution = f"Rejected by {actor.role.value}: {req.review_notes}"
        await session.commit()

        return {
            "success": True,
            "dispute_id": disp.id,
            "approval_status": "REJECTED",
            "message": "Dispute rejected by risk lead.",
        }

    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Action must be APPROVE or REJECT")
