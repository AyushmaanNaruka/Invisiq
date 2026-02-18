// ══════════════════════════════════════
//  PROVIDER & MODEL TYPES
// ══════════════════════════════════════

export type ProviderID = 'openai' | 'anthropic' | 'gemini';

export type HotkeyAction =
  | 'toggle-overlay'
  | 'capture-screen'
  | 'capture-region'
  | 'focus-input'
  | 'copy-response'
  | 'new-conversation'
  | 'hide-overlay';

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

export interface CustomMode extends Mode {
  isBuiltIn: false;
  createdAt: string;
  updatedAt: string;
}

// ══════════════════════════════════════
//  AUDIO
// ══════════════════════════════════════

export type SpeechEngine = 'browser' | 'whisper';

// ══════════════════════════════════════
//  APPLICATION SETTINGS
// ══════════════════════════════════════

export interface AppSettings {
  providers: {
    openai: ProviderConfig;
    anthropic: ProviderConfig;
    gemini: ProviderConfig;
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
  };

  hotkeys: Record<HotkeyAction, string>;

  privacy: {
    encryptKeys: boolean;
    clearScreenshotsAfterSend: boolean;
    persistChatHistory: boolean;
    logApiRequests: boolean;
    processName: string;
  };

  customModes: CustomMode[];

  audio: {
    engine: SpeechEngine;
    language: string;
    autoIncludeTranscript: boolean;
  };

  isFirstLaunch: boolean;
  onboardingComplete: boolean;
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
