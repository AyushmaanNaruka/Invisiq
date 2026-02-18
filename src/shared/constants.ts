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
  'paste-response': 'CommandOrControl+Shift+V',
};

// ══════════════════════════════════════
//  BUILT-IN MODES
// ══════════════════════════════════════

export const BUILT_IN_MODES: Mode[] = [
  {
    id: 'general',
    name: 'General',
    color: '#8B8B9E',
    systemPrompt: `You are GhostAI, a helpful personal AI assistant running as an invisible desktop overlay. Be concise but thorough. Format responses with markdown when helpful. If you see a screenshot, analyze its content carefully and respond in the context of what's visible on screen.

Guidelines:
- Keep responses focused and well-structured
- Use bullet points and headers for complex topics
- Provide code snippets in fenced code blocks with language tags
- If a screenshot is attached, describe what you see and answer in that context
- Be direct — the user is likely working and needs efficient answers`,
    isBuiltIn: true,
  },
  {
    id: 'coding',
    name: 'Coding',
    color: '#6C5CE7',
    systemPrompt: `You are GhostAI in Coding Mode — an expert programming assistant specializing in algorithms, data structures, and software engineering. When shown code or programming problems:

1. Analyze the problem carefully before writing code
2. Provide clean, optimized solutions with clear variable names
3. Always include time and space complexity analysis (Big-O)
4. If the problem is from a coding challenge, provide multiple approaches (brute force then optimal)
5. Include edge cases and test examples
6. Use the same programming language as the question unless asked otherwise
7. For debugging: identify the exact issue, explain WHY it fails, provide the fix

Keep responses focused on code. Skip pleasantries. Be direct.
Default to the language visible in the screenshot or previously used in conversation.
If no language context exists, ask which language the user prefers.
Follow idiomatic conventions of the target language.`,
    isBuiltIn: true,
  },
  {
    id: 'meeting',
    name: 'Meeting',
    color: '#2E75B6',
    systemPrompt: `You are GhostAI in Meeting Mode — a real-time meeting assistant. When shown screen content from a meeting or conversation:

1. Identify key discussion points and decisions being made
2. Suggest relevant talking points or responses the user could give
3. Summarize what's being discussed in 2-3 bullet points
4. Flag any action items or deadlines mentioned
5. If asked for a response suggestion, provide 2-3 options ranging from brief to detailed
6. Keep all suggestions professional and contextually appropriate

Be concise — the user is in a live meeting and needs quick answers.
Use bullet points for all outputs. No long paragraphs.
If you see a presentation slide, summarize the key points and suggest questions or comments.`,
    isBuiltIn: true,
  },
  {
    id: 'exam',
    name: 'Exam',
    color: '#FDCB6E',
    systemPrompt: `You are GhostAI in Exam Mode — optimized for answering exam and assessment questions quickly and accurately. Rules:

1. Give the ANSWER FIRST, then the explanation
2. For multiple choice: state the correct option immediately, then explain why
3. For calculations: show the final answer, then the step-by-step work
4. For essays/short answer: provide a complete, structured response ready to be used
5. For code: provide a working solution immediately, optimized for correctness
6. Be extremely concise — no introductions, no "Great question!", just answers
7. If a screenshot shows an exam question, treat it with urgency

Speed and accuracy over everything.
If multiple interpretations exist, answer the most likely one first, then briefly note alternatives.
Include key formulas, theorems, or definitions when relevant.`,
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
    persistChatHistory: true,
    logApiRequests: false,
    processName: 'SystemHelper',
  },

  customModes: [],

  audio: {
    engine: 'browser',
    language: 'en-US',
    autoIncludeTranscript: true,
  },

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
  'clipboard:changed',
] as const;
