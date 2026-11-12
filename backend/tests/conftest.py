import pytest
from sqlalchemy import update
from app.db.models import Transaction
from app.db.session import AsyncSessionLocal


@pytest.fixture(autouse=True)
async def clean_transaction_state():
    """
    Guarantees test isolation by resetting mutable transaction balances before each test.
    """
    async with AsyncSessionLocal() as session:
        await session.execute(update(Transaction).values(refunded_amount=0.0, status="SETTLED"))
        await session.commit()
    yield
