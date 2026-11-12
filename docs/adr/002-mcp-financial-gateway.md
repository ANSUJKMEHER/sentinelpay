# ADR 002: Custom Model Context Protocol (MCP) Financial Gateway

## Status
Accepted

## Context
AI agents need controlled access to backend financial tools: retrieving transactions, analyzing merchant risk scores, creating refund requests, submitting dispute claims, and retrieving audit records. Directly granting tools arbitrary database credentials or uncontrolled API tokens creates severe risk of privilege escalation, lateral merchant movement, and unauthorized transactions.

## Decision
1. **Independent MCP Architecture**: We implement a dedicated Model Context Protocol (MCP) financial gateway exposing controlled tools with strict Pydantic v2 input and output schemas.
2. **Identity-Scoped Execution**: Every tool invocation must supply an authenticated and authorized caller context (Actor ID, Role, Merchant ID, Trace ID). Tools verify tenant isolation (`merchant_id` boundary) at runtime.
3. **Signed Execution Tokens**: Destructive or financial tools (such as `execute_refund` or `update_dispute_status`) reject plain invocation unless accompanied by a cryptographically signed, short-lived `PolicyToken` generated exclusively by the Deterministic Policy Engine.
4. **Audit Hooks**: Every tool invocation (success or failure) generates structured audit spans chained into the immutable audit ledger.

## Consequences
- **Pros**:
  - Reusable across any MCP-compliant client or agent framework.
  - Granular permission boundaries prevent LLM privilege escalation.
  - Full observability and tracing on all data reads and mutations.
- **Cons**:
  - Requires token verification overhead for each tool call.
