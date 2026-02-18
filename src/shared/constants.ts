import type { HotkeyAction, Mode, AppSettings, WindowState, ModelConfig } from './types';

// ══════════════════════════════════════
//  DEFAULT HOTKEYS
// ══════════════════════════════════════

export const DEFAULT_HOTKEYS: Record<HotkeyAction, string> = {
  'toggle-overlay': 'Ctrl+Shift+G',
  'capture-screen': 'CommandOrControl+Alt+S',
  'capture-region': 'CommandOrControl+Alt+R',
  'focus-input': 'CommandOrControl+Alt+A',
  'copy-response': 'CommandOrControl+Alt+C',
  'new-conversation': 'CommandOrControl+Alt+N',
  'hide-overlay': 'Escape',
};

// ══════════════════════════════════════
//  BUILT-IN MODES
// ══════════════════════════════════════

export const BUILT_IN_MODES: Mode[] = [
  {
    id: 'general',
    name: 'General',
    color: '#8B8B9E',
    systemPrompt: 'You are a helpful AI assistant. Provide clear, accurate answers.',
    isBuiltIn: true,
  },
  {
    id: 'coding',
    name: 'Coding',
    color: '#6C5CE7',
    systemPrompt: `You are an expert coding assistant specializing in data structures, algorithms, and software engineering. When given a coding problem:
1. Analyze the problem and identify the optimal approach
2. Provide a clean, working solution in the language the user requests. If no language is specified, ask which language they want.
3. Include time and space complexity analysis (Big O)
4. Add brief inline comments for complex logic
5. If multiple approaches exist, mention the trade-offs
Be concise but thorough. Prioritize correctness and efficiency.`,
    isBuiltIn: true,
  },
  {
    id: 'meeting',
    name: 'Meeting',
    color: '#2E75B6',
    systemPrompt: `You are a meeting assistant. Help with:
1. Summarizing discussions and key decisions
2. Generating talking points and responses
3. Analyzing shared documents or presentations
4. Providing relevant data and context
Keep responses concise and actionable. Use bullet points for clarity.`,
    isBuiltIn: true,
  },
  {
    id: 'exam',
    name: 'Exam',
    color: '#FDCB6E',
    systemPrompt: `You are an exam assistant. Provide:
1. Direct, concise answers first
2. Step-by-step explanation after the answer
3. Key formulas or concepts used
4. Common mistakes to avoid
Prioritize accuracy and speed. If multiple choice, state the answer letter first.`,
    isBuiltIn: true,
  },
];

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

export const DEFAULT_SETTINGS: AppSettings = {
  providers: {
    openai: { hasKey: false, isValid: false },
    anthropic: { hasKey: false, isValid: false },
    gemini: { hasKey: false, isValid: false },
  },

  activeProvider: 'openai',
  activeModel: 'gpt-4o',
  activeMode: 'general',

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
  },

  hotkeys: { ...DEFAULT_HOTKEYS },

  privacy: {
    encryptKeys: true,
    clearScreenshotsAfterSend: true,
    persistChatHistory: false,
    logApiRequests: false,
    processName: 'SystemHelper',
  },

  customModes: [],

  isFirstLaunch: true,
  onboardingComplete: false,
  version: '1.0.0',
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
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'gemini',
    supportsVision: true,
    maxContextTokens: 1048576,
    maxOutputTokens: 8192,
    costPer1MInput: 0.075,
    costPer1MOutput: 0.30,
    speed: 'fast',
  },
  {
    id: 'gemini-2.5-pro-preview-06-05',
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
] as const;
