from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.api.deps import get_current_actor
from app.core.security import create_access_token
from app.security.rbac import AuthenticatedActor, UserRole

router = APIRouter()


class LoginRequest(BaseModel):
    username: str
    password: Optional[str] = "demo_password"


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: str
    role: str
    merchant_id: Optional[str] = None


PRECONFIGURED_DEMO_USERS = {
    "ops_analyst": {
        "user_id": "usr_ops_01",
        "email": "ops.analyst@sentinelpay.io",
        "role": UserRole.OPS_ANALYST.value,
        "merchant_id": None,
    },
    "risk_lead": {
        "user_id": "usr_risk_01",
        "email": "risk.lead@sentinelpay.io",
        "role": UserRole.RISK_LEAD.value,
        "merchant_id": None,
    },
    "merchant_apex": {
        "user_id": "usr_mch_apex",
        "email": "finance@apexcloud.io",
        "role": UserRole.MERCHANT_ANALYST.value,
        "merchant_id": "mch_apex_01",
    },
    "merchant_quickbite": {
        "user_id": "usr_mch_qb",
        "email": "disputes@quickbite.in",
        "role": UserRole.MERCHANT_ANALYST.value,
        "merchant_id": "mch_quickbite_02",
    },
    "admin": {
        "user_id": "usr_admin_01",
        "email": "admin@sentinelpay.io",
        "role": UserRole.FIN_OPS_ADMIN.value,
        "merchant_id": None,
    },
    "auditor": {
        "user_id": "usr_auditor_01",
        "email": "auditor@sentinelpay.io",
        "role": UserRole.AUDITOR.value,
        "merchant_id": None,
    },
}


@router.post("/login", response_model=LoginResponse)
async def login(req: LoginRequest):
    user_data = PRECONFIGURED_DEMO_USERS.get(req.username.lower())
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"User '{req.username}' not recognized. Available demo personas: {list(PRECONFIGURED_DEMO_USERS.keys())}",
        )

    token = create_access_token(
        data={
            "sub": user_data["user_id"],
            "email": user_data["email"],
            "role": user_data["role"],
            "merchant_id": user_data["merchant_id"],
        }
    )

    return LoginResponse(
        access_token=token,
        user_id=user_data["user_id"],
        email=user_data["email"],
        role=user_data["role"],
        merchant_id=user_data["merchant_id"],
    )


@router.get("/me", response_model=AuthenticatedActor)
async def get_me(actor: AuthenticatedActor = Depends(get_current_actor)):
    return actor
