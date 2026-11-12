import re
from typing import Any, Dict, List, Union


class PIIScrubber:
    """
    Financial PII scrubber for sensitive customer identifiers.
    Applies Luhn verification for card numbers and Indian financial identifier patterns (PAN, Aadhaar).
    """

    # Regex patterns with strict boundary checks
    CARD_PATTERN = re.compile(r"(?<!\d)(?:\d[ -]*?){13,19}(?!\d)")
    PAN_PATTERN = re.compile(r"(?<![A-Z0-9])[A-Z]{5}[0-9]{4}[A-Z]{1}(?![A-Z0-9])")
    AADHAAR_PATTERN = re.compile(r"(?<!\d)[2-9]\d{3}[ -]?\d{4}[ -]?\d{4}(?!\d)")
    PHONE_PATTERN = re.compile(r"(?<!\d)(?:\+?91[ -]?)?[6789]\d{9}(?!\d)")
    EMAIL_PATTERN = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b")

    @staticmethod
    def luhn_checksum(card_number_str: str) -> bool:
        digits = [int(c) for c in card_number_str if c.isdigit()]
        if len(digits) < 13 or len(digits) > 19:
            return False
        odd_digits = digits[-1::-2]
        even_digits = digits[-2::-2]
        total = sum(odd_digits)
        for d in even_digits:
            doubled = d * 2
            total += doubled if doubled < 10 else (doubled - 9)
        return total % 10 == 0

    @classmethod
    def mask_card(cls, match: re.Match) -> str:
        raw = match.group(0)
        digits_only = re.sub(r"\D", "", raw)
        if cls.luhn_checksum(digits_only):
            last4 = digits_only[-4:]
            return f"[CARD_REDACTED_***{last4}]"
        return raw

    @classmethod
    def scrub_text(cls, text: str) -> str:
        if not text or not isinstance(text, str):
            return text

        # 1. Redact credit/debit card numbers with Luhn check
        cleaned = cls.CARD_PATTERN.sub(cls.mask_card, text)

        # 2. Redact PAN numbers
        cleaned = cls.PAN_PATTERN.sub("[PAN_REDACTED]", cleaned)

        # 3. Redact Aadhaar numbers (with strict negative lookahead/lookbehind)
        cleaned = cls.AADHAAR_PATTERN.sub("[AADHAAR_REDACTED]", cleaned)

        # 4. Redact Phone numbers
        cleaned = cls.PHONE_PATTERN.sub("[PHONE_REDACTED]", cleaned)

        # 5. Redact Email addresses
        cleaned = cls.EMAIL_PATTERN.sub("[EMAIL_REDACTED]", cleaned)

        return cleaned

    @classmethod
    def scrub_payload(cls, data: Union[Dict[str, Any], List[Any], str, Any]) -> Any:
        if isinstance(data, str):
            return cls.scrub_text(data)
        elif isinstance(data, dict):
            return {k: cls.scrub_payload(v) for k, v in data.items()}
        elif isinstance(data, list):
            return [cls.scrub_payload(item) for item in data]
        return data
