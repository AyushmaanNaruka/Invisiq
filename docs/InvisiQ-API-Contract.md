# InvisiQ — API Contract & Interface Specification

> Specification of internal IPC channels, AI provider interfaces, data models, and external API integrations.

---

| Field | Value |
|---|---|
| **Version** | 2.0.0 |
| **Date** | February 18, 2026 (core) · channel inventory refreshed June 18, 2026 |
| **Author** | Ayushmaan Singh Naruka |
| **Related Documents** | CLAUDE.md (current behavior), InvisiQ-Beta-Launch-Plan.md |

> ⚠️ **Partial-staleness notice (June 18, 2026).** The per-channel specs in §2 and the OpenAI/Anthropic/Gemini adapter contracts (§3–§6) remain accurate, but this document predates several shipped subsystems — **beta gating** (auth / entitlement / analytics / T&C), **Model B stealth capture**, **memory (RAG)**, **companion**, **resilience**, **audio**, and **export** — and the **single-mode collapse** (modes/templates removed). For the authoritative, complete channel list see **§2.0 below** and the IPC section of **CLAUDE.md**. The **Ollama** provider was removed permanently (cloud-only); ignore any local-LLM references.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [IPC Contract (Main ↔ Renderer)](#2-ipc-contract-main--renderer)
3. [AI Provider Interface](#3-ai-provider-interface)
4. [OpenAI Adapter Contract](#4-openai-adapter-contract)
5. [Anthropic Adapter Contract](#5-anthropic-adapter-contract)
6. [Google Gemini Adapter Contract](#6-google-gemini-adapter-contract)
7. [Data Models & Types](#7-data-models--types)
8. [Local Storage Schema](#8-local-storage-schema)
9. [Preload API (contextBridge)](#9-preload-api-contextbridge)
10. [Event System](#10-event-system)
11. [Error Codes & Handling](#11-error-codes--handling)
12. [Rate Limiting & Retry Strategy](#12-rate-limiting--retry-strategy)
13. [Security Contract](#13-security-contract)

---

## 1. Architecture Overview

### 1.1 Communication Map

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  MAIN PROCESS                    RENDERER PROCESS           │
│  ────────────                    ─────────────────          │
│                                                             │
│  ┌─────────────┐   IPC Invoke   ┌────────────────┐         │
│  │ ipc-handlers│◄══════════════►│ useAI hook     │         │
│  │             │   (request/    │                │         │
│  │             │    response)   │ useScreenshot  │         │
│  │             │                │                │         │
│  │             │   IPC Send     │ useSettings    │         │
│  │             │═══════════════►│                │         │
│  │             │   (events)     │                │         │
│  └──────┬──────┘                └───────┬────────┘         │
│         │                               │                   │
│         │                               │ HTTPS             │
│         ▼                               ▼                   │
│  ┌─────────────┐                ┌────────────────┐         │
│  │ overlay.ts  │                │ AI Providers   │         │
│  │ hotkeys.ts  │                │ ┌────────────┐ │         │
│  │ screenshot  │                │ │ OpenAI     │─┼──► api.openai.com       │
│  │ stealth.ts  │                │ │ Anthropic  │─┼──► api.anthropic.com    │
│  │ store.ts    │                │ │ Gemini     │─┼──► generativelanguage   │
│  └─────────────┘                │ └────────────┘ │    .googleapis.com      │
│                                 └────────────────┘         │
│                                                             │
│         ┌──────────────────┐                                │
│         │  PRELOAD SCRIPT  │                                │
│         │  (contextBridge) │                                │
│         │                  │                                │
│         │  Exposes safe    │                                │
│         │  APIs to renderer│                                │
│         └──────────────────┘                                │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Communication Patterns

| Pattern | Usage | Example |
|---|---|---|
| **Invoke/Handle** | Request-response from renderer → main | `invoke('screenshot:capture')` → returns base64 |
| **Send/On** | One-way event from main → renderer | `send('hotkey:triggered', 'capture-screen')` |
| **Send/On** | One-way event from renderer → main | `send('overlay:set-opacity', 0.85)` |

---

## 2. IPC Contract (Main ↔ Renderer)

### 2.0 Current Channel Inventory (authoritative)

The complete set of channels registered in `src/main/ipc-handlers.ts` / exposed in `src/preload/index.ts` as of June 18, 2026. The detailed specs in §2.1+ cover the overlay/screenshot/hotkey/store/clipboard/app subset; the remaining domains follow the same `{ success, data?, error? }` invoke convention.

**Invoke (`ipcRenderer.invoke` → `ipcMain.handle`):**
```
# Beta gating (Supabase)
auth:login  auth:logout  auth:status
entitlement:status  entitlement:refresh
analytics:track  analytics:capture-prompt  analytics:delete-my-data
tos:accept  tos:status
# Overlay / window
overlay:toggle  overlay:hide  overlay:show  overlay:set-opacity
overlay:set-position  overlay:set-size  overlay:get-bounds  overlay:set-passthrough
overlay:set-stealth-focus  overlay:stealth-focus-status  overlay:request-focus  overlay:release-focus
# Screenshot / monitors
screenshot:capture-full  screenshot:capture-silent  screenshot:capture-region
screenshot:capture-monitors  screenshot:capture-for-snip  screenshot:crop-region
monitors:get-all  monitors:move-overlay
# Store / hotkeys / clipboard / app
store:get  store:set  store:get-all  store:set-api-key  store:remove-api-key  store:get-api-key  store:clear-all
hotkeys:register-all  hotkeys:update
clipboard:copy  clipboard:read  clipboard:smart-paste  clipboard:start-monitor  clipboard:stop-monitor  clipboard:monitor-status
app:get-info  app:quit  app:open-data-folder
# Conversation / export / memory
conversation:save  conversation:load  conversation:list  conversation:delete  conversation:search  conversation:export  conversation:delete-all
export:conversation  export:save-dialog
memory:search  memory:add  memory:delete  memory:list  memory:clear-all  memory:stats  memory:extract
# Update / audio / companion / resilience
update:check  update:download  update:install  update:version-status  update:open-releases
audio:start-system-capture  audio:stop-system-capture  audio:capture-status
companion:start  companion:stop  companion:status  companion:devices
resilience:start-agent  resilience:stop-agent  resilience:send-command  resilience:status
# Stealth capture (Model B)
invisible-input:arm  invisible-input:disarm  invisible-input:toggle  invisible-input:status
capture:enter  capture:exit  capture:status  capture:panic  capture:proctor-status  capture:paste
```
> **Removed:** `modes:*` and `template:*` (single-mode collapse — see CLAUDE.md §1d).

**Events (main → renderer):**
```
hotkeys:triggered  overlay:visibility-changed  screenshot:captured  app:error  clipboard:changed  monitors:changed
update:checking  update:available  update:not-available  update:progress  update:downloaded  update:error
audio:chunk  companion:message  companion:device-connected  companion:device-disconnected
resilience:agent-status-changed  resilience:agent-response
overlay:stealth-focus-changed  overlay:clipboard-input-requested
invisible-input:status  invisible-input:char  invisible-input:enter  invisible-input:backspace  invisible-input:delete
capture:key  capture:state  capture:failed  proctor:detected
```

### 2.1 Overlay Management

#### `overlay:toggle`
Toggle overlay window visibility.

```typescript
// Renderer → Main (invoke)
Channel: 'overlay:toggle'
Args: none
Returns: { visible: boolean }

// Example
const result = await window.ghostAPI.overlay.toggle();
// → { visible: true }
```

#### `overlay:hide`
Hide overlay immediately.

```typescript
Channel: 'overlay:hide'
Args: none
Returns: void
```

#### `overlay:show`
Show overlay.

```typescript
Channel: 'overlay:show'
Args: none
Returns: void
```

#### `overlay:set-opacity`
Set overlay window opacity.

```typescript
Channel: 'overlay:set-opacity'
Args: { opacity: number }  // 0.1 to 1.0
Returns: void

// Example
await window.ghostAPI.overlay.setOpacity(0.85);
```

#### `overlay:set-position`
Move overlay window.

```typescript
Channel: 'overlay:set-position'
Args: { x: number, y: number }
Returns: void
```

#### `overlay:set-size`
Resize overlay window.

```typescript
Channel: 'overlay:set-size'
Args: { width: number, height: number }
Returns: void
```

#### `overlay:get-bounds`
Get current overlay window bounds.

```typescript
Channel: 'overlay:get-bounds'
Args: none
Returns: {
  x: number,
  y: number,
  width: number,
  height: number
}
```

---

### 2.2 Screenshot Operations

#### `screenshot:capture-full`
Capture the entire primary screen.

```typescript
Channel: 'screenshot:capture-full'
Args: none
Returns: {
  success: boolean,
  image: string,          // base64 PNG data URL
  width: number,
  height: number,
  timestamp: string       // ISO 8601
}

// Flow:
// 1. Main hides overlay
// 2. Waits 100ms for DWM recomposition
// 3. Captures via desktopCapturer
// 4. Shows overlay
// 5. Returns base64 image
```

#### `screenshot:capture-region`
Initiate region selection mode.

```typescript
Channel: 'screenshot:capture-region'
Args: none
Returns: {
  success: boolean,
  image: string,          // base64 PNG data URL
  region: {
    x: number,
    y: number,
    width: number,
    height: number
  },
  timestamp: string
} | {
  success: false,
  cancelled: true         // User pressed Escape
}

// Flow:
// 1. Main hides overlay
// 2. Creates full-screen transparent selection window
// 3. User drags to select region
// 4. Captures only selected region
// 5. Destroys selection window
// 6. Shows overlay
// 7. Returns cropped base64 image
```

#### `screenshot:capture-monitors`
List available monitors for capture.

```typescript
Channel: 'screenshot:capture-monitors'
Args: none
Returns: {
  monitors: Array<{
    id: string,
    name: string,
    width: number,
    height: number,
    isPrimary: boolean
  }>
}
```

---

### 2.3 Hotkey Management

#### `hotkeys:register-all`
Register all global hotkeys from settings.

```typescript
Channel: 'hotkeys:register-all'
Args: none
Returns: { registered: string[] }  // List of registered shortcuts
```

#### `hotkeys:update`
Update a specific hotkey binding.

```typescript
Channel: 'hotkeys:update'
Args: {
  action: HotkeyAction,
  shortcut: string        // Electron accelerator format: 'Ctrl+Shift+G'
}
Returns: { success: boolean, error?: string }

type HotkeyAction =
  | 'toggle-overlay'
  | 'capture-screen'
  | 'capture-region'
  | 'focus-input'
  | 'copy-response'
  | 'new-conversation'
  | 'hide-overlay';
```

#### `hotkeys:triggered` (Main → Renderer Event)
Fired when a global hotkey is pressed.

```typescript
Channel: 'hotkeys:triggered'
Payload: {
  action: HotkeyAction,
  timestamp: string
}

// Renderer listens:
window.ghostAPI.on('hotkeys:triggered', (payload) => {
  switch (payload.action) {
    case 'capture-screen':
      // trigger screen capture flow
      break;
    // ...
  }
});
```

---

### 2.4 Settings / Store

#### `store:get`
Retrieve a setting value.

```typescript
Channel: 'store:get'
Args: { key: string }
Returns: { value: any }

// Example
const theme = await window.ghostAPI.store.get('display.theme');
// → { value: 'dark' }
```

#### `store:set`
Save a setting value.

```typescript
Channel: 'store:set'
Args: { key: string, value: any }
Returns: { success: boolean }
```

#### `store:get-all`
Get all settings.

```typescript
Channel: 'store:get-all'
Args: none
Returns: AppSettings  // Full settings object
```

#### `store:set-api-key`
Save an encrypted API key.

```typescript
Channel: 'store:set-api-key'
Args: {
  provider: 'openai' | 'anthropic' | 'gemini',
  key: string
}
Returns: { success: boolean }

// Key is encrypted before storage using AES-256
// with machine-specific derived key
```

#### `store:get-api-key`
Retrieve a decrypted API key.

```typescript
Channel: 'store:get-api-key'
Args: {
  provider: 'openai' | 'anthropic' | 'gemini'
}
Returns: { key: string | null }
```

#### `store:clear-all`
Delete all stored data.

```typescript
Channel: 'store:clear-all'
Args: none
Returns: { success: boolean }
```

---

### 2.5 Clipboard Operations

#### `clipboard:copy`
Copy text to system clipboard.

```typescript
Channel: 'clipboard:copy'
Args: { text: string }
Returns: { success: boolean }
```

#### `clipboard:read`
Read current clipboard content.

```typescript
Channel: 'clipboard:read'
Args: none
Returns: { text: string | null, hasImage: boolean }
```

#### `clipboard:smart-paste`
Simulate natural typing speed paste.

```typescript
Channel: 'clipboard:smart-paste'
Args: {
  text: string,
  wpm: number           // Words per minute (default: 80)
}
Returns: { success: boolean }

// Uses robotjs or similar to simulate keystrokes
// at natural human typing speed
```

---

### 2.6 App Lifecycle

#### `app:get-info`
Get application information.

```typescript
Channel: 'app:get-info'
Args: none
Returns: {
  version: string,
  platform: 'win32' | 'darwin' | 'linux',
  isFirstLaunch: boolean,
  isContentProtectionSupported: boolean
}
```

#### `app:quit`
Quit the application.

```typescript
Channel: 'app:quit'
Args: none
Returns: void
```

---

## 3. AI Provider Interface

### 3.1 Abstract Interface

All AI provider adapters must implement this interface:

```typescript
interface AIProvider {
  // ── Identity ──
  readonly name: string;              // 'OpenAI', 'Anthropic', 'Google'
  readonly id: ProviderID;            // 'openai', 'anthropic', 'gemini'
  readonly models: ModelConfig[];

  // ── Lifecycle ──
  initialize(apiKey: string): void;
  validateKey(): Promise<ValidationResult>;

  // ── Chat ──
  chat(request: ChatRequest): AsyncGenerator<StreamChunk, ChatResponse>;
  abort(): void;                      // Cancel ongoing request
}

type ProviderID = 'openai' | 'anthropic' | 'gemini';
```

### 3.2 Core Types

```typescript
interface ModelConfig {
  id: string;                         // Provider-specific model ID
  name: string;                       // Display name
  provider: ProviderID;
  supportsVision: boolean;
  maxContextTokens: number;
  maxOutputTokens: number;
  costPer1MInput: number;            // USD per 1M input tokens
  costPer1MOutput: number;           // USD per 1M output tokens
  speed: 'fast' | 'medium' | 'slow';
}

interface ChatRequest {
  messages: ChatMessage[];
  model: string;
  systemPrompt?: string;
  images?: ImageAttachment[];
  maxTokens?: number;
  temperature?: number;               // 0.0 - 1.0, default 0.7
  stream?: boolean;                    // default true
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  images?: ImageAttachment[];
  timestamp: string;                   // ISO 8601
}

interface ImageAttachment {
  data: string;                        // base64 encoded image
  mimeType: 'image/png' | 'image/jpeg';
  width?: number;
  height?: number;
}

interface StreamChunk {
  type: 'text' | 'done' | 'error';
  text?: string;                       // Partial text content
  error?: string;
}

interface ChatResponse {
  content: string;                     // Full response text
  model: string;
  usage: TokenUsage;
  finishReason: 'stop' | 'max_tokens' | 'error';
  latency: number;                     // ms from request to first token
}

interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUSD: number;
}

interface ValidationResult {
  valid: boolean;
  error?: string;
  models?: string[];                   // Available models for this key
}
```

---

## 4. OpenAI Adapter Contract

### 4.1 Supported Models

```typescript
const OPENAI_MODELS: ModelConfig[] = [
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
```

### 4.2 API Request Format

```typescript
// Text-only request
POST https://api.openai.com/v1/chat/completions
Headers:
  Authorization: Bearer {api_key}
  Content-Type: application/json

Body:
{
  "model": "gpt-4o",
  "stream": true,
  "max_tokens": 4096,
  "temperature": 0.7,
  "messages": [
    {
      "role": "system",
      "content": "{system_prompt}"
    },
    {
      "role": "user",
      "content": "What is a binary search tree?"
    }
  ]
}
```

```typescript
// Vision request (with screenshot)
POST https://api.openai.com/v1/chat/completions

Body:
{
  "model": "gpt-4o",
  "stream": true,
  "max_tokens": 4096,
  "messages": [
    {
      "role": "system",
      "content": "{system_prompt}"
    },
    {
      "role": "user",
      "content": [
        {
          "type": "image_url",
          "image_url": {
            "url": "data:image/png;base64,{base64_data}",
            "detail": "high"
          }
        },
        {
          "type": "text",
          "text": "What is this code doing? Provide the solution."
        }
      ]
    }
  ]
}
```

### 4.3 Streaming Response Format

```typescript
// Server-Sent Events (SSE) stream
data: {"id":"chatcmpl-xxx","object":"chat.completion.chunk","choices":[{"delta":{"content":"Here"},"index":0}]}

data: {"id":"chatcmpl-xxx","object":"chat.completion.chunk","choices":[{"delta":{"content":" is"},"index":0}]}

data: {"id":"chatcmpl-xxx","object":"chat.completion.chunk","choices":[{"delta":{"content":" the"},"index":0}]}

data: [DONE]
```

### 4.4 Key Validation

```typescript
// Validate by making a minimal API call
POST https://api.openai.com/v1/chat/completions
{
  "model": "gpt-4o-mini",
  "max_tokens": 1,
  "messages": [{"role": "user", "content": "hi"}]
}

// Success: 200 OK → key is valid
// Failure: 401 Unauthorized → invalid key
// Failure: 429 Rate Limited → key is valid but rate limited
```

---

## 5. Anthropic Adapter Contract

### 5.1 Supported Models

```typescript
const ANTHROPIC_MODELS: ModelConfig[] = [
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
```

### 5.2 API Request Format

```typescript
// Text-only request
POST https://api.anthropic.com/v1/messages
Headers:
  x-api-key: {api_key}
  anthropic-version: 2023-06-01
  Content-Type: application/json

Body:
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 4096,
  "stream": true,
  "system": "{system_prompt}",
  "messages": [
    {
      "role": "user",
      "content": "What is a binary search tree?"
    }
  ]
}
```

```typescript
// Vision request (with screenshot)
POST https://api.anthropic.com/v1/messages

Body:
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 4096,
  "stream": true,
  "system": "{system_prompt}",
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "image",
          "source": {
            "type": "base64",
            "media_type": "image/png",
            "data": "{base64_data}"
          }
        },
        {
          "type": "text",
          "text": "What is this code doing? Provide the solution."
        }
      ]
    }
  ]
}
```

### 5.3 Streaming Response Format

```typescript
// Server-Sent Events
event: message_start
data: {"type":"message_start","message":{"id":"msg_xxx","model":"claude-sonnet-4-20250514","usage":{"input_tokens":25}}}

event: content_block_start
data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Here"}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":" is"}}

event: content_block_stop
data: {"type":"content_block_stop","index":0}

event: message_delta
data: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":50}}

event: message_stop
data: {"type":"message_stop"}
```

### 5.4 Key Validation

```typescript
// Validate by making a minimal API call
POST https://api.anthropic.com/v1/messages
{
  "model": "claude-haiku-4-5-20251001",
  "max_tokens": 1,
  "messages": [{"role": "user", "content": "hi"}]
}

// Success: 200 OK → key is valid
// Failure: 401 → invalid key (error.type: "authentication_error")
// Failure: 429 → valid but rate limited
```

---

## 6. Google Gemini Adapter Contract

### 6.1 Supported Models

```typescript
const GEMINI_MODELS: ModelConfig[] = [
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
```

### 6.2 API Request Format

```typescript
// Text-only request (using Google GenAI SDK format)
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?key={api_key}&alt=sse
Headers:
  Content-Type: application/json

Body:
{
  "system_instruction": {
    "parts": [{"text": "{system_prompt}"}]
  },
  "contents": [
    {
      "role": "user",
      "parts": [{"text": "What is a binary search tree?"}]
    }
  ],
  "generationConfig": {
    "maxOutputTokens": 4096,
    "temperature": 0.7
  }
}
```

```typescript
// Vision request (with screenshot)
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?key={api_key}&alt=sse

Body:
{
  "system_instruction": {
    "parts": [{"text": "{system_prompt}"}]
  },
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "inline_data": {
            "mime_type": "image/png",
            "data": "{base64_data}"
          }
        },
        {
          "text": "What is this code doing? Provide the solution."
        }
      ]
    }
  ],
  "generationConfig": {
    "maxOutputTokens": 4096,
    "temperature": 0.7
  }
}
```

### 6.3 Streaming Response Format

```typescript
// SSE stream
data: {"candidates":[{"content":{"parts":[{"text":"Here"}],"role":"model"}}]}

data: {"candidates":[{"content":{"parts":[{"text":" is the"}],"role":"model"}}]}

data: {"candidates":[{"content":{"parts":[{"text":" solution"}],"role":"model"},"finishReason":"STOP"}],"usageMetadata":{"promptTokenCount":25,"candidatesTokenCount":50,"totalTokenCount":75}}
```

### 6.4 Key Validation

```typescript
// Validate by listing models
GET https://generativelanguage.googleapis.com/v1beta/models?key={api_key}

// Success: 200 OK with model list → key is valid
// Failure: 400/403 → invalid key
```

---

## 7. Data Models & Types

### 7.1 Complete Type Definitions

```typescript
// ══════════════════════════════════════
//  APPLICATION SETTINGS
// ══════════════════════════════════════

interface AppSettings {
  // API Keys (stored encrypted separately)
  providers: {
    openai: ProviderConfig;
    anthropic: ProviderConfig;
    gemini: ProviderConfig;
  };

  // Active selection
  activeProvider: ProviderID;
  activeModel: string;
  activeMode: string;

  // Display
  display: {
    theme: 'dark' | 'light';
    opacity: number;              // 0.1 to 1.0
    fontSize: number;             // px
    windowWidth: number;
    windowHeight: number;
    windowX?: number;
    windowY?: number;
    startPosition: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center' | 'last';
    showStatusBar: boolean;
    autoScroll: boolean;
    showTimestamps: boolean;
  };

  // Hotkeys
  hotkeys: Record<HotkeyAction, string>;

  // Privacy
  privacy: {
    encryptKeys: boolean;
    clearScreenshotsAfterSend: boolean;
    persistChatHistory: boolean;
    logApiRequests: boolean;
    processName: string;
  };

  // Modes
  customModes: CustomMode[];

  // Meta
  isFirstLaunch: boolean;
  onboardingComplete: boolean;
  version: string;
}

interface ProviderConfig {
  hasKey: boolean;                 // true if key is stored
  isValid: boolean;                // last validation result
  lastValidated?: string;          // ISO 8601
  defaultModel?: string;           // preferred model for this provider
}

// ══════════════════════════════════════
//  CONVERSATIONS
// ══════════════════════════════════════

interface Conversation {
  id: string;                      // UUID v4
  title: string;                   // Auto-generated from first message
  messages: ChatMessage[];
  mode: string;                    // Mode ID used
  model: string;                   // Model used
  createdAt: string;               // ISO 8601
  updatedAt: string;               // ISO 8601
  totalTokens: number;
  estimatedCost: number;
}

interface ChatMessage {
  id: string;                      // UUID v4
  role: 'user' | 'assistant' | 'system' | 'error';
  content: string;
  images?: ImageAttachment[];
  timestamp: string;               // ISO 8601
  usage?: TokenUsage;
  model?: string;
  latencyMs?: number;
}

// ══════════════════════════════════════
//  MODES
// ══════════════════════════════════════

interface Mode {
  id: string;
  name: string;
  color: string;                   // Hex color
  systemPrompt: string;
  isBuiltIn: boolean;
}

interface CustomMode extends Mode {
  isBuiltIn: false;
  createdAt: string;
  updatedAt: string;
}

// Built-in modes
const BUILT_IN_MODES: Mode[] = [
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
    systemPrompt: `You are an expert coding assistant specializing in data structures, 
algorithms, and software engineering. When given a coding problem:
1. Analyze the problem and identify the optimal approach
2. Provide a clean, working solution in the requested language (default: Python)
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
    id: 'solve',
    name: 'Solve',
    color: '#FDCB6E',
    systemPrompt: `You are a problem-solving assistant. Provide:
1. Direct, concise answers first
2. Step-by-step explanation after the answer
3. Key formulas or concepts used
4. Common mistakes to avoid
Prioritize accuracy and speed. If multiple choice, state the answer letter first.`,
    isBuiltIn: true,
  },
];

// ══════════════════════════════════════
//  HOTKEY DEFAULTS
// ══════════════════════════════════════

const DEFAULT_HOTKEYS: Record<HotkeyAction, string> = {
  'toggle-overlay':    'Ctrl+Shift+G',
  'capture-screen':    'Ctrl+Shift+S',
  'capture-region':    'Ctrl+Shift+R',
  'focus-input':       'Ctrl+Shift+A',
  'copy-response':     'Ctrl+Shift+C',
  'new-conversation':  'Ctrl+Shift+N',
  'hide-overlay':      'Escape',
};
```

---

## 8. Local Storage Schema

### 8.1 electron-store Structure

```typescript
// File location: %APPDATA%/ghostai/config.json (encrypted)

{
  // ── Settings ──
  "settings": AppSettings,

  // ── API Keys (encrypted separately) ──
  "keys": {
    "openai": "{AES-256-encrypted-string}",
    "anthropic": "{AES-256-encrypted-string}",
    "gemini": "{AES-256-encrypted-string}"
  },

  // ── Chat History (optional, if persistence enabled) ──
  "conversations": Conversation[],

  // ── Window State ──
  "windowState": {
    "x": number,
    "y": number,
    "width": number,
    "height": number,
    "opacity": number
  }
}
```

### 8.2 Encryption Specification

```typescript
// API Key Encryption
Algorithm:   AES-256-GCM
Key Source:   Machine-specific derived key
             PBKDF2(machineId + appSalt, 100000 iterations, 32 bytes)
IV:          Random 12 bytes per encryption (stored alongside ciphertext)
Auth Tag:    16 bytes

// Storage format for encrypted key:
{
  "iv": "{base64}",
  "data": "{base64}",
  "tag": "{base64}"
}
```

---

## 9. Preload API (contextBridge)

### 9.1 Exposed API Surface

```typescript
// preload/index.ts — This is what the renderer can access

const ghostAPI = {
  // ── Overlay ──
  overlay: {
    toggle: () => ipcRenderer.invoke('overlay:toggle'),
    hide: () => ipcRenderer.invoke('overlay:hide'),
    show: () => ipcRenderer.invoke('overlay:show'),
    setOpacity: (opacity: number) => ipcRenderer.invoke('overlay:set-opacity', { opacity }),
    setPosition: (x: number, y: number) => ipcRenderer.invoke('overlay:set-position', { x, y }),
    setSize: (w: number, h: number) => ipcRenderer.invoke('overlay:set-size', { width: w, height: h }),
    getBounds: () => ipcRenderer.invoke('overlay:get-bounds'),
  },

  // ── Screenshot ──
  screenshot: {
    captureFull: () => ipcRenderer.invoke('screenshot:capture-full'),
    captureRegion: () => ipcRenderer.invoke('screenshot:capture-region'),
    getMonitors: () => ipcRenderer.invoke('screenshot:capture-monitors'),
  },

  // ── Store ──
  store: {
    get: (key: string) => ipcRenderer.invoke('store:get', { key }),
    set: (key: string, value: any) => ipcRenderer.invoke('store:set', { key, value }),
    getAll: () => ipcRenderer.invoke('store:get-all'),
    setApiKey: (provider: ProviderID, key: string) => ipcRenderer.invoke('store:set-api-key', { provider, key }),
    getApiKey: (provider: ProviderID) => ipcRenderer.invoke('store:get-api-key', { provider }),
    clearAll: () => ipcRenderer.invoke('store:clear-all'),
  },

  // ── Hotkeys ──
  hotkeys: {
    registerAll: () => ipcRenderer.invoke('hotkeys:register-all'),
    update: (action: string, shortcut: string) => ipcRenderer.invoke('hotkeys:update', { action, shortcut }),
  },

  // ── Clipboard ──
  clipboard: {
    copy: (text: string) => ipcRenderer.invoke('clipboard:copy', { text }),
    read: () => ipcRenderer.invoke('clipboard:read'),
    smartPaste: (text: string, wpm?: number) => ipcRenderer.invoke('clipboard:smart-paste', { text, wpm }),
  },

  // ── App ──
  app: {
    getInfo: () => ipcRenderer.invoke('app:get-info'),
    quit: () => ipcRenderer.invoke('app:quit'),
  },

  // ── Events (Main → Renderer) ──
  on: (channel: string, callback: (...args: any[]) => void) => {
    const validChannels = [
      'hotkeys:triggered',
      'overlay:visibility-changed',
      'screenshot:captured',
      'app:error',
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_event, ...args) => callback(...args));
    }
  },

  // ── Remove listener ──
  off: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.removeListener(channel, callback);
  },
};

contextBridge.exposeInMainWorld('ghostAPI', ghostAPI);
```

### 9.2 TypeScript Declaration

```typescript
// src/renderer/types/global.d.ts

declare global {
  interface Window {
    ghostAPI: {
      overlay: {
        toggle(): Promise<{ visible: boolean }>;
        hide(): Promise<void>;
        show(): Promise<void>;
        setOpacity(opacity: number): Promise<void>;
        setPosition(x: number, y: number): Promise<void>;
        setSize(width: number, height: number): Promise<void>;
        getBounds(): Promise<{ x: number; y: number; width: number; height: number }>;
      };
      screenshot: {
        captureFull(): Promise<ScreenshotResult>;
        captureRegion(): Promise<ScreenshotResult | { success: false; cancelled: true }>;
        getMonitors(): Promise<{ monitors: MonitorInfo[] }>;
      };
      store: {
        get(key: string): Promise<{ value: any }>;
        set(key: string, value: any): Promise<{ success: boolean }>;
        getAll(): Promise<AppSettings>;
        setApiKey(provider: ProviderID, key: string): Promise<{ success: boolean }>;
        getApiKey(provider: ProviderID): Promise<{ key: string | null }>;
        clearAll(): Promise<{ success: boolean }>;
      };
      hotkeys: {
        registerAll(): Promise<{ registered: string[] }>;
        update(action: string, shortcut: string): Promise<{ success: boolean; error?: string }>;
      };
      clipboard: {
        copy(text: string): Promise<{ success: boolean }>;
        read(): Promise<{ text: string | null; hasImage: boolean }>;
        smartPaste(text: string, wpm?: number): Promise<{ success: boolean }>;
      };
      app: {
        getInfo(): Promise<AppInfo>;
        quit(): Promise<void>;
      };
      on(channel: string, callback: (...args: any[]) => void): void;
      off(channel: string, callback: (...args: any[]) => void): void;
    };
  }
}
```

---

## 10. Event System

### 10.1 Main → Renderer Events

| Event | Payload | Trigger |
|---|---|---|
| `hotkeys:triggered` | `{ action: HotkeyAction, timestamp: string }` | Global hotkey pressed |
| `overlay:visibility-changed` | `{ visible: boolean }` | Overlay shown/hidden |
| `screenshot:captured` | `{ image: string, type: 'full' \| 'region' }` | Screenshot captured via hotkey |
| `app:error` | `{ code: string, message: string }` | System-level error occurred |

### 10.2 Internal Event Flow Examples

**Example: Screen Capture → AI Response**

```
[User] Presses Ctrl+Shift+S
    │
    ▼
[Main:hotkeys.ts] Detects global shortcut
    │
    ├──► [Main:overlay.ts] Hide overlay window
    │
    ├──► [Main:screenshot.ts] Wait 100ms → Capture screen
    │
    ├──► [Main:overlay.ts] Show overlay window
    │
    └──► [Main → Renderer] IPC event: 'screenshot:captured'
                │
                ▼
         [Renderer:useScreenshot] Receives base64 image
                │
                ├──► Display thumbnail in input area
                │
                └──► Auto-send to AI (if configured)
                        │
                        ▼
                 [Renderer:useAI] Calls provider.chat()
                        │
                        ├──► Stream chunks to ChatPanel
                        │
                        └──► Final response with usage stats
```

**Example: Hotkey Conflict Detection**

```
[User] Tries to set Ctrl+Shift+S for a different action
    │
    ▼
[Renderer] Calls window.ghostAPI.hotkeys.update('focus-input', 'Ctrl+Shift+S')
    │
    ▼
[Main:hotkeys.ts] Checks for conflicts
    │
    ├──► Conflict found: 'capture-screen' already uses Ctrl+Shift+S
    │
    └──► Returns { success: false, error: 'Shortcut already used by: Capture Screen' }
```

---

## 11. Error Codes & Handling

### 11.1 Error Code Registry

```typescript
enum InvisiQError {
  // ── Provider Errors (1xxx) ──
  PROVIDER_AUTH_FAILED      = 'E1001',  // Invalid API key
  PROVIDER_RATE_LIMITED     = 'E1002',  // Rate limit exceeded
  PROVIDER_QUOTA_EXCEEDED   = 'E1003',  // Billing quota exceeded
  PROVIDER_MODEL_NOT_FOUND  = 'E1004',  // Model ID invalid
  PROVIDER_CONTEXT_TOO_LONG = 'E1005',  // Input exceeds context window
  PROVIDER_SERVER_ERROR     = 'E1006',  // 500 from provider
  PROVIDER_TIMEOUT          = 'E1007',  // Request timed out
  PROVIDER_STREAM_ERROR     = 'E1008',  // Stream interrupted
  PROVIDER_CONTENT_FILTERED = 'E1009',  // Content blocked by safety filter

  // ── Screenshot Errors (2xxx) ──
  SCREENSHOT_CAPTURE_FAILED = 'E2001',  // desktopCapturer failed
  SCREENSHOT_REGION_CANCEL  = 'E2002',  // User cancelled region selection
  SCREENSHOT_NO_DISPLAY     = 'E2003',  // No display found
  SCREENSHOT_PERMISSION     = 'E2004',  // Screen recording permission denied (macOS)

  // ── Storage Errors (3xxx) ──
  STORE_READ_FAILED         = 'E3001',  // Failed to read from store
  STORE_WRITE_FAILED        = 'E3002',  // Failed to write to store
  STORE_ENCRYPTION_FAILED   = 'E3003',  // Encryption/decryption failed
  STORE_CORRUPTED           = 'E3004',  // Store data corrupted

  // ── Hotkey Errors (4xxx) ──
  HOTKEY_REGISTER_FAILED    = 'E4001',  // Failed to register shortcut
  HOTKEY_CONFLICT           = 'E4002',  // Shortcut already in use
  HOTKEY_INVALID_FORMAT     = 'E4003',  // Invalid accelerator string

  // ── System Errors (5xxx) ──
  SYSTEM_NO_INTERNET        = 'E5001',  // No network connectivity
  SYSTEM_PROTECTION_FAILED  = 'E5002',  // setContentProtection failed
  SYSTEM_UNSUPPORTED_OS     = 'E5003',  // OS doesn't support capture exclusion
}
```

### 11.2 Error Response Format

```typescript
interface InvisiQErrorResponse {
  code: InvisiQError;
  message: string;              // Human-readable message
  details?: string;             // Technical details
  retryable: boolean;           // Can user retry this action?
  retryAfterMs?: number;        // Suggested wait time before retry
  action?: 'switch-model' | 'add-key' | 'check-settings' | 'retry';
}

// Example
{
  code: 'E1002',
  message: 'Rate limit exceeded. Please wait before trying again.',
  details: 'OpenAI API returned 429: Rate limit reached for gpt-4o',
  retryable: true,
  retryAfterMs: 60000,
  action: 'retry'
}
```

### 11.3 Error Handling Strategy Per Provider

```typescript
// Unified error mapping
function mapProviderError(provider: ProviderID, status: number, body: any): InvisiQErrorResponse {
  // ── HTTP 401 ──
  if (status === 401) {
    return { code: 'E1001', message: 'Invalid API key.', retryable: false, action: 'add-key' };
  }

  // ── HTTP 429 ──
  if (status === 429) {
    const retryAfter = parseInt(body?.headers?.['retry-after'] || '60') * 1000;
    return { code: 'E1002', message: 'Rate limited.', retryable: true, retryAfterMs: retryAfter, action: 'retry' };
  }

  // ── HTTP 400 (context too long) ──
  if (status === 400 && body?.error?.type === 'invalid_request_error') {
    return { code: 'E1005', message: 'Input too long for this model.', retryable: false, action: 'switch-model' };
  }

  // ── HTTP 5xx ──
  if (status >= 500) {
    return { code: 'E1006', message: 'AI provider server error.', retryable: true, retryAfterMs: 5000, action: 'retry' };
  }

  // ── Default ──
  return { code: 'E1006', message: 'Unknown error.', retryable: true, action: 'retry' };
}
```

---

## 12. Rate Limiting & Retry Strategy

### 12.1 Retry Configuration

```typescript
interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableStatusCodes: number[];
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  retryableStatusCodes: [429, 500, 502, 503, 504],
};
```

### 12.2 Exponential Backoff Implementation

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === config.maxRetries) break;
      if (!isRetryable(error, config)) break;

      const delay = Math.min(
        config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt),
        config.maxDelayMs
      );

      // Add jitter (±25%)
      const jitter = delay * 0.25 * (Math.random() * 2 - 1);
      await sleep(delay + jitter);
    }
  }

  throw lastError;
}
```

### 12.3 Provider-Specific Rate Limits

| Provider | RPM (Requests/Min) | TPM (Tokens/Min) | Strategy |
|---|---|---|---|
| OpenAI (Tier 1) | 500 | 200,000 | Respect `retry-after` header |
| Anthropic (Free) | 50 | 40,000 | Exponential backoff |
| Gemini (Free) | 15 | 1,000,000 | Queue requests, 4s minimum gap |

---

## 13. Security Contract

### 13.1 Threat Model

| Threat | Mitigation |
|---|---|
| API key theft from disk | AES-256-GCM encryption with machine-specific derived key |
| API key exposure in memory | Clear keys from variables after use; no logging of keys |
| Man-in-the-middle on API calls | HTTPS only; certificate pinning optional |
| Renderer process compromise | contextIsolation: true; no nodeIntegration; minimal preload surface |
| IPC injection | Validate all IPC arguments in main process; whitelist channels |
| Screenshot data leak | Screenshots stored in memory only; cleared after AI response |
| Process inspection | Executable renamed; skipTaskbar; empty title |

### 13.2 IPC Security Rules

```typescript
// All IPC handlers MUST:
// 1. Validate argument types
// 2. Sanitize string inputs
// 3. Reject unexpected channels
// 4. Rate-limit calls from renderer

// Example validated handler
ipcMain.handle('store:set-api-key', async (_event, args) => {
  // Type validation
  if (!args || typeof args !== 'object') throw new Error('Invalid args');
  if (!['openai', 'anthropic', 'gemini'].includes(args.provider)) throw new Error('Invalid provider');
  if (typeof args.key !== 'string') throw new Error('Invalid key type');
  if (args.key.length > 500) throw new Error('Key too long');

  // Process
  await encryptAndStore(args.provider, args.key);
  return { success: true };
});
```

### 13.3 Content Security Policy

```typescript
// Renderer CSP (via meta tag or Electron session)
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",    // Required for Tailwind
  "img-src 'self' data:",                 // data: for base64 screenshots
  "connect-src https://api.openai.com https://api.anthropic.com https://generativelanguage.googleapis.com",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
].join('; ');
```

---

*End of API Contract Document*
