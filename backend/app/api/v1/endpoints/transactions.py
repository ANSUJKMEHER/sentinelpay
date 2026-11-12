import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_actor
from app.db.models import Account, Transaction
from app.db.session import get_db
from app.security.rbac import AuthenticatedActor, RBACManager, UserRole

router = APIRouter()


class TransactionResponse(BaseModel):
    id: str
    merchant_id: str
    account_id: str
    customer_id: Optional[str] = None
    customer_email: Optional[str] = None
    amount: float
    currency: str
    status: str
    payment_method: str
    refunded_amount: float
    eligible_refund_balance: float
    idempotency_key: str
    metadata: dict = {}
    created_at: str


@router.get("", response_model=List[TransactionResponse])
async def list_transactions(
    merchant_id: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(25, ge=1, le=100),
    actor: AuthenticatedActor = Depends(get_current_actor),
    session: AsyncSession = Depends(get_db),
):
    query = select(Transaction, Account).join(Account, Transaction.account_id == Account.id)

    # Enforce tenant isolation for MERCHANT_ANALYST
    if actor.role == UserRole.MERCHANT_ANALYST:
        if not actor.merchant_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Merchant identity missing")
        query = query.where(Transaction.merchant_id == actor.merchant_id)
    elif merchant_id:
        query = query.where(Transaction.merchant_id == merchant_id)

    if status_filter:
        query = query.where(Transaction.status == status_filter)

    query = query.order_by(Transaction.created_at.desc()).limit(limit)
    result = await session.execute(query)
    rows = result.all()

    responses = []
    for tx, acc in rows:
        meta = json.loads(tx.metadata_json) if tx.metadata_json else {}
        eligible_bal = round(max(0.0, tx.amount - tx.refunded_amount), 2)
        responses.append(
            TransactionResponse(
                id=tx.id,
                merchant_id=tx.merchant_id,
                account_id=tx.account_id,
                customer_id=acc.customer_id,
                customer_email=acc.email,
                amount=tx.amount,
                currency=tx.currency,
                status=tx.status,
                payment_method=tx.payment_method,
                refunded_amount=tx.refunded_amount,
                eligible_refund_balance=eligible_bal,
                idempotency_key=tx.idempotency_key,
                metadata=meta,
                created_at=tx.created_at.isoformat() if hasattr(tx.created_at, "isoformat") else str(tx.created_at),
            )
        )
    return responses


@router.get("/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(
    transaction_id: str,
    actor: AuthenticatedActor = Depends(get_current_actor),
    session: AsyncSession = Depends(get_db),
):
    query = (
        select(Transaction, Account)
        .join(Account, Transaction.account_id == Account.id)
        .where(Transaction.id == transaction_id)
    )
    result = await session.execute(query)
    row = result.first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Transaction '{transaction_id}' not found")

    tx, acc = row
    if not RBACManager.verify_tenant_isolation(actor, tx.merchant_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tenant Isolation Violation: Cannot view transaction of another merchant",
        )

    meta = json.loads(tx.metadata_json) if tx.metadata_json else {}
    eligible_bal = round(max(0.0, tx.amount - tx.refunded_amount), 2)
    return TransactionResponse(
        id=tx.id,
        merchant_id=tx.merchant_id,
        account_id=tx.account_id,
        customer_id=acc.customer_id,
        customer_email=acc.email,
        amount=tx.amount,
        currency=tx.currency,
        status=tx.status,
        payment_method=tx.payment_method,
        refunded_amount=tx.refunded_amount,
        eligible_refund_balance=eligible_bal,
        idempotency_key=tx.idempotency_key,
        metadata=meta,
        created_at=tx.created_at.isoformat() if hasattr(tx.created_at, "isoformat") else str(tx.created_at),
    )
