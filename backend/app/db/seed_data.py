import asyncio
import json
import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.base import Base
from app.db.session import AsyncSessionLocal, engine
from app.db.models import (
    Account,
    Dispute,
    Evidence,
    Merchant,
    PolicyRule,
    Transaction,
)
from app.db.audit_service import AuditService


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def seed_database():
    await init_db()

    async with AsyncSessionLocal() as session:
        # Check if already seeded
        result = await session.execute(select(Merchant).limit(1))
        if result.scalar_one_or_none():
            print("Database already seeded. Skipping initial seed.")
            return

        print("Seeding synthetic merchants...")
        merchants = [
            Merchant(
                id="mch_apex_01",
                name="Apex Cloud Services",
                tier="PREMIUM",
                risk_score=0.04,
                status="ACTIVE",
                dispute_rate=0.002,
                payout_frozen=False,
            ),
            Merchant(
                id="mch_quickbite_02",
                name="QuickBite Food Delivery",
                tier="STANDARD",
                risk_score=0.15,
                status="ACTIVE",
                dispute_rate=0.008,
                payout_frozen=False,
            ),
            Merchant(
                id="mch_shadow_03",
                name="ShadowDropship Global",
                tier="STANDARD",
                risk_score=0.85,
                status="PROBATION",
                dispute_rate=0.038,
                payout_frozen=False,
            ),
            Merchant(
                id="mch_zenith_04",
                name="Zenith Luxury Goods",
                tier="ENTERPRISE",
                risk_score=0.02,
                status="ACTIVE",
                dispute_rate=0.001,
                payout_frozen=False,
            ),
        ]
        session.add_all(merchants)

        print("Seeding synthetic customer accounts...")
        accounts = [
            Account(
                id="acc_cust_101",
                customer_id="CUST-IND-1001",
                email="ananya.sharma@example.in",
                risk_tier="LOW",
                total_chargebacks=0,
                status="ACTIVE",
            ),
            Account(
                id="acc_cust_102",
                customer_id="CUST-IND-1002",
                email="rohit.verma@example.in",
                risk_tier="LOW",
                total_chargebacks=1,
                status="ACTIVE",
            ),
            Account(
                id="acc_cust_103",
                customer_id="CUST-IND-1003",
                email="suspicious.buyer@example.in",
                risk_tier="HIGH",
                total_chargebacks=4,
                status="FLAGGED",
            ),
            Account(
                id="acc_cust_104",
                customer_id="CUST-IND-1004",
                email="vikram.malhotra@example.in",
                risk_tier="MEDIUM",
                total_chargebacks=1,
                status="ACTIVE",
            ),
        ]
        session.add_all(accounts)

        print("Seeding synthetic transactions...")
        now = datetime.now(timezone.utc)
        transactions = [
            # Low amount transaction eligible for auto-refund
            Transaction(
                id="txn_1001",
                merchant_id="mch_quickbite_02",
                account_id="acc_cust_101",
                amount=750.00,
                currency="INR",
                status="SETTLED",
                payment_method="UPI",
                refunded_amount=0.0,
                idempotency_key="tx_idemp_1001",
                metadata_json=json.dumps({"order_ref": "QB-9912", "item": "Gourmet Meal Box"}),
            ),
            # High amount transaction requiring human approval
            Transaction(
                id="txn_1002",
                merchant_id="mch_zenith_04",
                account_id="acc_cust_104",
                amount=45000.00,
                currency="INR",
                status="SETTLED",
                payment_method="CARD",
                refunded_amount=0.0,
                idempotency_key="tx_idemp_1002",
                metadata_json=json.dumps({"order_ref": "ZN-8831", "item": "Designer Chronograph Watch"}),
            ),
            # Medium amount transaction with suspicious merchant
            Transaction(
                id="txn_1003",
                merchant_id="mch_shadow_03",
                account_id="acc_cust_102",
                amount=6200.00,
                currency="INR",
                status="SETTLED",
                payment_method="UPI",
                refunded_amount=0.0,
                idempotency_key="tx_idemp_1003",
                metadata_json=json.dumps({"order_ref": "SD-1102", "item": "Wireless Smart Earbuds"}),
            ),
            # High-risk account transaction
            Transaction(
                id="txn_1004",
                merchant_id="mch_apex_01",
                account_id="acc_cust_103",
                amount=8990.00,
                currency="INR",
                status="SETTLED",
                payment_method="CARD",
                refunded_amount=0.0,
                idempotency_key="tx_idemp_1004",
                metadata_json=json.dumps({"order_ref": "APX-5512", "item": "Cloud Compute Subscription"}),
            ),
            # Transaction beyond 60-day dispute window
            Transaction(
                id="txn_1005",
                merchant_id="mch_quickbite_02",
                account_id="acc_cust_101",
                amount=1200.00,
                currency="INR",
                status="SETTLED",
                payment_method="UPI",
                refunded_amount=0.0,
                idempotency_key="tx_idemp_1005",
                created_at=now - timedelta(days=75),
                metadata_json=json.dumps({"order_ref": "QB-7714", "item": "Catering Order", "settled_at": (now - timedelta(days=75)).isoformat()}),
            ),
        ]
        session.add_all(transactions)

        print("Seeding deterministic policy rules...")
        rules = [
            PolicyRule(
                rule_code="RULE_MAX_AUTO_REFUND",
                name="Maximum Automated Refund Cap",
                description="Refund requests up to ₹10,000 may be auto-approved if all other policy checks pass. Transactions exceeding this strictly require human review.",
                parameters_json=json.dumps({"max_auto_amount": 10000.0, "currency": "INR"}),
                is_active=True,
                version=1,
            ),
            PolicyRule(
                rule_code="RULE_DISPUTE_WINDOW",
                name="Regulatory Dispute Window Check",
                description="Disputes filed more than 60 days after transaction settlement are ineligible for automated or standard processing.",
                parameters_json=json.dumps({"max_window_days": 60}),
                is_active=True,
                version=1,
            ),
            PolicyRule(
                rule_code="RULE_MERCHANT_DISPUTE_VELOCITY",
                name="Merchant Risk & Dispute Velocity Check",
                description="Merchants on probation or with dispute rates exceeding 1.5% require operational investigation before refund processing.",
                parameters_json=json.dumps({"max_dispute_rate": 0.015, "prohibited_statuses": ["SUSPENDED", "PROBATION"]}),
                is_active=True,
                version=1,
            ),
            PolicyRule(
                rule_code="RULE_CUSTOMER_CHARGEBACK_CAP",
                name="Customer Abuse & Chargeback Cap",
                description="Customers with 3 or more historical chargebacks or flagged accounts cannot receive auto-refunds.",
                parameters_json=json.dumps({"max_prior_chargebacks": 3, "disallowed_tiers": ["HIGH"]}),
                is_active=True,
                version=1,
            ),
            PolicyRule(
                rule_code="RULE_DUPLICATE_CLAIM_CHECK",
                name="Duplicate Dispute & Double Refund Prevention",
                description="Rejects any refund or dispute where the cumulative refunded amount exceeds the transaction amount, or duplicate active claims exist.",
                parameters_json=json.dumps({"enforce_idempotency": True}),
                is_active=True,
                version=1,
            ),
        ]
        session.add_all(rules)
        await session.commit()

        # Seed genesis audit log
        print("Initializing tamper-evident audit ledger genesis record...")
        await AuditService.append_event(
            session=session,
            trace_id="trace_genesis_0001",
            event_type="SYSTEM_GENESIS",
            actor_type="SYSTEM",
            actor_id="system_initializer",
            payload={"system": "SentinelPay", "environment": settings.ENVIRONMENT, "version": settings.VERSION},
        )

        print("Database seeding completed successfully.")


if __name__ == "__main__":
    asyncio.run(seed_database())
