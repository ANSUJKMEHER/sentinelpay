"""initial_schema

Revision ID: 0001_initial_schema
Revises: 
Create Date: 2026-11-13 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '0001_initial_schema'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Merchants table
    op.create_table(
        'merchants',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('tier', sa.String(length=50), nullable=False, server_default='STANDARD'),
        sa.Column('risk_score', sa.Float(), nullable=False, server_default='0.1'),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='ACTIVE'),
        sa.Column('dispute_rate', sa.Float(), nullable=False, server_default='0.005'),
        sa.Column('payout_frozen', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('webhook_url', sa.String(length=512), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    # 2. Accounts table
    op.create_table(
        'accounts',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('customer_id', sa.String(length=64), unique=True, nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('risk_tier', sa.String(length=50), nullable=False, server_default='LOW'),
        sa.Column('total_chargebacks', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='ACTIVE'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    # 3. Transactions table
    op.create_table(
        'transactions',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('merchant_id', sa.String(length=36), sa.ForeignKey('merchants.id'), nullable=False),
        sa.Column('account_id', sa.String(length=36), sa.ForeignKey('accounts.id'), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('currency', sa.String(length=10), nullable=False, server_default='INR'),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='SETTLED'),
        sa.Column('payment_method', sa.String(length=50), nullable=False, server_default='UPI'),
        sa.Column('refunded_amount', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('idempotency_key', sa.String(length=128), unique=True, nullable=False),
        sa.Column('metadata_json', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_transactions_merchant_id', 'transactions', ['merchant_id'])
    op.create_index('ix_transactions_account_id', 'transactions', ['account_id'])

    # 4. Disputes table
    op.create_table(
        'disputes',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('transaction_id', sa.String(length=36), sa.ForeignKey('transactions.id'), nullable=False),
        sa.Column('merchant_id', sa.String(length=36), sa.ForeignKey('merchants.id'), nullable=False),
        sa.Column('dispute_type', sa.String(length=100), nullable=False),
        sa.Column('disputed_amount', sa.Float(), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='INTAKE'),
        sa.Column('current_stage', sa.String(length=50), nullable=False, server_default='INTAKE'),
        sa.Column('ai_confidence', sa.Float(), nullable=True),
        sa.Column('ai_recommendation', sa.Text(), nullable=True),
        sa.Column('policy_verdict', sa.String(length=50), nullable=True),
        sa.Column('policy_reason', sa.Text(), nullable=True),
        sa.Column('human_required', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('final_resolution', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_disputes_transaction_id', 'disputes', ['transaction_id'])
    op.create_index('ix_disputes_merchant_id', 'disputes', ['merchant_id'])

    # 5. Evidence table
    op.create_table(
        'evidence',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('dispute_id', sa.String(length=36), sa.ForeignKey('disputes.id'), nullable=False),
        sa.Column('document_type', sa.String(length=100), nullable=False),
        sa.Column('filename', sa.String(length=255), nullable=False),
        sa.Column('file_hash', sa.String(length=64), nullable=False),
        sa.Column('extracted_text', sa.Text(), nullable=True),
        sa.Column('metadata_json', sa.Text(), nullable=True),
        sa.Column('is_verified', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('authenticity_score', sa.Float(), nullable=False, server_default='1.0'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_evidence_dispute_id', 'evidence', ['dispute_id'])

    # 6. Policy Rules table
    op.create_table(
        'policy_rules',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('rule_code', sa.String(length=100), unique=True, nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('parameters_json', sa.Text(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('version', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    # 7. Approval Requests table
    op.create_table(
        'approval_requests',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('dispute_id', sa.String(length=36), sa.ForeignKey('disputes.id'), nullable=False),
        sa.Column('required_role', sa.String(length=50), nullable=False, server_default='RISK_LEAD'),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='PENDING'),
        sa.Column('requester_agent', sa.String(length=100), nullable=False),
        sa.Column('approved_by', sa.String(length=100), nullable=True),
        sa.Column('review_notes', sa.Text(), nullable=True),
        sa.Column('resolved_at', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_approval_requests_dispute_id', 'approval_requests', ['dispute_id'])

    # 8. Execution Ledger table
    op.create_table(
        'execution_ledger',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('dispute_id', sa.String(length=36), sa.ForeignKey('disputes.id'), nullable=False),
        sa.Column('transaction_id', sa.String(length=36), sa.ForeignKey('transactions.id'), nullable=False),
        sa.Column('action_type', sa.String(length=100), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='SUCCESS'),
        sa.Column('idempotency_key', sa.String(length=128), unique=True, nullable=False),
        sa.Column('mcp_execution_ref', sa.String(length=128), nullable=False),
        sa.Column('signed_token_hash', sa.String(length=64), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_execution_ledger_dispute_id', 'execution_ledger', ['dispute_id'])
    op.create_index('ix_execution_ledger_transaction_id', 'execution_ledger', ['transaction_id'])

    # 9. Audit Logs table (with monotonic sequence_id and hash chain)
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('sequence_id', sa.Integer(), nullable=False),
        sa.Column('trace_id', sa.String(length=64), nullable=False),
        sa.Column('event_type', sa.String(length=100), nullable=False),
        sa.Column('actor_type', sa.String(length=50), nullable=False),
        sa.Column('actor_id', sa.String(length=100), nullable=False),
        sa.Column('event_payload', sa.Text(), nullable=False),
        sa.Column('prev_hash', sa.String(length=64), nullable=False),
        sa.Column('current_hash', sa.String(length=64), nullable=False),
        sa.Column('created_at', sa.String(length=50), nullable=False),
    )
    op.create_index('ix_audit_logs_sequence_id', 'audit_logs', ['sequence_id'], unique=True)
    op.create_index('ix_audit_logs_trace_id', 'audit_logs', ['trace_id'])
    op.create_index('ix_audit_logs_event_type', 'audit_logs', ['event_type'])

    # 10. Consumed Policy Tokens table (single-use replay defense)
    op.create_table(
        'consumed_policy_tokens',
        sa.Column('token_hash', sa.String(length=64), primary_key=True),
        sa.Column('dispute_id', sa.String(length=36), sa.ForeignKey('disputes.id'), nullable=False),
        sa.Column('transaction_id', sa.String(length=36), sa.ForeignKey('transactions.id'), nullable=False),
        sa.Column('merchant_id', sa.String(length=36), sa.ForeignKey('merchants.id'), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('action_type', sa.String(length=100), nullable=False),
        sa.Column('policy_version', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('idempotency_key', sa.String(length=128), nullable=False),
        sa.Column('consumed_by', sa.String(length=100), nullable=False),
        sa.Column('consumed_at', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_consumed_policy_tokens_dispute_id', 'consumed_policy_tokens', ['dispute_id'])
    op.create_index('ix_consumed_policy_tokens_transaction_id', 'consumed_policy_tokens', ['transaction_id'])
    op.create_index('ix_consumed_policy_tokens_merchant_id', 'consumed_policy_tokens', ['merchant_id'])


def downgrade() -> None:
    op.drop_table('consumed_policy_tokens')
    op.drop_table('audit_logs')
    op.drop_table('execution_ledger')
    op.drop_table('approval_requests')
    op.drop_table('policy_rules')
    op.drop_table('evidence')
    op.drop_table('disputes')
    op.drop_table('transactions')
    op.drop_table('accounts')
    op.drop_table('merchants')
