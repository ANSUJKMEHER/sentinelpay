from typing import AsyncGenerator, Optional
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import decode_access_token
from app.db.session import get_db
from app.security.rbac import AuthenticatedActor, RBACManager, UserRole

security_scheme = HTTPBearer(auto_error=False)


async def get_current_actor(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security_scheme),
) -> AuthenticatedActor:
    """
    Validates Bearer JWT or provides standard development fallback actor if unauthenticated in dev mode.
    """
    if credentials:
        try:
            payload = decode_access_token(credentials.credentials)
            role_str = payload.get("role", "OPS_ANALYST")
            return AuthenticatedActor(
                user_id=payload.get("sub", "usr_dev_01"),
                email=payload.get("email", "ops@sentinelpay.io"),
                role=UserRole(role_str),
                merchant_id=payload.get("merchant_id"),
                permissions=list(RBACManager.ROLE_PERMISSIONS.get(UserRole(role_str), set())),
            )
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired access token",
                headers={"WWW-Authenticate": "Bearer"},
            )

    # In development, provide a default OPS_ANALYST identity if no header passed
    if settings.DEBUG:
        return AuthenticatedActor(
            user_id="usr_ops_default",
            email="ops.lead@sentinelpay.io",
            role=UserRole.OPS_ANALYST,
            merchant_id=None,
            permissions=list(RBACManager.ROLE_PERMISSIONS.get(UserRole.OPS_ANALYST, set())),
        )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Missing authorization token",
        headers={"WWW-Authenticate": "Bearer"},
    )


def require_role(allowed_roles: list[UserRole]):
    def role_checker(actor: AuthenticatedActor = Depends(get_current_actor)) -> AuthenticatedActor:
        if actor.role not in allowed_roles and actor.role != UserRole.FIN_OPS_ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: Action requires one of {[r.value for r in allowed_roles]}",
            )
        return actor

    return role_checker
