import base64
import re
from typing import Any, Dict, List, Optional, Tuple
from pydantic import BaseModel


class InjectionCheckResult(BaseModel):
    is_safe: bool
    threat_detected: bool
    threat_type: Optional[str] = None
    confidence: float = 0.0
    sanitized_text: str
    matched_pattern: Optional[str] = None
    metadata: Dict[str, Any] = {}


class PromptInjectionShield:
    """
    Defense-in-depth shield against direct and indirect prompt injections.
    Protects multi-agent orchestration from adversarial instruction hijacks.
    """

    DIRECT_INJECTION_PATTERNS = [
        (r"(?i)\bignore\s+(all\s+)?(previous|prior|above)\s+(instructions|rules|prompts|guidelines)\b", "INSTRUCTION_OVERRIDE"),
        (r"(?i)\bdisregard\s+(all\s+)?(previous|prior)\s+(rules|policies|instructions)\b", "INSTRUCTION_OVERRIDE"),
        (r"(?i)\bforget\s+(all\s+)?(previous|prior)\s+(restrictions|instructions)\b", "INSTRUCTION_OVERRIDE"),
        (r"(?i)\byou\s+are\s+now\s+(in\s+)?(developer\s+mode|dan\s+mode|god\s+mode|maintenance\s+mode)\b", "JAILBREAK_PERSONA"),
        (r"(?i)\bpretend\s+you\s+are\s+(a\s+)?(risk\s+lead|admin|system\s+administrator|superuser)\b", "ROLEPLAY_ESCALATION"),
        (r"(?i)\bsystem\s+override\s*:\s*", "SYSTEM_OVERRIDE_DELIMITER"),
        (r"(?i)\bexecute\s+(immediately|now)\s+without\s+(checking|policy|verification)\b", "POLICY_BYPASS_ATTEMPT"),
        (r"(?i)\bgrant\s+(full\s+)?refund\s+(regardless|unconditionally|instantly)\b", "UNAUTHORIZED_FINANCIAL_DIRECTIVE"),
        (r"(?i)\bdisable\s+(the\s+)?policy\s+engine\b", "POLICY_BYPASS_ATTEMPT"),
        (r"(?i)\[\/?(system|instruction|admin|override)\]", "SPOOFED_SYSTEM_TAGS"),
        (r"(?i)<\/?(system|instruction|admin|override)>", "SPOOFED_XML_TAGS"),
    ]

    INDIRECT_INJECTION_PATTERNS = [
        (r"(?i)\bnote\s+to\s+(the\s+)?(ai|agent|assistant|llm)\s*:\s*", "INDIRECT_INSTRUCTION_IN_EVIDENCE"),
        (r"(?i)\binstruction\s*:\s*issue\s+refund\b", "INDIRECT_INSTRUCTION_IN_EVIDENCE"),
        (r"(?i)\bmerchant_verified_override\b", "INDIRECT_INSTRUCTION_IN_EVIDENCE"),
        (r"(?i)\bhidden\s+instruction\s*:\s*", "INDIRECT_INSTRUCTION_IN_EVIDENCE"),
        (r"(?i)\bforce_verdict\s*=\s*['\"]?APPROVED['\"]?\b", "PARAMETER_INJECTION"),
    ]

    @classmethod
    def clean_unicode_anomalies(cls, text: str) -> str:
        # Strip zero-width spaces, zero-width joiners, and hidden control characters
        zero_width_chars = ["\u200b", "\u200c", "\u200d", "\ufeff", "\u00ad", "\u202a", "\u202b", "\u202c"]
        for ch in zero_width_chars:
            text = text.replace(ch, "")
        return text

    @classmethod
    def check_base64_payloads(cls, text: str) -> Tuple[bool, Optional[str]]:
        """
        Inspects potential base64 embedded payloads for hidden instructions.
        """
        # Matches base64 candidate strings delimited by whitespace or punctuation
        b64_pattern = re.compile(r"(?:^|[\s,.:;])([A-Za-z0-9+/]{16,}={0,2})(?:$|[\s,.:;])")
        for match in b64_pattern.finditer(text):
            candidate = match.group(1).strip()
            try:
                decoded = base64.b64decode(candidate, validate=True).decode("utf-8", errors="ignore")
                for pattern, threat in cls.DIRECT_INJECTION_PATTERNS:
                    if re.search(pattern, decoded):
                        return True, f"Base64 obfuscated {threat}: '{candidate[:15]}...'"
            except Exception:
                continue
        return False, None

    @classmethod
    def scan_and_sanitize(cls, text: str, is_untrusted_evidence: bool = False) -> InjectionCheckResult:
        if not text:
            return InjectionCheckResult(is_safe=True, threat_detected=False, sanitized_text="")

        normalized = cls.clean_unicode_anomalies(text)

        # 1. Check for Base64 obfuscated payload
        has_b64_threat, b64_threat_msg = cls.check_base64_payloads(normalized)
        if has_b64_threat:
            return InjectionCheckResult(
                is_safe=False,
                threat_detected=True,
                threat_type="OBFUSCATED_BASE64_INJECTION",
                confidence=0.98,
                sanitized_text="[REDACTED_ADVERSARIAL_PAYLOAD]",
                matched_pattern=b64_threat_msg,
                metadata={"threat_source": "base64_obfuscation"},
            )

        # 2. Check for Direct Injection patterns
        for pattern, threat in cls.DIRECT_INJECTION_PATTERNS:
            match = re.search(pattern, normalized)
            if match:
                return InjectionCheckResult(
                    is_safe=False,
                    threat_detected=True,
                    threat_type=threat,
                    confidence=0.95,
                    sanitized_text=re.sub(pattern, "[FILTERED_ADVERSARIAL_PROMPT]", normalized),
                    matched_pattern=match.group(0),
                    metadata={"pattern": pattern},
                )

        # 3. Check for Indirect Injection patterns (particularly in evidence documents)
        for pattern, threat in cls.INDIRECT_INJECTION_PATTERNS:
            match = re.search(pattern, normalized)
            if match:
                confidence = 0.99 if is_untrusted_evidence else 0.90
                return InjectionCheckResult(
                    is_safe=False,
                    threat_detected=True,
                    threat_type=threat,
                    confidence=confidence,
                    sanitized_text=re.sub(pattern, "[FILTERED_INDIRECT_INJECTION]", normalized),
                    matched_pattern=match.group(0),
                    metadata={"pattern": pattern, "source": "untrusted_evidence"},
                )

        return InjectionCheckResult(
            is_safe=True,
            threat_detected=False,
            threat_type=None,
            confidence=0.0,
            sanitized_text=normalized,
            matched_pattern=None,
        )
