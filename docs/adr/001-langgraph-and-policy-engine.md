# ADR 001: LangGraph Orchestration & Decoupled Deterministic Policy Engine

## Status
Accepted

## Context
Financial operations (dispute management, refunds, chargebacks, fraud investigations) involve high cognitive analysis over multi-party inputs (merchants, customers, banks, couriers). Large Language Models (LLMs) excel at natural language synthesis and contextual reasoning across disparate evidence. However, FinTech systems require mathematical certainty, strict spend controls, regulatory compliance windows, and fail-closed safety. LLM non-determinism, hallucinations, and prompt injections introduce critical financial liabilities if an LLM is directly granted execution authority.

## Decision
1. **LangGraph for Multi-Agent Orchestration**: We adopt LangGraph to model the dispute resolution lifecycle as a cyclical, stateful Directed Acyclic/Cyclic Graph with explicit Pydantic-typed state schemas, persistent checkpointing, timeout enforcement, loop counters, and human-in-the-loop interruption primitives.
2. **Decoupled Deterministic Policy Engine**: We strictly decouple the policy engine from the LLM. The Policy Agent inside the LangGraph workflow only produces advisory recommendations with cited rule identifiers. The backend `PolicyEngine` is a pure deterministic Python component with zero LLM dependence.
3. **Fail-Closed Financial Authorization**: The Policy Engine independently verifies limits, merchant velocity, dispute windows, customer eligibility, and duplicate keys. If the Policy Engine is unreachable or evaluates to an ambiguous state, all financial execution halts immediately (fail-closed).

## Consequences
- **Pros**:
  - Zero financial movement can occur without deterministic, auditable rule verification.
  - Transparent audit trail clearly separates AI opinion from backend legal/financial authorization.
  - Predictable execution limits ($N \le 6$ node iterations).
- **Cons**:
  - Requires maintaining rule definitions and schemas alongside agent reasoning prompts.
