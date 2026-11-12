import base64
import html
import re
import unicodedata
from typing import Any, Dict, List, Optional, Tuple
from pydantic import BaseModel, Field


class InjectionCheckResult(BaseModel):
    is_safe: bool
    threat_detected: bool
    threat_type: Optional[str] = None
    confidence: float = 0.0
    original_text: str = ""
    normalized_text: str = ""
    sanitized_text: str = ""
    matched_pattern: Optional[str] = None
    is_untrusted_evidence: bool = False
    warnings: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class PromptInjectionShield:
    """
    Advanced Multi-Stage Defense-in-Depth Shield against direct and indirect prompt injection.
    Features:
    - Dedicated Confusable Homoglyph Translation (Cyrillic & Greek lookalikes)
    - Unicode NFKD Normalization
    - Zero-Width & Invisible Character Stripping
    - Markdown & HTML Obfuscation De-cloaking
    - Bounded Base64 Payload Inspection (ReDoS-safe)
    - Preservation of Original and Normalized Text for Forensic Audit
    - Untrusted Evidence Tagging & Warning Tracking

    Architectural Principle:
    Prompt injection heuristics are defense-in-depth filters; they NEVER substitute
    for deterministic backend authorization and signed policy tokens.
    """

    # Cyrillic, Greek, and mathematical lookalikes mapped directly to Latin ASCII
    CONFUSABLE_MAP = {
        # Cyrillic lowercase
        "\u0430": "a", "\u0431": "b", "\u0432": "b", "\u0433": "r", "\u0434": "d",
        "\u0435": "e", "\u0454": "e", "\u0436": "zh", "\u0437": "z", "\u0456": "i",
        "\u0457": "i", "\u0439": "j", "\u0458": "j", "\u043a": "k", "\u043b": "l",
        "\u043c": "m", "\u043d": "h", "\u043e": "o", "\u043f": "n", "\u0440": "p",
        "\u0441": "c", "\u0442": "t", "\u0443": "y", "\u0444": "f", "\u0445": "x",
        "\u0446": "ts", "\u0447": "ch", "\u0448": "sh", "\u0449": "shch", "\u044a": "",
        "\u044b": "y", "\u044c": "", "\u044d": "e", "\u044e": "yu", "\u044f": "ya",
        "\u0455": "s",
        # Cyrillic uppercase
        "\u0410": "A", "\u0411": "B", "\u0412": "B", "\u0413": "R", "\u0414": "D",
        "\u0415": "E", "\u0404": "E", "\u0416": "ZH", "\u0417": "Z", "\u0406": "I",
        "\u0407": "I", "\u0418": "N", "\u0419": "J", "\u0408": "J", "\u041a": "K",
        "\u041b": "L", "\u041c": "M", "\u041d": "H", "\u041e": "O", "\u041f": "N",
        "\u0420": "P", "\u0421": "C", "\u0422": "T", "\u0423": "Y", "\u0424": "F",
        "\u0425": "X", "\u0425": "X", "\u0405": "S",
        # Greek lowercase & uppercase
        "\u03b1": "a", "\u0391": "A", "\u03b2": "b", "\u0392": "B", "\u03b3": "g",
        "\u03b5": "e", "\u0395": "E", "\u03b6": "z", "\u03b7": "n", "\u0397": "H",
        "\u03b9": "i", "\u0399": "I", "\u03ba": "k", "\u039a": "K", "\u03bd": "v",
        "\u03bf": "o", "\u039f": "O", "\u03c1": "p", "\u03a1": "P", "\u03c4": "t",
        "\u03a4": "T", "\u03c5": "u", "\u03a5": "Y", "\u03c7": "x", "\u03a7": "X",
        "\u03c9": "w", "\u03a9": "W",
    }

    # Zero-width spaces, joiners, soft-hyphens, bidi direction overrides, invisible separators
    ZERO_WIDTH_CHARS = {
        "\u200b", "\u200c", "\u200d", "\ufeff", "\u00ad", "\u200e", "\u200f",
        "\u202a", "\u202b", "\u202c", "\u202d", "\u202e", "\u2060", "\u2061",
        "\u2062", "\u2063", "\u2064", "\u2066", "\u2067", "\u2068", "\u2069",
        "\ufff9", "\ufffa", "\ufffb",
    }

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
        (r"(?i)\bnote\s+to\s+(the\s+)?(ai\s+agent|ai|agent|assistant|llm)\s*:\s*", "INDIRECT_INSTRUCTION_IN_EVIDENCE"),
        (r"(?i)\binstruction\s*:\s*issue\s+refund\b", "INDIRECT_INSTRUCTION_IN_EVIDENCE"),
        (r"(?i)\bmerchant_verified_override\b", "INDIRECT_INSTRUCTION_IN_EVIDENCE"),
        (r"(?i)\bhidden\s+instruction\s*:\s*", "INDIRECT_INSTRUCTION_IN_EVIDENCE"),
        (r"(?i)\bforce_verdict\s*=\s*['\"]?APPROVED['\"]?\b", "PARAMETER_INJECTION"),
        (r"(?i)\bprompt\s*:\s*override\b", "INDIRECT_INSTRUCTION_IN_EVIDENCE"),
    ]

    @classmethod
    def normalize_text(cls, text: str) -> Tuple[str, List[str]]:
        """
        Executes complete multi-stage canonicalization pipeline:
        1. Unicode NFKD decomposition (converts mathematical script/bold/fullwidth)
        2. Dedicated Confusable Homoglyph mapping (Cyrillic & Greek lookalikes)
        3. Zero-width and invisible character stripping
        4. Markdown and HTML formatting de-cloaking
        Returns: (canonicalized_text, list_of_detected_anomalies)
        """
        anomalies: List[str] = []

        # Stage 1: NFKD normalization
        decomposed = unicodedata.normalize("NFKD", text)

        # Stage 2: Confusable homoglyph translation
        homoglyph_found = False
        chars = []
        for ch in decomposed:
            if ch in cls.CONFUSABLE_MAP:
                homoglyph_found = True
                chars.append(cls.CONFUSABLE_MAP[ch])
            else:
                chars.append(ch)
        mapped = "".join(chars)
        if homoglyph_found:
            anomalies.append("Contains confusable homoglyphs (Cyrillic/Greek lookalikes)")

        # Stage 3: Zero-width & invisible character removal
        zero_width_found = False
        cleaned_chars = []
        for ch in mapped:
            if ch in cls.ZERO_WIDTH_CHARS:
                zero_width_found = True
            else:
                cleaned_chars.append(ch)
        no_zw = "".join(cleaned_chars)
        if zero_width_found:
            anomalies.append("Contains zero-width or invisible Unicode control characters")

        # Stage 4: Formatting and HTML de-cloaking
        # Strip HTML comments
        decloaked = re.sub(r"<!--.*?-->", "", no_zw, flags=re.DOTALL)
        # Strip HTML/XML tags
        decloaked = re.sub(r"<[^>]+>", " ", decloaked)
        # De-cloak intra-word markdown formatting (*, _, ~, ^, backtick)
        # e.g., i*g*n*o*r*e -> ignore, i_g_n_o_r_e -> ignore
        decloaked = re.sub(r"(?<=\w)[*_\~\^\x60]+(?=\w)", "", decloaked)
        # Collapse multiple spaces
        normalized = re.sub(r"\s+", " ", decloaked).strip()

        return normalized, anomalies

    @classmethod
    def check_bounded_base64_payloads(cls, text: str, max_candidates: int = 10, max_len: int = 4096) -> Tuple[bool, Optional[str]]:
        """
        Bounded, ReDoS-safe Base64 payload inspection.
        Enforces maximum token lengths and candidate limits to protect against DoS.
        """
        b64_pattern = re.compile(r"(?:^|[\s,.:;])([A-Za-z0-9+/]{16,}={0,2})(?:$|[\s,.:;])")
        inspected = 0
        for match in b64_pattern.finditer(text):
            if inspected >= max_candidates:
                break
            candidate = match.group(1).strip()
            if len(candidate) > max_len:
                continue
            inspected += 1
            try:
                raw_bytes = base64.b64decode(candidate, validate=True)
                if len(raw_bytes) > 8192:
                    continue
                decoded = raw_bytes.decode("utf-8", errors="ignore")
                norm_decoded, _ = cls.normalize_text(decoded)
                for pattern, threat in cls.DIRECT_INJECTION_PATTERNS:
                    if re.search(pattern, norm_decoded):
                        return True, f"Base64 obfuscated {threat}: '{candidate[:15]}...'"
                for pattern, threat in cls.INDIRECT_INJECTION_PATTERNS:
                    if re.search(pattern, norm_decoded):
                        return True, f"Base64 obfuscated {threat} in evidence: '{candidate[:15]}...'"
            except Exception:
                continue
        return False, None

    @classmethod
    def scan_and_sanitize(cls, text: str, is_untrusted_evidence: bool = False) -> InjectionCheckResult:
        """
        Scans input text through the multi-stage defense pipeline.
        Treats extracted OCR, PDF, and merchant evidence documents as untrusted input.
        Preserves original_text, normalized_text, and returns safely sanitized content.
        """
        if not text:
            return InjectionCheckResult(
                is_safe=True,
                threat_detected=False,
                original_text="",
                normalized_text="",
                sanitized_text="",
                is_untrusted_evidence=is_untrusted_evidence,
            )

        original_text = text
        normalized, anomalies = cls.normalize_text(text)
        warnings: List[str] = list(anomalies)

        # 1. Bounded Base64 detection
        has_b64_threat, b64_threat_msg = cls.check_bounded_base64_payloads(normalized)
        if has_b64_threat:
            warnings.append(f"Security Alert: {b64_threat_msg}")
            return InjectionCheckResult(
                is_safe=False,
                threat_detected=True,
                threat_type="OBFUSCATED_BASE64_INJECTION",
                confidence=0.98,
                original_text=original_text,
                normalized_text=normalized,
                sanitized_text="[REDACTED_ADVERSARIAL_PAYLOAD]",
                matched_pattern=b64_threat_msg,
                is_untrusted_evidence=is_untrusted_evidence,
                warnings=warnings,
                metadata={"threat_source": "base64_obfuscation", "anomalies": anomalies},
            )

        # 2. Direct Injection pattern matching on canonicalized or original text
        for pattern, threat in cls.DIRECT_INJECTION_PATTERNS:
            match = re.search(pattern, normalized) or re.search(pattern, text)
            if match:
                warnings.append(f"Direct injection pattern detected: {threat}")
                sanitized = re.sub(pattern, "[FILTERED_ADVERSARIAL_PROMPT]", normalized)
                return InjectionCheckResult(
                    is_safe=False,
                    threat_detected=True,
                    threat_type=threat,
                    confidence=0.95,
                    original_text=original_text,
                    normalized_text=normalized,
                    sanitized_text=html.escape(sanitized),
                    matched_pattern=match.group(0),
                    is_untrusted_evidence=is_untrusted_evidence,
                    warnings=warnings,
                    metadata={"pattern": pattern, "source": "direct_input", "anomalies": anomalies},
                )

        # 3. Indirect Injection pattern matching on canonicalized or original text
        for pattern, threat in cls.INDIRECT_INJECTION_PATTERNS:
            match = re.search(pattern, normalized) or re.search(pattern, text)
            if match:
                confidence = 0.99 if is_untrusted_evidence else 0.90
                warnings.append(f"Indirect injection pattern detected: {threat}")
                sanitized = re.sub(pattern, "[FILTERED_INDIRECT_INJECTION]", normalized)
                return InjectionCheckResult(
                    is_safe=False,
                    threat_detected=True,
                    threat_type=threat,
                    confidence=confidence,
                    original_text=original_text,
                    normalized_text=normalized,
                    sanitized_text=html.escape(sanitized),
                    matched_pattern=match.group(0),
                    is_untrusted_evidence=is_untrusted_evidence,
                    warnings=warnings,
                    metadata={"pattern": pattern, "source": "untrusted_evidence", "anomalies": anomalies},
                )

        # Clean text
        return InjectionCheckResult(
            is_safe=True,
            threat_detected=False,
            threat_type=None,
            confidence=0.0,
            original_text=original_text,
            normalized_text=normalized,
            sanitized_text=html.escape(text),
            matched_pattern=None,
            is_untrusted_evidence=is_untrusted_evidence,
            warnings=warnings,
            metadata={"anomalies": anomalies},
        )
