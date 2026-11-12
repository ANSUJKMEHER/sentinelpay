# ADR 003: Tamper-Evident Cryptographically Chained Audit Trail

## Status
Accepted

## Context
Financial disputes and autonomous AI operations require complete post-incident explainability and forensic auditability. If an automated system approves an erroneous refund or rejects a valid dispute, operations teams and regulators must be able to verify every step, actor decision, and parameter without risk of retroactive log tampering or database manipulation.

## Decision
1. **Append-Only Immutable Ledger**: We record every significant system event (`DISPUTE_CREATED`, `AGENT_NODE_COMPLETED`, `POLICY_EVALUATED`, `HUMAN_APPROVAL_RECORDED`, `FINANCIAL_EXECUTION_COMPLETED`, `SECURITY_ALERT_TRIGGERED`) in an append-only `AuditLog` table.
2. **Cryptographic Hash Chaining**: Each audit record stores `prev_hash` and computes `current_hash = SHA256(prev_hash + timestamp + event_type + actor_id + canonical_json(payload))`.
3. **Chain Verification Utility**: SentinelPay provides an automated verification tool that traverses the chain from genesis to the latest record, detecting any inserted, deleted, or altered records.

## Consequences
- **Pros**:
  - Non-repudiation and tamper detection down to individual agent actions.
  - Clear provenance of AI vs. Policy vs. Human decisions.
- **Cons**:
  - Requires strict canonical JSON serialization to maintain deterministic hash calculations.
