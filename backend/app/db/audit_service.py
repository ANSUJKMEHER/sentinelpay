import asyncio
import hashlib
import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import AuditLog


class AuditService:
    """
    Cryptographically Chained Audit Ledger Service.
    Guarantees tamper-evident audit logging using SHA-256 hash chaining and
    monotonic sequence IDs. Prevents concurrent hash-chain forks using database-level
    advisory locks (PostgreSQL) and in-process asyncio mutex synchronization.
    """

    # 64-bit identifier for PostgreSQL transaction-scoped advisory lock
    PG_AUDIT_ADVISORY_LOCK_ID: int = 89472918471

    # Loop-scoped asynchronous lock mapping ensuring compatibility across pytest test loops
    _locks: Dict[Any, asyncio.Lock] = {}

    @classmethod
    def _get_loop_lock(cls) -> asyncio.Lock:
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None
        if loop not in cls._locks:
            cls._locks[loop] = asyncio.Lock()
        return cls._locks[loop]

    @staticmethod
    def canonical_json(data: Dict[str, Any]) -> str:
        return json.dumps(data, sort_keys=True, separators=(",", ":"))

    @staticmethod
    def calculate_hash(
        prev_hash: str,
        timestamp: str,
        event_type: str,
        actor_id: str,
        payload_json: str,
    ) -> str:
        content = f"{prev_hash}|{timestamp}|{event_type}|{actor_id}|{payload_json}".encode("utf-8")
        return hashlib.sha256(content).hexdigest()

    @classmethod
    async def append_event(
        cls,
        session: Optional[AsyncSession] = None,
        trace_id: str = "",
        event_type: str = "",
        actor_type: str = "",
        actor_id: str = "",
        payload: Optional[Dict[str, Any]] = None,
    ) -> AuditLog:
        """
        Appends an immutable audit event to the ledger using SHA-256 cryptographic chaining.
        Guarantees strictly serialized monotonic sequence ordering and fork prevention under concurrency.
        """
        if payload is None:
            payload = {}

        async with cls._get_loop_lock():
            if session is None:
                from app.db.session import AsyncSessionLocal
                async with AsyncSessionLocal() as audit_session:
                    return await cls._append_to_session(
                        session=audit_session,
                        trace_id=trace_id,
                        event_type=event_type,
                        actor_type=actor_type,
                        actor_id=actor_id,
                        payload=payload,
                    )
            else:
                return await cls._append_to_session(
                    session=session,
                    trace_id=trace_id,
                    event_type=event_type,
                    actor_type=actor_type,
                    actor_id=actor_id,
                    payload=payload,
                )

    @classmethod
    async def _append_to_session(
        cls,
        session: AsyncSession,
        trace_id: str,
        event_type: str,
        actor_type: str,
        actor_id: str,
        payload: Dict[str, Any],
    ) -> AuditLog:
        # 1. Database-level serialization safeguard:
        # On PostgreSQL, acquire a transaction-scoped advisory lock to prevent cross-worker forks.
        try:
            bind = session.bind
            if bind and bind.dialect.name == "postgresql":
                lock_res = await session.execute(text(f"SELECT pg_advisory_xact_lock({cls.PG_AUDIT_ADVISORY_LOCK_ID})"))
                lock_res.scalar()
        except Exception:
            pass  # Fall back gracefully if dialect does not support advisory lock

        # 2. Fetch the authoritative latest record ordered by monotonic sequence_id
        query = select(AuditLog).order_by(AuditLog.sequence_id.desc()).limit(1)
        result = await session.execute(query)
        latest_record = result.scalar_one_or_none()

        if latest_record and latest_record.sequence_id is not None:
            next_seq = latest_record.sequence_id + 1
            prev_hash = latest_record.current_hash
        else:
            next_seq = 1
            prev_hash = "0" * 64

        timestamp = datetime.now(timezone.utc).isoformat()
        payload_str = cls.canonical_json(payload)
        current_hash = cls.calculate_hash(prev_hash, timestamp, event_type, actor_id, payload_str)

        audit_entry = AuditLog(
            id=str(uuid.uuid4()),
            sequence_id=next_seq,
            trace_id=trace_id,
            event_type=event_type,
            actor_type=actor_type,
            actor_id=actor_id,
            event_payload=payload_str,
            prev_hash=prev_hash,
            current_hash=current_hash,
            created_at=timestamp,
        )
        session.add(audit_entry)
        await session.commit()
        # Note: Do NOT call session.refresh(audit_entry) here to avoid implicitly re-opening
        # a new transaction on the connection in asyncpg.
        return audit_entry

    @classmethod
    async def verify_chain(cls, session: AsyncSession) -> Tuple[bool, Optional[str]]:
        """
        Audits the entire ledger from genesis to the latest record.
        Deterministic ordering is strictly enforced using sequence_id ASC.
        Returns (True, None) if the cryptographic chain and monotonic sequence are intact,
        or (False, error_message) if any tampering, sequence gap, or broken link is found.
        """
        query = select(AuditLog).order_by(AuditLog.sequence_id.asc())
        result = await session.execute(query)
        records = result.scalars().all()

        if not records:
            return True, None

        expected_prev_hash = "0" * 64
        expected_seq = records[0].sequence_id if records else 1

        for record in records:
            # 1. Monotonic sequence continuity check
            if record.sequence_id != expected_seq:
                return (
                    False,
                    f"Sequence break at record {record.id}: expected sequence_id {expected_seq}, got {record.sequence_id}",
                )
            expected_seq += 1

            # 2. Cryptographic prev_hash linking check
            if record.prev_hash != expected_prev_hash:
                return (
                    False,
                    f"Chain break at record {record.id} (sequence {record.sequence_id}): expected prev_hash {expected_prev_hash}, got {record.prev_hash}",
                )

            # 3. Cryptographic current_hash recomputation & tampering check
            recomputed_hash = cls.calculate_hash(
                record.prev_hash,
                record.created_at,
                record.event_type,
                record.actor_id,
                record.event_payload,
            )
            if record.current_hash != recomputed_hash:
                return (
                    False,
                    f"Tampered record {record.id} (sequence {record.sequence_id}): recorded hash {record.current_hash} != calculated hash {recomputed_hash}",
                )

            expected_prev_hash = record.current_hash

        return True, None
