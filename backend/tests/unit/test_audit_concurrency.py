import asyncio
import uuid
import pytest
from app.db.session import AsyncSessionLocal
from app.db.audit_service import AuditService
from app.db.models import AuditLog
from sqlalchemy import select


@pytest.mark.asyncio
async def test_audit_hash_chain_concurrent_writes_prevent_forks():
    """
    P0 Concurrency Hardening Test:
    Spawns 25 concurrent tasks attempting to write to the cryptographic audit ledger
    simultaneously.
    Verifies that:
    1. All 25 entries are written with strictly monotonic sequence_id (no duplicates, no gaps).
    2. Each entry correctly links to the immediately preceding event's current_hash (zero forks).
    3. AuditService.verify_chain returns (True, None) for the entire ledger.
    """
    num_concurrent_writers = 25
    batch_trace_id = f"trace_concurrent_{uuid.uuid4().hex[:8]}"

    async def write_event(writer_idx: int):
        # Each concurrent writer uses its own database session
        async with AsyncSessionLocal() as session:
            return await AuditService.append_event(
                session=session,
                trace_id=batch_trace_id,
                event_type="CONCURRENT_OPERATION",
                actor_type="CONCURRENCY_TEST",
                actor_id=f"writer_{writer_idx}",
                payload={
                    "writer_idx": writer_idx,
                    "batch_id": batch_trace_id,
                    "operation": "CONCURRENT_FINANCIAL_AUDIT",
                },
            )

    # Execute all 25 writers simultaneously
    events = await asyncio.gather(*[write_event(i) for i in range(num_concurrent_writers)])
    assert len(events) == num_concurrent_writers

    # Verify results in database
    async with AsyncSessionLocal() as session:
        # 1. Full chain cryptographic audit
        is_valid, error = await AuditService.verify_chain(session)
        assert is_valid is True, f"Audit chain broken under concurrency: {error}"
        assert error is None

        # 2. Verify all 25 records from this batch have distinct, monotonically strictly increasing sequence IDs
        query = select(AuditLog).where(AuditLog.trace_id == batch_trace_id).order_by(AuditLog.sequence_id.asc())
        records = (await session.execute(query)).scalars().all()
        assert len(records) == num_concurrent_writers

        sequence_ids = [r.sequence_id for r in records]
        # Check all sequence IDs are strictly increasing with step 1
        for i in range(len(sequence_ids) - 1):
            assert sequence_ids[i + 1] == sequence_ids[i] + 1, (
                f"Sequence anomaly: {sequence_ids[i]} followed by {sequence_ids[i + 1]}"
            )

        # 3. Check hash chaining across the batch
        for i in range(len(records) - 1):
            assert records[i + 1].prev_hash == records[i].current_hash, (
                f"Hash-chain fork detected between seq {records[i].sequence_id} and seq {records[i + 1].sequence_id}"
            )
