from sqlalchemy import Boolean, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import List, Optional

from app.db.base import Base, TimestampMixin, generate_uuid


class Merchant(Base, TimestampMixin):
    __tablename__ = "merchants"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    tier: Mapped[str] = mapped_column(String(50), default="STANDARD", nullable=False)  # STANDARD, PREMIUM, ENTERPRISE
    risk_score: Mapped[float] = mapped_column(Float, default=0.1, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="ACTIVE", nullable=False)  # ACTIVE, PROBATION, SUSPENDED
    dispute_rate: Mapped[float] = mapped_column(Float, default=0.005, nullable=False)
    payout_frozen: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    webhook_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)

    transactions: Mapped[List["Transaction"]] = relationship("Transaction", back_populates="merchant")
    disputes: Mapped[List["Dispute"]] = relationship("Dispute", back_populates="merchant")


class Account(Base, TimestampMixin):
    __tablename__ = "accounts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    customer_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    risk_tier: Mapped[str] = mapped_column(String(50), default="LOW", nullable=False)  # LOW, MEDIUM, HIGH
    total_chargebacks: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="ACTIVE", nullable=False)  # ACTIVE, FLAGGED, LOCKED

    transactions: Mapped[List["Transaction"]] = relationship("Transaction", back_populates="account")


class Transaction(Base, TimestampMixin):
    __tablename__ = "transactions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    merchant_id: Mapped[str] = mapped_column(String(36), ForeignKey("merchants.id"), nullable=False, index=True)
    account_id: Mapped[str] = mapped_column(String(36), ForeignKey("accounts.id"), nullable=False, index=True)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="INR", nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="SETTLED", nullable=False)  # SETTLED, REFUNDED, DISPUTED
    payment_method: Mapped[str] = mapped_column(String(50), default="UPI", nullable=False)  # UPI, CARD, NETBANKING
    refunded_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    idempotency_key: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    metadata_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    merchant: Mapped["Merchant"] = relationship("Merchant", back_populates="transactions")
    account: Mapped["Account"] = relationship("Account", back_populates="transactions")
    disputes: Mapped[List["Dispute"]] = relationship("Dispute", back_populates="transaction")


class Dispute(Base, TimestampMixin):
    __tablename__ = "disputes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    transaction_id: Mapped[str] = mapped_column(String(36), ForeignKey("transactions.id"), nullable=False, index=True)
    merchant_id: Mapped[str] = mapped_column(String(36), ForeignKey("merchants.id"), nullable=False, index=True)
    dispute_type: Mapped[str] = mapped_column(String(100), nullable=False)
    disputed_amount: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="INTAKE", nullable=False)
    current_stage: Mapped[str] = mapped_column(String(50), default="INTAKE", nullable=False)
    ai_confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    ai_recommendation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    policy_verdict: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    policy_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    human_required: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    final_resolution: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    transaction: Mapped["Transaction"] = relationship("Transaction", back_populates="disputes")
    merchant: Mapped["Merchant"] = relationship("Merchant", back_populates="disputes")
    evidence: Mapped[List["Evidence"]] = relationship("Evidence", back_populates="dispute", cascade="all, delete-orphan")
    approvals: Mapped[List["ApprovalRequest"]] = relationship("ApprovalRequest", back_populates="dispute")


class Evidence(Base, TimestampMixin):
    __tablename__ = "evidence"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    dispute_id: Mapped[str] = mapped_column(String(36), ForeignKey("disputes.id"), nullable=False, index=True)
    document_type: Mapped[str] = mapped_column(String(100), nullable=False)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_hash: Mapped[str] = mapped_column(String(64), nullable=False)  # SHA-256
    extracted_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    metadata_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    authenticity_score: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)

    dispute: Mapped["Dispute"] = relationship("Dispute", back_populates="evidence")


class PolicyRule(Base, TimestampMixin):
    __tablename__ = "policy_rules"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    rule_code: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    parameters_json: Mapped[str] = mapped_column(Text, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)


class ApprovalRequest(Base, TimestampMixin):
    __tablename__ = "approval_requests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    dispute_id: Mapped[str] = mapped_column(String(36), ForeignKey("disputes.id"), nullable=False, index=True)
    required_role: Mapped[str] = mapped_column(String(50), default="RISK_LEAD", nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="PENDING", nullable=False)  # PENDING, APPROVED, REJECTED
    requester_agent: Mapped[str] = mapped_column(String(100), nullable=False)
    approved_by: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    review_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    resolved_at: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    dispute: Mapped["Dispute"] = relationship("Dispute", back_populates="approvals")


class ExecutionLedger(Base, TimestampMixin):
    __tablename__ = "execution_ledger"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    dispute_id: Mapped[str] = mapped_column(String(36), ForeignKey("disputes.id"), nullable=False, index=True)
    transaction_id: Mapped[str] = mapped_column(String(36), ForeignKey("transactions.id"), nullable=False, index=True)
    action_type: Mapped[str] = mapped_column(String(100), nullable=False)  # REFUND, PROVISIONAL_CREDIT, REVERSAL
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="SUCCESS", nullable=False)
    idempotency_key: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    mcp_execution_ref: Mapped[str] = mapped_column(String(128), nullable=False)
    signed_token_hash: Mapped[str] = mapped_column(String(64), nullable=False)  # SHA-256 of policy token


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    sequence_id: Mapped[int] = mapped_column(Integer, unique=True, index=True, nullable=False)
    trace_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    actor_type: Mapped[str] = mapped_column(String(50), nullable=False)  # AGENT, POLICY_ENGINE, HUMAN, MCP_TOOL, SECURITY
    actor_id: Mapped[str] = mapped_column(String(100), nullable=False)
    event_payload: Mapped[str] = mapped_column(Text, nullable=False)
    prev_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    current_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[str] = mapped_column(String(50), nullable=False)


class ConsumedPolicyToken(Base, TimestampMixin):
    """
    P1 Hardening: Single-use policy token storage.
    Enforces replay protection: Once a signed policy token is consumed to execute
    a financial operation, its SHA-256 hash is permanently recorded. Any subsequent
    replay attempt — even with a different idempotency key or altered client arguments —
    is deterministically rejected.
    """
    __tablename__ = "consumed_policy_tokens"

    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)  # SHA-256 of policy token
    dispute_id: Mapped[str] = mapped_column(String(36), ForeignKey("disputes.id"), nullable=False, index=True)
    transaction_id: Mapped[str] = mapped_column(String(36), ForeignKey("transactions.id"), nullable=False, index=True)
    merchant_id: Mapped[str] = mapped_column(String(36), ForeignKey("merchants.id"), nullable=False, index=True)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    action_type: Mapped[str] = mapped_column(String(100), nullable=False)
    policy_version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    idempotency_key: Mapped[str] = mapped_column(String(128), nullable=False)
    consumed_by: Mapped[str] = mapped_column(String(100), nullable=False)
    consumed_at: Mapped[str] = mapped_column(String(50), nullable=False)

