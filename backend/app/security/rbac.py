from enum import Enum
from typing import List, Optional, Set
from pydantic import BaseModel


class UserRole(str, Enum):
    MERCHANT_ANALYST = "MERCHANT_ANALYST"
    OPS_ANALYST = "OPS_ANALYST"
    RISK_LEAD = "RISK_LEAD"
    FIN_OPS_ADMIN = "FIN_OPS_ADMIN"
    AUDITOR = "AUDITOR"


class AuthenticatedActor(BaseModel):
    user_id: str
    email: str
    role: UserRole
    merchant_id: Optional[str] = None  # Populated if MERCHANT_ANALYST
    permissions: List[str] = []


class RBACManager:
    """
    Enforces Role-Based Access Control and Merchant Tenant Isolation.
    """

    ROLE_PERMISSIONS = {
        UserRole.MERCHANT_ANALYST: {
            "dispute:read:own",
            "dispute:create:own",
            "evidence:upload:own",
            "transaction:read:own",
        },
        UserRole.OPS_ANALYST: {
            "dispute:read:all",
            "dispute:create:all",
            "evidence:upload:all",
            "agent:execute",
            "transaction:read:all",
            "approval:request",
        },
        UserRole.RISK_LEAD: {
            "dispute:read:all",
            "dispute:create:all",
            "evidence:upload:all",
            "agent:execute",
            "transaction:read:all",
            "approval:request",
            "refund:approve:tier2",  # Up to ₹100,000
            "policy:override",
            "audit:read",
        },
        UserRole.FIN_OPS_ADMIN: {
            "dispute:read:all",
            "dispute:create:all",
            "evidence:upload:all",
            "agent:execute",
            "transaction:read:all",
            "approval:request",
            "refund:approve:tier1",  # Unlimited
            "refund:approve:tier2",
            "policy:override",
            "policy:update",
            "audit:read",
            "system:configure",
        },
        UserRole.AUDITOR: {
            "dispute:read:all",
            "transaction:read:all",
            "audit:read",
            "ledger:read",
        },
    }

    @classmethod
    def has_permission(cls, role: UserRole, permission: str) -> bool:
        return permission in cls.ROLE_PERMISSIONS.get(role, set())

    @classmethod
    def verify_tenant_isolation(
        cls,
        actor: AuthenticatedActor,
        target_merchant_id: str,
    ) -> bool:
        """
        Guarantees that a merchant user cannot access another merchant's transactions or disputes.
        Internal operations roles (OPS_ANALYST, RISK_LEAD, FIN_OPS_ADMIN, AUDITOR) have cross-tenant visibility.
        """
        if actor.role == UserRole.MERCHANT_ANALYST:
            if not actor.merchant_id:
                return False
            return actor.merchant_id == target_merchant_id
        # Internal platform roles have authorized operational access across merchants
        return True
