/**
 * useCodeDetection — Phase 4 / Sprint 15
 *
 * Periodically captures the screen and uses OCR to detect coding platforms.
 * Emits a CodeDetectionResult when a known platform is recognized.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { CodeDetectionResult, CodePlatform } from '@shared/types';

/**
 * Screen Awareness: wrap the latest OCR snapshot of the screen as a lightweight
 * text context prefix for the AI. Text-only (never sent to analytics), truncated
 * to keep token cost bounded. Returns '' when there's nothing useful.
 */
export function buildScreenContextPrefix(ocrText: string | null, maxChars = 1500): string {
  const t = (ocrText ?? '').trim();
  if (!t) return '';
  const clipped = t.length > maxChars ? t.slice(0, maxChars) + '…' : t;
  return `[Context — text currently visible on the user's screen (OCR, may be noisy):\n${clipped}]\n\n`;
}

interface PlatformSignature {
  keywords: string[];
  platform: CodePlatform;
  confidence: number;
}

const PLATFORM_SIGNATURES: PlatformSignature[] = [
  { keywords: ['leetcode', 'leet code'], platform: 'leetcode', confidence: 0.95 },
  { keywords: ['hackerrank', 'hacker rank'], platform: 'hackerrank', confidence: 0.95 },
  { keywords: ['codeforces', 'code forces'], platform: 'codeforces', confidence: 0.95 },
  { keywords: ['codesignal', 'code signal'], platform: 'codesignal', confidence: 0.9 },
  { keywords: ['algoexpert', 'algo expert'], platform: 'algoexpert', confidence: 0.9 },
  { keywords: ['pramp'], platform: 'pramp', confidence: 0.9 },
  { keywords: ['coderbyte'], platform: 'coderbyte', confidence: 0.9 },
  { keywords: [
    'def ', 'function ', 'class ', 'public static', 'import ',
    '#!/usr', 'console.log', 'print(', 'System.out',
  ], platform: 'generic-ide', confidence: 0.6 },
];

// Regex-based language patterns ordered by specificity (most specific first).
// Each entry is an array of regex patterns; we count matches for scoring.
const LANGUAGE_REGEX: { lang: string; patterns: RegExp[] }[] = [
  // Java — very specific keywords; check BEFORE python/JS to avoid false positives
  {
    lang: 'java',
    patterns: [
      /public\s+class\s+/i,
      /public\s+static\s+void\s+main/i,
      /System\.out\.print/i,
      /import\s+java\./i,
      /private\s+(int|String|boolean|void)\s+/i,
      /new\s+\w+\(\)/i,
    ],
  },
  // C++ — check before C-like languages
  {
    lang: 'cpp',
    patterns: [
      /#include\s*</i,
      /std::/i,
      /cout\s*<</i,
      /cin\s*>>/i,
      /using\s+namespace\s+std/i,
      /vector\s*</i,
    ],
  },
  // TypeScript — check before JavaScript (superset)
  {
    lang: 'typescript',
    patterns: [
      /:\s*(string|number|boolean|void)\b/i,
      /interface\s+\w+\s*\{/i,
      /type\s+\w+\s*=/i,
      /<\w+>/,
      /as\s+(string|number|any)\b/i,
    ],
  },
  // JavaScript
  {
    lang: 'javascript',
    patterns: [
      /\bfunction\s+\w+\s*\(/,
      /\bconst\s+\w+\s*=/,
      /\blet\s+\w+\s*=/,
      /console\.(log|error|warn)\(/,
      /=>\s*\{/,
      /require\s*\(\s*['"]/,
    ],
  },
  // Python — must come after Java since 'class ' and 'import ' overlap
  {
    lang: 'python',
    patterns: [
      /\bdef\s+\w+\s*\(/,
      /\bprint\s*\(/,
      /\bclass\s+\w+.*:/,
      /\bimport\s+\w+/,
      /\bfrom\s+\w+\s+import\b/,
      /\bself\.\w+/,
      /\bif\s+__name__\s*==\s*['"]__main__['"]/,
    ],
  },
  // Go
  {
    lang: 'go',
    patterns: [
      /\bfunc\s+\w+\s*\(/,
      /package\s+main\b/,
      /fmt\.Print/,
      /:=\s*/,
    ],
  },
  // Rust
  {
    lang: 'rust',
    patterns: [
      /\bfn\s+\w+\s*\(/,
      /\blet\s+mut\s+/,
      /println!\s*\(/,
      /\bimpl\s+\w+/,
    ],
  },
];

const MIN_CONFIDENCE = 0.7;

function detectLanguage(ocrText: string): string | undefined {
  let bestLang: string | undefined;
  let bestScore = 0;

  for (const { lang, patterns } of LANGUAGE_REGEX) {
    const matches = patterns.filter((rx) => rx.test(ocrText)).length;
    if (matches > 0 && matches > bestScore) {
      bestScore = matches;
      bestLang = lang;
    }
  }

  return bestLang;
}

function detectPlatform(ocrText: string): CodeDetectionResult | null {
  const lower = ocrText.toLowerCase();

  for (const sig of PLATFORM_SIGNATURES) {
    if (sig.keywords.some((kw) => lower.includes(kw))) {
      if (sig.confidence < MIN_CONFIDENCE) continue;

      const language = detectLanguage(ocrText);

      return {
        platform: sig.platform,
        confidence: sig.confidence,
        language,
        timestamp: new Date().toISOString(),
      };
    }
  }

  return null;
}

interface UseCodeDetectionOptions {
  enabled?: boolean;
  intervalMs?: number;
  onDetected?: (result: CodeDetectionResult) => void;
  /** When true, retain the raw OCR text of each scan in `latestOcrText` (Screen Awareness). */
  retainOcrText?: boolean;
}

interface UseCodeDetectionReturn {
  lastDetection: CodeDetectionResult | null;
  isScanning: boolean;
  dismiss: () => void;
  /** Latest raw OCR text from the most recent scan (null unless retainOcrText is on). */
  latestOcrText: string | null;
}

export function useCodeDetection({
  enabled = false,
  intervalMs = 30000,
  onDetected,
  retainOcrText = false,
}: UseCodeDetectionOptions): UseCodeDetectionReturn {
  const [lastDetection, setLastDetection] = useState<CodeDetectionResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [latestOcrText, setLatestOcrText] = useState<string | null>(null);
  const retainOcrTextRef = useRef(retainOcrText);
  retainOcrTextRef.current = retainOcrText;
  const isScanningRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPlatformRef = useRef<CodePlatform | null>(null);
  const dismissedPlatformsRef = useRef<Set<CodePlatform>>(new Set());
  const onDetectedRef = useRef(onDetected);
  onDetectedRef.current = onDetected;

  const scan = useCallback(async () => {
    if (isScanningRef.current) return;
    isScanningRef.current = true;
    setIsScanning(true);

    try {
      // Capture screen (silent — no overlay hide/show)
      const screenshot = await window.ghostAPI.screenshot.captureSilent();

      // Lazy-load Tesseract to avoid startup cost
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng');
      const { data: { text } } = await worker.recognize(`data:image/png;base64,${screenshot.base64}`);
      await worker.terminate();

      if (retainOcrTextRef.current) {
        setLatestOcrText(text);
      }

      const result = detectPlatform(text);
      if (result && result.platform !== 'unknown') {
        // Skip dismissed platforms
        if (dismissedPlatformsRef.current.has(result.platform)) return;

        // Only notify if platform changed
        if (result.platform !== lastPlatformRef.current) {
          lastPlatformRef.current = result.platform;
          setLastDetection(result);
          onDetectedRef.current?.(result);
        }
      }
    } catch (err) {
      console.error('[useCodeDetection] Scan failed:', err);
    } finally {
      isScanningRef.current = false;
      setIsScanning(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // Run first scan after 5s (give app time to settle), then on interval
    const initialDelay = setTimeout(() => {
      scan();
      timerRef.current = setInterval(scan, intervalMs);
    }, 5000);

    return () => {
      clearTimeout(initialDelay);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [enabled, intervalMs, scan]);

  const dismiss = useCallback(() => {
    // Persistently dismiss this platform so it won't reappear across scans
    if (lastDetection) {
      dismissedPlatformsRef.current.add(lastDetection.platform);
    }
    setLastDetection(null);
  }, [lastDetection]);

  return { lastDetection, isScanning, dismiss, latestOcrText };
}
