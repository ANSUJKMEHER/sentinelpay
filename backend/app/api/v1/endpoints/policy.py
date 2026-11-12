import json
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_actor
from app.db.models import PolicyRule
from app.db.session import get_db
from app.security.rbac import AuthenticatedActor

router = APIRouter()


@router.get("/rules")
async def list_policy_rules(
    actor: AuthenticatedActor = Depends(get_current_actor),
    session: AsyncSession = Depends(get_db),
):
    query = select(PolicyRule).order_by(PolicyRule.rule_code)
    result = await session.execute(query)
    rules = result.scalars().all()

    return [
        {
            "id": r.id,
            "rule_code": r.rule_code,
            "name": r.name,
            "description": r.description,
            "parameters": json.loads(r.parameters_json) if r.parameters_json else {},
            "is_active": r.is_active,
            "version": r.version,
            "updated_at": r.updated_at.isoformat() if hasattr(r.updated_at, "isoformat") else str(r.updated_at),
        }
        for r in rules
    ]
