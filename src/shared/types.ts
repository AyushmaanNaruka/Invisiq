// ══════════════════════════════════════
//  PROVIDER & MODEL TYPES
// ══════════════════════════════════════

// 'groq' + 'openrouter' added Jun 2026 — both OpenAI-compatible (see openai-compatible.ts).
// OpenRouter exposes DeepSeek/Qwen/Mistral through a single BYOK key.
export type ProviderID = 'openai' | 'anthropic' | 'gemini' | 'groq' | 'openrouter';

export type HotkeyAction =
  | 'toggle-overlay'
  | 'capture-screen'
  | 'capture-region'
  | 'focus-input'
  | 'copy-response'
  | 'new-conversation'
  | 'hide-overlay'
  | 'paste-response'
  | 'next-model'
  | 'prev-model'
  // toggle-invisible-input now toggles Model B capture mode (kept for settings compat)
  | 'toggle-invisible-input'
  // Model B — panic kill switch: instantly exit capture, uninstall hook, hide overlay
  | 'panic';

export interface ModelConfig {
  id: string;
  name: string;
  provider: ProviderID;
  supportsVision: boolean;
  maxContextTokens: number;
  maxOutputTokens: number;
  costPer1MInput: number;
  costPer1MOutput: number;
  speed: 'fast' | 'medium' | 'slow';
}

export interface ProviderConfig {
  hasKey: boolean;
  isValid: boolean;
  lastValidated?: string;
  defaultModel?: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  models?: string[];
}

// ══════════════════════════════════════
//  CHAT & MESSAGE TYPES
// ══════════════════════════════════════

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'error';
  content: string;
  images?: ImageAttachment[];
  timestamp: string;
  usage?: TokenUsage;
  model?: string;
  latencyMs?: number;
}

export interface ImageAttachment {
  data: string;
  mimeType: 'image/png' | 'image/jpeg';
  width?: number;
  height?: number;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUSD: number;
}

export interface StreamChunk {
  type: 'text' | 'done' | 'error';
  text?: string;
  error?: string;
}

export interface ChatResponse {
  content: string;
  model: string;
  usage: TokenUsage;
  finishReason: 'stop' | 'max_tokens' | 'error';
  latency: number;
}

export interface ChatRequest {
  messages: ChatMessage[];
  model: string;
  systemPrompt?: string;
  images?: ImageAttachment[];
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

// ══════════════════════════════════════
//  CONVERSATION
// ══════════════════════════════════════

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  mode: string;
  model: string;
  createdAt: string;
  updatedAt: string;
  totalTokens: number;
  estimatedCost: number;
}

export interface ConversationMeta {
  id: string;
  title: string;
  preview: string;
  mode: string;
  model: string;
  messageCount: number;
  tokenCount: number;
  createdAt: string;
  updatedAt: string;
}

// ══════════════════════════════════════
//  MODES
// ══════════════════════════════════════

export interface Mode {
  id: string;
  name: string;
  color: string;
  systemPrompt: string;
  isBuiltIn: boolean;
}

// ══════════════════════════════════════
//  AUDIO
// ══════════════════════════════════════

export type SpeechEngine = 'browser' | 'whisper';

// ══════════════════════════════════════
//  PHASE 4: CLICK-THROUGH
// ══════════════════════════════════════

export interface RegionCropRequest {
  screenshotBase64: string;
  x: number;
  y: number;
  width: number;
  height: number;
  devicePixelRatio: number;
}

// ══════════════════════════════════════
//  PHASE 4: AUDIO CAPTURE & MEETING
// ══════════════════════════════════════

export type AudioCaptureSource = 'system' | 'microphone' | 'both';

export interface MeetingQuestion {
  id: string;
  text: string;
  suggestedAnswer: string | null;
  timestamp: string;
  confidence: number;
}

export type CodePlatform =
  | 'leetcode'
  | 'hackerrank'
  | 'codeforces'
  | 'codesignal'
  | 'algoexpert'
  | 'pramp'
  | 'coderbyte'
  | 'generic-ide'
  | 'unknown';

export interface CodeDetectionResult {
  platform: CodePlatform;
  confidence: number;
  language?: string;
  problemTitle?: string;
  timestamp: string;
}

// ══════════════════════════════════════
//  PHASE 4: COMPANION
// ══════════════════════════════════════

export interface CompanionDevice {
  id: string;
  name: string;
  connectedAt: string;
  lastSeen: string;
  platform: 'ios' | 'android' | 'web';
}

export interface CompanionMessage {
  type: 'query' | 'screenshot' | 'command' | 'response';
  payload: unknown;
  deviceId: string;
  timestamp: string;
}

// ══════════════════════════════════════
//  PHASE 4: EXPORT
// ══════════════════════════════════════

export type ExportFormat = 'json' | 'markdown' | 'pdf' | 'text';

// ══════════════════════════════════════
//  PHASE 4: MEMORY
// ══════════════════════════════════════

export interface MemoryFact {
  id: string;
  content: string;
  source: 'user' | 'conversation' | 'manual';
  extractedAt: string;
  conversationId?: string;
  tags: string[];
  accessCount: number;
  lastAccessed: string;
}

export interface MemorySearchResult {
  fact: MemoryFact;
  score: number;
  relevantSnippet: string;
}

export interface MemoryStats {
  totalFacts: number;
  totalSize: number;
  oldestFact: string;
  newestFact: string;
}

// ══════════════════════════════════════
//  PHASE 5: RESILIENCE
// ══════════════════════════════════════

export type ResilienceAgentState = 'stopped' | 'starting' | 'running' | 'error';

export interface ResilienceStatus {
  agentState: ResilienceAgentState;
  pipeConnected: boolean;
  helperPid: number | null;
  lastError: string | null;
  uptime: number;
}

export interface ResilienceCommand {
  // start_overlay / hide_overlay / get_status / shutdown / ping are legacy/diagnostic.
  // set_capture toggles the suppressing keyboard hook for stealth typing (Model B).
  type:
    | 'start_overlay'
    | 'hide_overlay'
    | 'get_status'
    | 'shutdown'
    | 'ping'
    | 'set_capture';
  payload?: Record<string, unknown>;
}

export interface ResilienceResponse {
  // ready  → pipe is up (replaces the fixed spawn-wait)
  // key    → a translated keystroke from the suppressing hook (payload = CaptureKeyEvent)
  // proctor→ proctor-process detection update (payload = ProctorDetection)
  // capture_failed → hook/pipe died mid-capture; renderer must degrade
  // click_outside  → user clicked a window that isn't InvisiQ while capturing;
  //                  capture-controller exits cleanly so keys return to that app
  type:
    | 'status'
    | 'ack'
    | 'error'
    | 'pong'
    | 'ready'
    | 'key'
    | 'proctor'
    | 'capture_failed'
    | 'click_outside';
  payload?: Record<string, unknown>;
  error?: string;
}

// ══════════════════════════════════════
//  MODEL B: STEALTH CAPTURE (suppressing keyboard hook)
// ══════════════════════════════════════

/** Kinds of key events the helper forwards while capture is active. */
export type CaptureKeyKind =
  | 'char'
  | 'backspace'
  | 'delete'
  | 'enter'
  | 'left'
  | 'right'
  | 'home'
  | 'end';

/** Modifier bit flags carried on a capture key event. */
export const CAPTURE_MOD_SHIFT = 1;
export const CAPTURE_MOD_CTRL = 2;

/**
 * A single translated keystroke from the helper's WH_KEYBOARD_LL hook.
 * `seq` is monotonic per capture session; `epoch` identifies the session so
 * the renderer can reject stale events that arrive after capture exits.
 */
export interface CaptureKeyEvent {
  seq: number;
  epoch: number;
  kind: CaptureKeyKind;
  char?: string; // present only when kind === 'char'
  /**
   * Modifier bitmask (CAPTURE_MOD_SHIFT | CAPTURE_MOD_CTRL) — only meaningful on
   * nav/edit kinds, where the renderer uses it to extend selections (shift) and
   * jump/delete by word (ctrl). Absent/0 for a plain keystroke.
   */
  mods?: number;
}

/** Proctor-detection snapshot pushed by the helper (confirmation only). */
export interface ProctorDetection {
  detected: boolean;
  names: string[];
}

/** Which input tier is currently servicing stealth typing (degradation ladder). */
export type CaptureTier = 'helper' | 'uiohook' | 'clipboard' | 'focus' | 'none';

/** Reason a capture session degraded or failed. */
export type CaptureFailReason =
  | 'helper-missing'
  | 'pipe-dropped'
  | 'heartbeat-lost'
  | 'session-locked'
  | 'hook-unavailable';

// ══════════════════════════════════════
//  AUTH (Beta — Google OAuth via Supabase)
// ══════════════════════════════════════

export interface AuthStatus {
  signedIn: boolean;
  email: string | null;
  userId: string | null;
}

// ══════════════════════════════════════
//  ENTITLEMENT (Beta — 14-day trial gate)
// ══════════════════════════════════════

export type EntitlementStatusKind =
  | 'active' // trial live → API keys decryptable
  | 'expired' // trial ended → locked
  | 'offline' // couldn't verify at launch (fail-closed) → locked
  | 'unknown'; // not signed in / not yet checked

export interface EntitlementStatus {
  status: EntitlementStatusKind;
  daysLeft: number;
  expiresAt: string | null;
}

// ══════════════════════════════════════
//  VERSION GATE (Beta — remote kill-switch / forced update §10.4)
// ══════════════════════════════════════

export interface VersionGateStatus {
  required: boolean; // running build must update before it can be used
  reason: 'killed' | 'below-floor' | null;
  message: string | null;
  minVersion: string | null;
  latestVersion: string | null;
  currentVersion: string;
}

// ══════════════════════════════════════
//  APPLICATION SETTINGS
// ══════════════════════════════════════

export interface AppSettings {
  providers: {
    openai: ProviderConfig;
    anthropic: ProviderConfig;
    gemini: ProviderConfig;
    groq: ProviderConfig;
    openrouter: ProviderConfig;
  };

  activeProvider: ProviderID;
  activeModel: string;
  activeMode: string;

  display: {
    theme: 'dark' | 'light';
    opacity: number;
    fontSize: number;
    windowWidth: number;
    windowHeight: number;
    windowX?: number;
    windowY?: number;
    startPosition: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center' | 'last';
    showStatusBar: boolean;
    autoScroll: boolean;
    showTimestamps: boolean;
    // Phase 4
    animationsEnabled: boolean;
    glassEffect: boolean;
  };

  hotkeys: Record<HotkeyAction, string>;

  privacy: {
    encryptKeys: boolean;
    clearScreenshotsAfterSend: boolean;
    persistChatHistory: boolean;
    logApiRequests: boolean;
    processName: string;
    showTrayIcon: boolean;
    // Phase 4
    codeDetectionEnabled: boolean;
    codeDetectionIntervalMs: number;
    // Post-beta: Ambient Screen Awareness — auto-attach the current screen as
    // vision context on send, so the user never has to manually screenshot.
    screenAwarenessEnabled: boolean;
    // Keep a lightweight rolling OCR text snapshot of the screen between captures
    // (cheap text context even when no vision image is attached). Higher CPU cost.
    screenAwarenessRollingOcr: boolean;
  };

  audio: {
    engine: SpeechEngine;
    language: string;
    autoIncludeTranscript: boolean;
  };

  // Phase 4: Meeting / system audio
  meeting: {
    enableSystemAudio: boolean;
    audioSource: AudioCaptureSource;
    autoSuggestEnabled: boolean;
    silenceThresholdMs: number;
    liveTranscriptionEnabled: boolean;
  };

  // Phase 4: Companion device
  companion: {
    enabled: boolean;
    port: number;
    requirePairing: boolean;
    pairedDevices: CompanionDevice[];
    autoStart: boolean;
  };

  // Phase 4: Local memory
  memory: {
    enabled: boolean;
    autoExtract: boolean;
    maxFactsPerConversation: number;
    maxContextFacts: number;
    factRetentionDays: number;
    totalFactsLimit: number;
  };

  // Phase 5: Resilience
  resilience: {
    enabled: boolean;
    autoStart: boolean;
    helperPath: string;
    pipeName: string;
  };

  // Model B: default-on stealth (suppressing keyboard hook + logical-focus capture)
  stealth: {
    // When true, the overlay starts in WS_EX_NOACTIVATE stealth-focus mode and
    // typing routes through the suppressing capture hook. Fail-safe default.
    defaultOn: boolean;
    // Poll for known proctoring processes and show a confirmation badge.
    // Confirmation only — never a trigger for protection.
    proctorDetection: boolean;
    // When highly confident nothing is watching, offer to relax to easy-focus
    // typing. Only flips toward convenience, never away from safety.
    relaxWhenSafe: boolean;
    // Opt-in (default off): when a sweep-capable lockdown proctor is detected,
    // drop WDA_EXCLUDEFROMCAPTURE to evade GetWindowDisplayAffinity sweeps.
    // Trade-off: exposes the overlay to screenshots/recording while active.
    evadeSweepProctor: boolean;
  };

  isFirstLaunch: boolean;
  onboardingComplete: boolean;
  // T&C version the user has accepted (beta prompt-logging disclosure, §8). When
  // this !== CURRENT_TOS_VERSION the app shows the T&C gate before use.
  tosAcceptedVersion: string;
  version: string;
}

// ══════════════════════════════════════
//  SCREENSHOT RESULT
// ══════════════════════════════════════

export interface ScreenshotResult {
  base64: string;
  width: number;
  height: number;
  timestamp: number;
}

export interface MonitorInfo {
  id: string;
  name: string;
  width: number;
  height: number;
  x: number;
  y: number;
  isPrimary: boolean;
}

// ══════════════════════════════════════
//  APP INFO
// ══════════════════════════════════════

export interface AppInfo {
  version: string;
  platform: 'win32' | 'darwin' | 'linux';
  isFirstLaunch: boolean;
  isContentProtectionSupported: boolean;
}

// ══════════════════════════════════════
//  ENCRYPTED KEY STORAGE
// ══════════════════════════════════════

export interface EncryptedPayload {
  iv: string;
  data: string;
  tag: string;
  // Payload scheme version. Absent/1 = machine-only key (legacy API keys + auth
  // secrets). 2 = entitlement-bound key (machineId + server fragment). See crypto.ts.
  v?: number;
}

// ══════════════════════════════════════
//  WINDOW STATE
// ══════════════════════════════════════

export interface WindowState {
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
}
