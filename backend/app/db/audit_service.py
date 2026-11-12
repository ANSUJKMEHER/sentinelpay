import hashlib
import json
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import AuditLog


class AuditService:
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
        session: AsyncSession,
        trace_id: str,
        event_type: str,
        actor_type: str,
        actor_id: str,
        payload: Dict[str, Any],
    ) -> AuditLog:
        """
        Appends an immutable audit event to the ledger using SHA-256 cryptographic chaining.
        """
        # Fetch the most recent audit record to find prev_hash
        query = select(AuditLog).order_by(AuditLog.created_at.desc(), AuditLog.id.desc()).limit(1)
        result = await session.execute(query)
        latest_record = result.scalar_one_or_none()

        prev_hash = latest_record.current_hash if latest_record else "0" * 64
        timestamp = datetime.now(timezone.utc).isoformat()
        payload_str = cls.canonical_json(payload)
        current_hash = cls.calculate_hash(prev_hash, timestamp, event_type, actor_id, payload_str)

        audit_entry = AuditLog(
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
        await session.refresh(audit_entry)
        return audit_entry

    @classmethod
    async def verify_chain(cls, session: AsyncSession) -> Tuple[bool, Optional[str]]:
        """
        Audits the entire ledger from genesis to the latest record.
        Returns (True, None) if the cryptographic chain is untampered,
        or (False, error_message) if any tampering or broken link is found.
        """
        query = select(AuditLog).order_by(AuditLog.created_at.asc(), AuditLog.id.asc())
        result = await session.execute(query)
        records = result.scalars().all()

        if not records:
            return True, None

        expected_prev_hash = "0" * 64
        for record in records:
            if record.prev_hash != expected_prev_hash:
                return (
                    False,
                    f"Chain break at record {record.id}: expected prev_hash {expected_prev_hash}, got {record.prev_hash}",
                )

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
                    f"Tampered record {record.id}: recorded hash {record.current_hash} != calculated hash {recomputed_hash}",
                )

            expected_prev_hash = record.current_hash

        return True, None
