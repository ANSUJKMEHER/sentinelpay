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
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        f"sqlite+aiosqlite:///{os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'sentinelpay.db')).replace(os.sep, '/')}"
    )
    CHECKPOINT_DB_PATH: str = os.getenv(
        "CHECKPOINT_DB_PATH",
        os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'sentinelpay_checkpoints.db')).replace(os.sep, '/')
    )
    USE_PERSISTENT_CHECKPOINTER: bool = True

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

    # LLM Settings (OpenAI-compatible)
    LLM_PROVIDER: str = "mock"  # "mock" | "openai"
    OPENAI_API_KEY: str = ""
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"
    OPENAI_MODEL: str = "gpt-4o-mini"
    LLM_TIMEOUT_SECONDS: float = 10.0
    LLM_MAX_RETRIES: int = 2
    LLM_ALLOW_MOCK_FALLBACK: bool = True  # If False, raises LLMProviderUnavailableError in staging/prod

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
