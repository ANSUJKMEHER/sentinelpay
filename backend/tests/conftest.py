import os
import sqlite3
import pytest
from app.core.config import settings

DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "sentinelpay.db"))


def _reset_transaction_balances():
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
            import psycopg
            pg_url = settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
            with psycopg.connect(pg_url) as conn:
                with conn.cursor() as cur:
                    cur.execute("UPDATE transactions SET refunded_amount = 0.0, status = 'SETTLED'")
                conn.commit()
        except Exception:
            pass


@pytest.fixture(autouse=True)
def clean_transaction_state():
    """
    Guarantees test isolation by resetting mutable transaction balances before and after each test.
    Safe across both SQLite local development and PostgreSQL staging/CI environments.
    Uses sync connections (sqlite3 / psycopg) to avoid any event loop interference.
    """
    _reset_transaction_balances()
    yield
    _reset_transaction_balances()
    try:
        from app.db.session import engine
        engine.sync_engine.dispose()
    except Exception:
        pass
