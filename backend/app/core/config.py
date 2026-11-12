import os
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "SentinelPay"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Security & JWT Auth
    SECRET_KEY: str = "sentinelpay_super_secure_enterprise_dev_secret_key_32bytes_min!"
    POLICY_TOKEN_SECRET: str = "sentinelpay_policy_execution_secret_key_9999!"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120
    POLICY_TOKEN_EXPIRE_SECONDS: int = 60  # Short-lived policy execution authorization token

    # Database: Defaults to SQLite for local development; supports PostgreSQL in Docker/Prod
    DATABASE_URL: str = "sqlite+aiosqlite:///./sentinelpay.db"

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:8000",
    ]

    # Deterministic Policy Thresholds
    POLICY_MAX_AUTO_REFUND_AMOUNT: float = 10000.0  # ₹10,000 threshold for automated refund
    POLICY_MAX_DISPUTE_WINDOW_DAYS: int = 60  # 60 days standard regulatory dispute window
    POLICY_MERCHANT_DISPUTE_RATIO_ALERT: float = 0.01  # 1% dispute ratio triggers review
    POLICY_CUSTOMER_CHARGEBACK_LIMIT: int = 3  # Max chargebacks per customer before mandatory escalation
    AGENT_MAX_ITERATIONS: int = 6  # Bounded execution guard against infinite loops

    # MCP Gateway Settings
    MCP_SERVER_PORT: int = 8001
    MCP_SERVER_HOST: str = "127.0.0.1"

    # Observability
    OTEL_EXPORTER_OTLP_ENDPOINT: str = "http://localhost:4317"
    ENABLE_OTEL_TRACING: bool = False

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
