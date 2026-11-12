import hashlib
import hmac
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
import jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Dict[str, Any]:
    """
    Decodes and validates a standard user/service JWT access token.
    Raises jwt.PyJWTError on failure.
    """
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    return payload


def create_policy_execution_token(
    dispute_id: str,
    transaction_id: str,
    amount: float,
    action_type: str,
    idempotency_key: str,
    merchant_id: str,
    approved_by: str,
    role: str = "POLICY_ENGINE",
    policy_version: int = 1,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Issues a short-lived cryptographically signed token generated solely by the
    Deterministic Policy Engine or an authorized Human Risk Lead.
    The Custom MCP Financial Gateway strictly requires this token before executing
    destructive or financial operations (e.g. execute_refund, issue_credit).
    """
    now = datetime.now(timezone.utc)
    if expires_delta is not None:
        expire = now + expires_delta
    else:
        expire = now + timedelta(seconds=settings.POLICY_TOKEN_EXPIRE_SECONDS)
    payload = {
        "iss": "sentinelpay:policy_engine",
        "sub": dispute_id,
        "transaction_id": transaction_id,
        "amount": round(float(amount), 2),
        "action_type": action_type,
        "idempotency_key": idempotency_key,
        "merchant_id": merchant_id,
        "approved_by": approved_by,
        "role": role,
        "policy_version": policy_version,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    return jwt.encode(payload, settings.POLICY_TOKEN_SECRET, algorithm=settings.ALGORITHM)


def verify_policy_execution_token(token: str) -> Dict[str, Any]:
    """
    Validates the PolicyToken. Raises jwt.PyJWTError if invalid, expired, or tampered with.
    """
    payload = jwt.decode(token, settings.POLICY_TOKEN_SECRET, algorithms=[settings.ALGORITHM])
    if payload.get("iss") != "sentinelpay:policy_engine":
        raise jwt.InvalidIssuerError("Invalid policy token issuer")
    if not payload.get("sub") or not payload.get("transaction_id") or not payload.get("merchant_id"):
        raise jwt.InvalidTokenError("Malformed policy token: missing critical claims (sub/transaction_id/merchant_id)")
    return payload
