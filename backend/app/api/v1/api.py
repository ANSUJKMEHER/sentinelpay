from fastapi import APIRouter

from app.api.v1.endpoints import (
    approvals,
    audit,
    auth,
    disputes,
    health,
    policy,
    transactions,
)

api_router = APIRouter()
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(transactions.router, prefix="/transactions", tags=["Transactions"])
api_router.include_router(disputes.router, prefix="/disputes", tags=["Disputes"])
api_router.include_router(approvals.router, prefix="/approvals", tags=["Human Approvals"])
api_router.include_router(audit.router, prefix="/audit", tags=["Audit & Ledger"])
api_router.include_router(policy.router, prefix="/policy", tags=["Deterministic Policy"])
