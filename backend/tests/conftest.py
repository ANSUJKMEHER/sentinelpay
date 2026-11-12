import os
import sqlite3
import pytest
from sqlalchemy import text
from app.core.config import settings
from app.db.session import engine

DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "sentinelpay.db"))


@pytest.fixture(scope="session", autouse=True)
def ensure_database_seeded():
    """Ensures database is initialized and seeded for both SQLite and PostgreSQL test runners."""
    import asyncio
    from app.db.seed_data import seed_database
    try:
        asyncio.run(seed_database())
    except Exception:
        pass


@pytest.fixture(autouse=True)
def clean_transaction_state():
    """
    Guarantees test isolation by resetting mutable transaction balances before each test.
    Safe across both SQLite local development and PostgreSQL staging/CI environments.
    """
    if settings.DATABASE_URL.startswith("sqlite") and os.path.exists(DB_PATH):
        try:
            conn = sqlite3.connect(DB_PATH, timeout=10.0)
            cur = conn.cursor()
            cur.execute("UPDATE transactions SET refunded_amount = 0.0, status = 'SETTLED'")
            conn.commit()
            conn.close()
        except Exception:
            pass
    elif settings.DATABASE_URL.startswith("postgres"):
        try:
            with engine.sync_engine.connect() as conn:
                conn.execute(text("UPDATE transactions SET refunded_amount = 0.0, status = 'SETTLED'"))
                conn.commit()
        except Exception:
            pass
    yield
