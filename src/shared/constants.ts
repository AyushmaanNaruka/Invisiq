import type { HotkeyAction, Mode, AppSettings, WindowState, ModelConfig } from './types';

// ══════════════════════════════════════
//  SUPABASE BACKEND (Beta — auth / trial / analytics)
// ══════════════════════════════════════
// Project: hlpxesuuqypxnubswbzh. The anon key is client-safe (RLS-protected;
// Beta Launch Plan §5.1/§14) — service-role key & signing secrets NEVER ship.
export const SUPABASE_URL = 'https://hlpxesuuqypxnubswbzh.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhscHhlc3V1cXlweG51YnN3YnpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NjIxOTEsImV4cCI6MjA5NjIzODE5MX0.aJwlUR3mTODc9j26idwW2amHwmSyMaecPAcZqHO5eZY';

// T&C version in force. Bump this (and the policy text) whenever the terms that
// disclose prompt logging change — the gate re-prompts and each prompt row is
// stamped with the accepted version (Beta Launch Plan §8). Beta prompt data is
// purged server-side after 30 days.
export const CURRENT_TOS_VERSION = '2026-06-08';

// ══════════════════════════════════════
//  AUTO-UPDATE FEED
// ══════════════════════════════════════
// Public releases page — manual-download fallback when the in-app updater feed
// is unreachable (offline, rate-limited, or pre-publish). Must stay in sync with
// publish.owner/repo in electron-builder.yml. Releases MUST be public.
export const RELEASES_LATEST_URL =
  'https://github.com/Ghost-AI-Interview/invisiq-releases/releases/latest';

// ══════════════════════════════════════
//  DEFAULT HOTKEYS
// ══════════════════════════════════════

export const DEFAULT_HOTKEYS: Record<HotkeyAction, string> = {
  'toggle-overlay': 'Ctrl+Shift+G',
  'capture-screen': 'CommandOrControl+Shift+S',
  'capture-region': 'CommandOrControl+Shift+R',
  'focus-input': 'CommandOrControl+Shift+A',
  'copy-response': 'CommandOrControl+Shift+C',
  'new-conversation': 'CommandOrControl+Shift+N',
  'hide-overlay': 'Escape',
  'paste-response': 'CommandOrControl+Shift+V',
  'toggle-passthrough': 'CommandOrControl+Shift+P',
  'next-model': 'CommandOrControl+Shift+]',
  'prev-model': 'CommandOrControl+Shift+[',
  'toggle-invisible-input': 'CommandOrControl+Shift+I',
  // Panic kill switch — Ctrl+Shift+Esc is reserved by Windows (Task Manager),
  // so use Q. Instantly exits capture, uninstalls the hook, hides the overlay.
  panic: 'CommandOrControl+Shift+Q',
};

// ══════════════════════════════════════
//  UNIVERSAL MODE (single adaptive prompt)
// ══════════════════════════════════════
//
// InvisiQ has ONE mode. There is no user-facing mode picker — the model infers
// intent from the user's text + any screenshot and adapts its response shape
// (answer-first for questions, algorithm-first for code, talking points for
// meetings, general assistant otherwise). This single prompt folds in the
// disciplines of the former General / Coding / Meeting / Solve modes.
//
// To tune behavior, edit UNIVERSAL_SYSTEM_PROMPT — it is a config string, not
// architecture. BUILT_IN_MODES is kept as a one-element array so existing
// metadata/analytics call sites stay valid.

export const UNIVERSAL_SYSTEM_PROMPT = `You are InvisiQ, an expert AI assistant running as an invisible desktop overlay. The user is working in real time — often during an exam, interview, meeting, or coding task — and needs the single most useful response with zero friction.

Read the user's message AND any attached screenshot, then infer what they need and respond in the matching shape. Never announce which "mode" you picked.

• A question or problem (MCQ, math, quiz/exam item, short answer):
  → State the ANSWER FIRST. Then a tight explanation. For multiple choice, name the correct option immediately, then why. No preamble, no "Great question".
• Code or an algorithmic problem (LeetCode-style task, a bug, an error/stack trace):
  → State the approach + target time/space complexity in 1-3 lines, then the FULL runnable solution in one fenced code block, then Big-O. When shown failing code, trace the failing input, find the exact broken line, and fix it — never re-emit the same code claiming it's fixed. Use the language visible on screen; if unknown, default to Python and say so.
• A meeting or live conversation (transcript, call, or slide on screen):
  → Give 2-3 concise talking points or suggested responses; summarize key points in bullets; flag action items and deadlines. Keep it professional.
• Anything else:
  → Be a direct, well-structured general assistant.

Always:
- Be concise but complete. Lead with the answer; put reasoning after.
- Use markdown: headers/bullets for structure, fenced code blocks with language tags.
- If a screenshot is attached, treat its content as the primary context.
- Include key formulas, theorems, or definitions when they matter.
- Never refuse to read what's on screen. Speed and accuracy over everything.`;

export const UNIVERSAL_MODE: Mode = {
  id: 'universal',
  name: 'InvisiQ',
  color: '#00B894',
  systemPrompt: UNIVERSAL_SYSTEM_PROMPT,
  isBuiltIn: true,
};

export const BUILT_IN_MODES: Mode[] = [UNIVERSAL_MODE];

// ══════════════════════════════════════
//  DEFAULT WINDOW STATE
// ══════════════════════════════════════

export const DEFAULT_WINDOW_STATE: WindowState = {
  x: 0,
  y: 0,
  width: 420,
  height: 600,
  opacity: 0.85,
};

// ══════════════════════════════════════
//  DEFAULT SETTINGS
// ══════════════════════════════════════

// ── Process identity (de-impersonated) ──────────────────────────────────────
// The neutral, non-impersonating process/executable name. THIS is the .exe
// IMAGE NAME that proctoring tools enumerate (Mettl/Examity/SEB scan szExeFile).
// Replaces the legacy 'RuntimeBroker' Microsoft-impersonation disguise, which was
// an EDR/AV red flag (behavioral termination by CrowdStrike Falcon) and a code-
// signing / legal blocker for commercialization. Keep this in sync with
// electron-builder.yml `win.executableName` (YAML cannot import this constant).
export const DEFAULT_PROCESS_NAME = 'Helio';

// Honest Windows AppUserModelId — matches our own NSIS/updater appId
// (electron-builder.yml `appId`). Replaces 'Microsoft.Windows.RuntimeBroker'.
// Used by Windows for taskbar grouping, pinning, and notification identity.
export const APP_USER_MODEL_ID = 'com.ghostai.app';

export const DEFAULT_SETTINGS: AppSettings = {
  providers: {
    openai: { hasKey: false, isValid: false },
    anthropic: { hasKey: false, isValid: false },
    gemini: { hasKey: false, isValid: false },
  },

  activeProvider: 'openai',
  activeModel: 'gpt-4o',
  activeMode: 'universal',

  display: {
    theme: 'dark',
    opacity: 0.85,
    fontSize: 13,
    windowWidth: 420,
    windowHeight: 600,
    startPosition: 'bottom-right',
    showStatusBar: true,
    autoScroll: true,
    showTimestamps: false,
    // Phase 4
    animationsEnabled: true,
    glassEffect: false,
  },

  hotkeys: { ...DEFAULT_HOTKEYS },

  privacy: {
    encryptKeys: true,
    clearScreenshotsAfterSend: true,
    persistChatHistory: true,
    logApiRequests: false,
    processName: DEFAULT_PROCESS_NAME,
    showTrayIcon: false,
    // Phase 4
    clickThroughEnabled: false,
    codeDetectionEnabled: true,
    codeDetectionIntervalMs: 30000,
  },

  audio: {
    engine: 'browser',
    language: 'en-US',
    autoIncludeTranscript: true,
  },

  // Phase 4: Meeting
  meeting: {
    enableSystemAudio: false,
    audioSource: 'microphone',
    autoSuggestEnabled: false,
    silenceThresholdMs: 3000,
    liveTranscriptionEnabled: false,
  },

  // Phase 4: Companion
  companion: {
    enabled: false,
    port: 3847,
    requirePairing: true,
    pairedDevices: [],
    autoStart: false,
  },

  // Phase 4: Memory
  memory: {
    enabled: true,
    autoExtract: true,
    maxFactsPerConversation: 10,
    maxContextFacts: 5,
    factRetentionDays: 0,
    totalFactsLimit: 500,
  },

  // Phase 5: Resilience
  resilience: {
    enabled: false,
    autoStart: false,
    helperPath: '',
    pipeName: 'InvisiQ',
  },

  // Model B: default-on stealth
  stealth: {
    defaultOn: true,
    proctorDetection: true,
    relaxWhenSafe: false,
    // Opt-in (default OFF). When a sweep-capable lockdown proctor is detected
    // (Mettl/Respondus/SEB), drop WDA_EXCLUDEFROMCAPTURE so a
    // GetWindowDisplayAffinity sweep finds nothing. Trade-off: with WDA off the
    // overlay is exposed to screenshots/recording (the MORE common proctor
    // vector), so this stays off unless you know your proctor sweeps. Consumed
    // by capture-controller applyAdaptiveContentProtection().
    evadeSweepProctor: false,
  },

  isFirstLaunch: true,
  onboardingComplete: false,
  tosAcceptedVersion: '',
  version: '2.0.0',
};

// ══════════════════════════════════════
//  MODEL CONFIGURATIONS
// ══════════════════════════════════════

export const OPENAI_MODELS: ModelConfig[] = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    supportsVision: true,
    maxContextTokens: 128000,
    maxOutputTokens: 16384,
    costPer1MInput: 2.50,
    costPer1MOutput: 10.00,
    speed: 'medium',
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    supportsVision: true,
    maxContextTokens: 128000,
    maxOutputTokens: 16384,
    costPer1MInput: 0.15,
    costPer1MOutput: 0.60,
    speed: 'fast',
  },
  {
    id: 'o3-mini',
    name: 'o3-mini (Reasoning)',
    provider: 'openai',
    supportsVision: false,
    maxContextTokens: 200000,
    maxOutputTokens: 100000,
    costPer1MInput: 1.10,
    costPer1MOutput: 4.40,
    speed: 'slow',
  },
];

export const ANTHROPIC_MODELS: ModelConfig[] = [
  {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    provider: 'anthropic',
    supportsVision: true,
    maxContextTokens: 200000,
    maxOutputTokens: 16384,
    costPer1MInput: 3.00,
    costPer1MOutput: 15.00,
    speed: 'medium',
  },
  {
    id: 'claude-haiku-4-5-20251001',
    name: 'Claude Haiku 4.5',
    provider: 'anthropic',
    supportsVision: true,
    maxContextTokens: 200000,
    maxOutputTokens: 8192,
    costPer1MInput: 0.80,
    costPer1MOutput: 4.00,
    speed: 'fast',
  },
];

export const GEMINI_MODELS: ModelConfig[] = [
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'gemini',
    supportsVision: true,
    maxContextTokens: 1048576,
    maxOutputTokens: 65536,
    costPer1MInput: 0.30,
    costPer1MOutput: 2.50,
    speed: 'fast',
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'gemini',
    supportsVision: true,
    maxContextTokens: 1048576,
    maxOutputTokens: 65536,
    costPer1MInput: 1.25,
    costPer1MOutput: 10.00,
    speed: 'medium',
  },
];

export const ALL_MODELS: ModelConfig[] = [
  ...OPENAI_MODELS,
  ...ANTHROPIC_MODELS,
  ...GEMINI_MODELS,
];

// ══════════════════════════════════════
//  AI API DOMAINS (for CORS bypass)
// ══════════════════════════════════════

// Cloud-only (Beta Launch Plan §6.3). Local LLM endpoints removed permanently —
// no localhost entry means an OpenAI-compatible local server can't be reached.
export const AI_API_DOMAINS = [
  'https://api.openai.com/*',
  'https://api.anthropic.com/*',
  'https://generativelanguage.googleapis.com/*',
];

// ══════════════════════════════════════
//  IPC CHANNEL WHITELIST
// ══════════════════════════════════════

export const VALID_RENDERER_CHANNELS = [
  'hotkeys:triggered',
  'overlay:visibility-changed',
  'screenshot:captured',
  'app:error',
  'clipboard:changed',
  'monitors:changed',
  'update:checking',
  'update:available',
  'update:not-available',
  'update:progress',
  'update:downloaded',
  'update:error',
  // Phase 4
  'audio:chunk',
  'companion:message',
  'companion:device-connected',
  'companion:device-disconnected',
  // Phase 5
  'resilience:agent-status-changed',
  'resilience:agent-response',
  'overlay:stealth-focus-changed',
  'overlay:clipboard-input-requested',
  // Invisible Input (legacy uiohook fallback tier)
  'invisible-input:status',
  'invisible-input:char',
  'invisible-input:enter',
  'invisible-input:backspace',
  'invisible-input:delete',
  // Model B — default-on stealth capture
  'capture:key',
  'capture:state',
  'capture:failed',
  'proctor:detected',
] as const;
