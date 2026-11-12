from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.audit_service import AuditService
from app.db.session import get_db

router = APIRouter()


@router.get("/health")
async def get_health_status(session: AsyncSession = Depends(get_db)):
    # 1. Check DB connectivity
    try:
        await session.execute(text("SELECT 1"))
        db_healthy = True
        db_message = "Connected"
    except Exception as e:
        db_healthy = False
        db_message = str(e)

    # 2. Check Tamper-Evident Audit Ledger Integrity
    try:
        chain_valid, tamper_msg = await AuditService.verify_chain(session)
    except Exception as e:
        chain_valid = False
        tamper_msg = str(e)

    overall_status = "HEALTHY" if db_healthy and chain_valid else "DEGRADED"

    return {
        "status": overall_status,
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "components": {
            "database": {"healthy": db_healthy, "message": db_message},
            "audit_ledger": {"chain_intact": chain_valid, "tamper_detected": not chain_valid, "details": tamper_msg},
            "policy_engine": {"fail_closed_mode": True, "spend_threshold": settings.POLICY_MAX_AUTO_REFUND_AMOUNT},
        },
    }
