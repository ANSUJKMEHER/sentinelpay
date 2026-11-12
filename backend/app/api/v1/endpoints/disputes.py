import hashlib
import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.graph import dispute_orchestrator
from app.agents.state import create_initial_state
from app.api.deps import get_current_actor
from app.db.base import generate_uuid
from app.db.models import Account, Dispute, Evidence, Transaction
from app.db.session import get_db
from app.security.pii_scrubber import PIIScrubber
from app.security.prompt_injection import PromptInjectionShield
from app.security.rbac import AuthenticatedActor, RBACManager, UserRole

router = APIRouter()


class CreateDisputeRequest(BaseModel):
    transaction_id: str
    dispute_type: str = Field(..., description="unauthorized_transaction, goods_not_received, duplicate_charge, etc.")
    disputed_amount: float = Field(..., gt=0)
    claim_reason: str
    evidence_notes: Optional[str] = None


class EvidenceUploadRequest(BaseModel):
    document_type: str = Field(..., description="INVOICE, DELIVERY_RECEIPT, TRACKING_PROOF, COMMUNICATION_LOG")
    filename: str
    extracted_text: str
    authenticity_score: float = Field(0.95, ge=0.0, le=1.0)


class DisputeResponse(BaseModel):
    id: str
    transaction_id: str
    merchant_id: str
    dispute_type: str
    disputed_amount: float
    status: str
    current_stage: str
    ai_confidence: Optional[float] = None
    ai_recommendation: Optional[str] = None
    policy_verdict: Optional[str] = None
    policy_reason: Optional[str] = None
    human_required: bool
    final_resolution: Optional[str] = None
    created_at: str
    updated_at: str


@router.post("", response_model=DisputeResponse)
async def create_dispute(
    req: CreateDisputeRequest,
    actor: AuthenticatedActor = Depends(get_current_actor),
    session: AsyncSession = Depends(get_db),
):
    # 1. Fetch transaction
    tx_q = select(Transaction).where(Transaction.id == req.transaction_id)
    tx = (await session.execute(tx_q)).scalar_one_or_none()
    if not tx:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Transaction '{req.transaction_id}' not found")

    # 2. Enforce Tenant Isolation
    if not RBACManager.verify_tenant_isolation(actor, tx.merchant_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tenant Isolation Violation: Cannot file dispute for another merchant's transaction",
        )

    # 3. Security Screening: Direct Prompt Injection Check
    injection_res = PromptInjectionShield.scan_and_sanitize(req.claim_reason)
    if injection_res.threat_detected:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Security Rejection: Malicious prompt injection pattern detected ({injection_res.threat_type})",
        )

    # 4. PII Redaction
    sanitized_reason = PIIScrubber.scrub_text(injection_res.sanitized_text)

    # 5. Create Dispute Record
    dispute_id = f"disp_{uuid.uuid4().hex[:10]}"
    dispute = Dispute(
        id=dispute_id,
        transaction_id=tx.id,
        merchant_id=tx.merchant_id,
        dispute_type=req.dispute_type,
        disputed_amount=round(req.disputed_amount, 2),
        status="INTAKE",
        current_stage="INTAKE",
        policy_reason=f"Claim filed: {sanitized_reason[:150]}",
        human_required=False,
    )
    session.add(dispute)
    await session.commit()
    await session.refresh(dispute)

    return DisputeResponse(
        id=dispute.id,
        transaction_id=dispute.transaction_id,
        merchant_id=dispute.merchant_id,
        dispute_type=dispute.dispute_type,
        disputed_amount=dispute.disputed_amount,
        status=dispute.status,
        current_stage=dispute.current_stage,
        ai_confidence=dispute.ai_confidence,
        ai_recommendation=dispute.ai_recommendation,
        policy_verdict=dispute.policy_verdict,
        policy_reason=dispute.policy_reason,
        human_required=dispute.human_required,
        final_resolution=dispute.final_resolution,
        created_at=dispute.created_at.isoformat() if hasattr(dispute.created_at, "isoformat") else str(dispute.created_at),
        updated_at=dispute.updated_at.isoformat() if hasattr(dispute.updated_at, "isoformat") else str(dispute.updated_at),
    )


@router.get("", response_model=List[DisputeResponse])
async def list_disputes(
    status_filter: Optional[str] = Query(None, alias="status"),
    merchant_id: Optional[str] = Query(None),
    limit: int = Query(25, ge=1, le=100),
    actor: AuthenticatedActor = Depends(get_current_actor),
    session: AsyncSession = Depends(get_db),
):
    query = select(Dispute)

    if actor.role == UserRole.MERCHANT_ANALYST:
        if not actor.merchant_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Merchant identity required")
        query = query.where(Dispute.merchant_id == actor.merchant_id)
    elif merchant_id:
        query = query.where(Dispute.merchant_id == merchant_id)

    if status_filter:
        query = query.where(Dispute.status == status_filter)

    query = query.order_by(Dispute.created_at.desc()).limit(limit)
    result = await session.execute(query)
    disputes = result.scalars().all()

    return [
        DisputeResponse(
            id=d.id,
            transaction_id=d.transaction_id,
            merchant_id=d.merchant_id,
            dispute_type=d.dispute_type,
            disputed_amount=d.disputed_amount,
            status=d.status,
            current_stage=d.current_stage,
            ai_confidence=d.ai_confidence,
            ai_recommendation=d.ai_recommendation,
            policy_verdict=d.policy_verdict,
            policy_reason=d.policy_reason,
            human_required=d.human_required,
            final_resolution=d.final_resolution,
            created_at=d.created_at.isoformat() if hasattr(d.created_at, "isoformat") else str(d.created_at),
            updated_at=d.updated_at.isoformat() if hasattr(d.updated_at, "isoformat") else str(d.updated_at),
        )
        for d in disputes
    ]


@router.get("/{dispute_id}")
async def get_dispute(
    dispute_id: str,
    actor: AuthenticatedActor = Depends(get_current_actor),
    session: AsyncSession = Depends(get_db),
):
    query = select(Dispute).where(Dispute.id == dispute_id)
    result = await session.execute(query)
    dispute = result.scalar_one_or_none()
    if not dispute:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Dispute '{dispute_id}' not found")

    if not RBACManager.verify_tenant_isolation(actor, dispute.merchant_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tenant Isolation Violation")

    # Fetch attached evidence
    ev_q = select(Evidence).where(Evidence.dispute_id == dispute_id)
    evidence_list = (await session.execute(ev_q)).scalars().all()

    return {
        "id": dispute.id,
        "transaction_id": dispute.transaction_id,
        "merchant_id": dispute.merchant_id,
        "dispute_type": dispute.dispute_type,
        "disputed_amount": dispute.disputed_amount,
        "status": dispute.status,
        "current_stage": dispute.current_stage,
        "ai_confidence": dispute.ai_confidence,
        "ai_recommendation": dispute.ai_recommendation,
        "policy_verdict": dispute.policy_verdict,
        "policy_reason": dispute.policy_reason,
        "human_required": dispute.human_required,
        "final_resolution": dispute.final_resolution,
        "evidence": [
            {
                "id": ev.id,
                "document_type": ev.document_type,
                "filename": ev.filename,
                "authenticity_score": ev.authenticity_score,
                "is_verified": ev.is_verified,
            }
            for ev in evidence_list
        ],
        "created_at": dispute.created_at.isoformat() if hasattr(dispute.created_at, "isoformat") else str(dispute.created_at),
    }


@router.post("/{dispute_id}/investigate")
async def trigger_agent_investigation(
    dispute_id: str,
    actor: AuthenticatedActor = Depends(get_current_actor),
    session: AsyncSession = Depends(get_db),
):
    """
    Triggers the autonomous LangGraph multi-agent investigation workflow for a dispute.
    """
    disp_q = select(Dispute).where(Dispute.id == dispute_id)
    disp = (await session.execute(disp_q)).scalar_one_or_none()
    if not disp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Dispute '{dispute_id}' not found")

    if not RBACManager.verify_tenant_isolation(actor, disp.merchant_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tenant Isolation Violation")

    # Retrieve associated customer ID
    tx_q = select(Transaction, Account).join(Account, Transaction.account_id == Account.id).where(Transaction.id == disp.transaction_id)
    tx_row = (await session.execute(tx_q)).first()
    if not tx_row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Associated transaction record not found")
    tx, acc = tx_row

    # Initialize Graph State
    idempotency_key = f"idemp_disp_{disp.id[:8]}_{uuid.uuid4().hex[:6]}"
    state = create_initial_state(
        dispute_id=disp.id,
        transaction_id=disp.transaction_id,
        merchant_id=disp.merchant_id,
        customer_id=acc.customer_id,
        dispute_type=disp.dispute_type,
        disputed_amount=disp.disputed_amount,
        claim_reason=disp.policy_reason or "Customer disputed transaction",
        idempotency_key=idempotency_key,
    )

    config = {"configurable": {"thread_id": disp.id}}
    final_state = await dispute_orchestrator.ainvoke(state, config=config)

    # Sync back to DB
    disp.status = final_state.get("status", disp.status)
    disp.current_stage = final_state.get("current_stage", disp.current_stage)
    disp.human_required = final_state.get("human_approval_required", False)

    policy_engine_res = final_state.get("policy_engine_result", {})
    disp.policy_verdict = policy_engine_res.get("overall_verdict")
    disp.policy_reason = "; ".join(policy_engine_res.get("reasons", []))

    advisory = final_state.get("policy_advisory", {})
    disp.ai_recommendation = advisory.get("recommended_action")
    disp.ai_confidence = 0.92 if advisory.get("recommended_action") else None

    if final_state.get("execution_result"):
        disp.final_resolution = f"Refund executed via MCP (amount: ₹{disp.disputed_amount:.2f})"

    await session.commit()

    return {
        "dispute_id": disp.id,
        "status": disp.status,
        "current_stage": disp.current_stage,
        "policy_verdict": disp.policy_verdict,
        "ai_recommendation": disp.ai_recommendation,
        "human_required": disp.human_required,
        "timeline": final_state.get("timeline", []),
        "execution_result": final_state.get("execution_result", {}),
        "errors": final_state.get("errors", []),
    }


@router.post("/{dispute_id}/evidence")
async def upload_evidence(
    dispute_id: str,
    req: EvidenceUploadRequest,
    actor: AuthenticatedActor = Depends(get_current_actor),
    session: AsyncSession = Depends(get_db),
):
    disp_q = select(Dispute).where(Dispute.id == dispute_id)
    disp = (await session.execute(disp_q)).scalar_one_or_none()
    if not disp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Dispute '{dispute_id}' not found")

    if not RBACManager.verify_tenant_isolation(actor, disp.merchant_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tenant Isolation Violation")

    # Screen text for indirect injection
    scan_res = PromptInjectionShield.scan_and_sanitize(req.extracted_text, is_untrusted_evidence=True)
    cleaned_text = PIIScrubber.scrub_text(scan_res.sanitized_text)

    file_hash = hashlib.sha256(req.extracted_text.encode("utf-8")).hexdigest()
    evidence_entry = Evidence(
        id=f"ev_{uuid.uuid4().hex[:10]}",
        dispute_id=disp.id,
        document_type=req.document_type,
        filename=req.filename,
        file_hash=file_hash,
        extracted_text=cleaned_text,
        authenticity_score=0.1 if scan_res.threat_detected else req.authenticity_score,
        is_verified=not scan_res.threat_detected,
    )
    session.add(evidence_entry)
    await session.commit()

    return {
        "evidence_id": evidence_entry.id,
        "dispute_id": dispute_id,
        "is_verified": evidence_entry.is_verified,
        "authenticity_score": evidence_entry.authenticity_score,
        "indirect_threat_detected": scan_res.threat_detected,
        "message": "Evidence analyzed and stored",
    }
