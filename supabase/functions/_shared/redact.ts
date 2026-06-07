// Server-side redaction of prompt text before it is written to `prompts`
// (Beta Launch Plan §8). Strips API keys and obvious PII. This is best-effort
// defence-in-depth, NOT a guarantee — it is applied on top of the hard rule
// that screenshots/OCR text never reach this table at all.

interface RedactRule {
  name: string;
  pattern: RegExp;
  replacement: string;
}

const RULES: RedactRule[] = [
  // Anthropic keys (check before the generic sk- rule).
  {
    name: "anthropic_key",
    pattern: /sk-ant-[A-Za-z0-9_-]{20,}/g,
    replacement: "[REDACTED_API_KEY]",
  },
  // OpenAI-style keys: sk-, sk-proj-, etc.
  {
    name: "openai_key",
    pattern: /sk-(?:proj-)?[A-Za-z0-9_-]{16,}/g,
    replacement: "[REDACTED_API_KEY]",
  },
  // Google API keys.
  {
    name: "google_key",
    pattern: /AIza[0-9A-Za-z_-]{35}/g,
    replacement: "[REDACTED_API_KEY]",
  },
  // Bearer tokens embedded in text.
  {
    name: "bearer",
    pattern: /\bBearer\s+[A-Za-z0-9._-]{20,}/gi,
    replacement: "Bearer [REDACTED_TOKEN]",
  },
  // Email addresses.
  {
    name: "email",
    pattern: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
    replacement: "[REDACTED_EMAIL]",
  },
  // Card-like numbers: 13–16 digits with optional spaces/dashes.
  {
    name: "card",
    pattern: /\b(?:\d[ -]?){13,16}\b/g,
    replacement: "[REDACTED_NUMBER]",
  },
  // Phone numbers: optional +, 9–15 digits with separators.
  {
    name: "phone",
    pattern: /(?<!\w)\+?\d[\d ().-]{8,}\d(?!\w)/g,
    replacement: "[REDACTED_PHONE]",
  },
];

/** Redact API keys and obvious PII from prompt text. */
export function redact(input: string | null | undefined): string {
  if (!input) return "";
  let out = String(input);
  for (const rule of RULES) {
    out = out.replace(rule.pattern, rule.replacement);
  }
  return out;
}
