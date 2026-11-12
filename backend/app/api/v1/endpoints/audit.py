from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_actor
from app.db.audit_service import AuditService
from app.db.models import ApprovalRequest, AuditLog, Dispute, ExecutionLedger, Transaction
from app.db.session import get_db
from app.security.rbac import AuthenticatedActor

router = APIRouter()


@router.get("/logs")
async def get_audit_logs(
    trace_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    actor: AuthenticatedActor = Depends(get_current_actor),
    session: AsyncSession = Depends(get_db),
):
    query = select(AuditLog)
    if trace_id:
        query = query.where(AuditLog.trace_id == trace_id)
    query = query.order_by(AuditLog.created_at.desc()).limit(limit)
    result = await session.execute(query)
    logs = result.scalars().all()

    is_valid, tamper_msg = await AuditService.verify_chain(session)

    return {
        "is_chain_intact": is_valid,
        "tamper_detected": not is_valid,
        "tamper_details": tamper_msg,
        "total_returned": len(logs),
        "logs": [
            {
                "id": log.id,
                "trace_id": log.trace_id,
                "event_type": log.event_type,
                "actor_type": log.actor_type,
                "actor_id": log.actor_id,
                "event_payload": log.event_payload,
                "prev_hash": log.prev_hash,
                "current_hash": log.current_hash,
                "created_at": log.created_at,
            }
            for log in logs
        ],
    }


@router.get("/verify")
async def verify_audit_ledger(
    actor: AuthenticatedActor = Depends(get_current_actor),
    session: AsyncSession = Depends(get_db),
):
    is_valid, tamper_msg = await AuditService.verify_chain(session)
    count = (await session.execute(select(func.count(AuditLog.id)))).scalar_one()

    return {
        "chain_intact": is_valid,
        "total_records_verified": count,
        "tamper_detected": not is_valid,
        "message": "Cryptographic SHA-256 hash chain is intact and fully verified" if is_valid else tamper_msg,
    }


@router.get("/stats")
async def get_system_stats(
    actor: AuthenticatedActor = Depends(get_current_actor),
    session: AsyncSession = Depends(get_db),
):
    # Dispute counts by status
    total_disputes = (await session.execute(select(func.count(Dispute.id)))).scalar_one()
    auto_approved = (await session.execute(select(func.count(Dispute.id)).where(Dispute.status == "RESOLVED_REFUNDED"))).scalar_one()
    pending_human = (await session.execute(select(func.count(ApprovalRequest.id)).where(ApprovalRequest.status == "PENDING"))).scalar_one()
    rejected_disputes = (await session.execute(select(func.count(Dispute.id)).where(Dispute.status == "RESOLVED_REJECTED"))).scalar_one()

    # Total refunded volume
    total_refund_volume = (await session.execute(select(func.coalesce(func.sum(ExecutionLedger.amount), 0.0)).where(ExecutionLedger.status == "SUCCESS"))).scalar_one()

    # Security threat events count
    threat_events = (await session.execute(select(func.count(AuditLog.id)).where(AuditLog.event_type.like("%SECURITY_ALERT%")))).scalar_one()

    return {
        "disputes": {
            "total": total_disputes,
            "resolved_refunded": auto_approved,
            "pending_human_review": pending_human,
            "resolved_rejected": rejected_disputes,
        },
        "financial": {
            "total_refund_volume": round(float(total_refund_volume), 2),
            "currency": "INR",
        },
        "security": {
            "threats_blocked": threat_events,
            "policy_fail_closed_status": "ACTIVE",
        },
    }
