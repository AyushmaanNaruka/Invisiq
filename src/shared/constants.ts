import type { HotkeyAction, Mode, AppSettings, WindowState, ModelConfig, ProviderID } from './types';

// Single source of truth for the set of shipping BYOK providers. Use this for
// validation/iteration everywhere instead of re-typing ['openai','anthropic',...]
// — adding a provider then means editing ONE list. Order = ModelSelector display order.
export const PROVIDER_IDS: ProviderID[] = ['openai', 'anthropic', 'gemini', 'groq', 'openrouter'];

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

// ── Process identity ────────────────────────────────────────────────────────
// THIS is the .exe IMAGE NAME that proctoring tools enumerate (Mettl/Examity/SEB
// scan szExeFile). It is the brand name 'InvisiQ' — a deliberate brand-trust
// decision: the realistic market (Bucket A — Zoom/Teams/Meet/Proctorio/Honorlock)
// CANNOT enumerate processes, and visual invisibility (WDA_EXCLUDEFROMCAPTURE) is
// fully name-independent, so the brand name costs nothing there. The only trade-off
// is against Bucket-B desktop lockdown browsers that match a process-name blocklist
// — a recognizable name is easier to add to such a list than a neutral one (a
// future-popularity risk, not a present one). See docs/InvisiQ-Stealth-
// Commercialization.md. NOTE: this is NOT the old 'RuntimeBroker' Microsoft
// impersonation (EDR/signing/legal toxic) — 'InvisiQ' is honest, so it does not
// reintroduce that. Keep in sync with electron-builder.yml `win.executableName`
// (YAML cannot import this constant).
export const DEFAULT_PROCESS_NAME = 'InvisiQ';

// Honest Windows AppUserModelId — matches our own NSIS/updater appId
// (electron-builder.yml `appId`). Replaces 'Microsoft.Windows.RuntimeBroker'.
// Used by Windows for taskbar grouping, pinning, and notification identity.
export const APP_USER_MODEL_ID = 'com.ghostai.app';

export const DEFAULT_SETTINGS: AppSettings = {
  providers: {
    openai: { hasKey: false, isValid: false },
    anthropic: { hasKey: false, isValid: false },
    gemini: { hasKey: false, isValid: false },
    groq: { hasKey: false, isValid: false },
    openrouter: { hasKey: false, isValid: false },
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
    codeDetectionEnabled: true,
    codeDetectionIntervalMs: 30000,
    // Post-beta: Ambient Screen Awareness (auto-capture on default; rolling OCR opt-in to save CPU)
    screenAwarenessEnabled: true,
    screenAwarenessRollingOcr: false,
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

// ── Groq (OpenAI-compatible; base https://api.groq.com/openai/v1) ──
// Llama-4-Scout was deprecated by Groq on 2026-06-17; qwen3.6-27b is the
// current vision-capable model so screenshot prompts keep working on Groq.
export const GROQ_MODELS: ModelConfig[] = [
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B (Groq)',
    provider: 'groq',
    supportsVision: false,
    maxContextTokens: 131072,
    maxOutputTokens: 32768,
    costPer1MInput: 0.59,
    costPer1MOutput: 0.79,
    speed: 'fast',
  },
  {
    id: 'llama-3.1-8b-instant',
    name: 'Llama 3.1 8B Instant (Groq)',
    provider: 'groq',
    supportsVision: false,
    maxContextTokens: 131072,
    maxOutputTokens: 32768,
    costPer1MInput: 0.05,
    costPer1MOutput: 0.08,
    speed: 'fast',
  },
  {
    id: 'openai/gpt-oss-120b',
    name: 'GPT-OSS 120B (Groq)',
    provider: 'groq',
    supportsVision: false,
    maxContextTokens: 131072,
    maxOutputTokens: 65536,
    costPer1MInput: 0.15,
    costPer1MOutput: 0.60,
    speed: 'fast',
  },
  {
    id: 'qwen/qwen3.6-27b',
    name: 'Qwen3.6 27B Vision (Groq)',
    provider: 'groq',
    supportsVision: true,
    maxContextTokens: 131072,
    maxOutputTokens: 32768,
    // Groq does not publish per-token pricing for this model; approximate.
    costPer1MInput: 0.40,
    costPer1MOutput: 0.80,
    speed: 'fast',
  },
];

// ── OpenRouter (OpenAI-compatible; base https://openrouter.ai/api/v1) ──
// One BYOK key → DeepSeek, Qwen, and Mistral. Slugs + pricing pulled from the
// public openrouter.ai/api/v1/models catalog (2026-06).
export const OPENROUTER_MODELS: ModelConfig[] = [
  {
    id: 'deepseek/deepseek-v4-pro',
    name: 'DeepSeek V4 Pro',
    provider: 'openrouter',
    supportsVision: false,
    maxContextTokens: 1048576,
    maxOutputTokens: 16384,
    costPer1MInput: 0.435,
    costPer1MOutput: 0.87,
    speed: 'medium',
  },
  {
    id: 'deepseek/deepseek-v4-flash',
    name: 'DeepSeek V4 Flash',
    provider: 'openrouter',
    supportsVision: false,
    maxContextTokens: 1048576,
    maxOutputTokens: 16384,
    costPer1MInput: 0.09,
    costPer1MOutput: 0.18,
    speed: 'fast',
  },
  {
    id: 'qwen/qwen3.7-max',
    name: 'Qwen3.7 Max',
    provider: 'openrouter',
    supportsVision: false,
    maxContextTokens: 1000000,
    maxOutputTokens: 16384,
    costPer1MInput: 1.25,
    costPer1MOutput: 3.75,
    speed: 'medium',
  },
  {
    // NOTE: qwen/qwen3.6-27b is intentionally NOT listed here — Groq already owns
    // that slug (GROQ_MODELS), and model IDs must be globally unique because routing
    // resolves provider purely by id (providerManager.getModelById → first match in
    // ALL_MODELS). Mistral Medium is OpenRouter's vision model instead.
    id: 'mistralai/mistral-medium-3.5',
    name: 'Mistral Medium 3.5',
    provider: 'openrouter',
    supportsVision: true,
    maxContextTokens: 262144,
    maxOutputTokens: 16384,
    costPer1MInput: 1.50,
    costPer1MOutput: 7.50,
    speed: 'medium',
  },
];

export const ALL_MODELS: ModelConfig[] = [
  ...OPENAI_MODELS,
  ...ANTHROPIC_MODELS,
  ...GEMINI_MODELS,
  ...GROQ_MODELS,
  ...OPENROUTER_MODELS,
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
  'https://api.groq.com/*',
  'https://openrouter.ai/*',
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
