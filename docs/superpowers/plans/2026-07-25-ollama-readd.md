# Ollama Local-LLM Re-Add Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the Ollama local-LLM provider (removed in the beta cloud-only pivot) so InvisiQ can run fully offline against a local Ollama server, alongside the existing 5 cloud BYOK providers.

**Architecture:** Ollama is a 6th `AIProvider` implementation with a bespoke (non-`OpenAICompatibleProvider`) adapter, since its native `/api/chat` wire format, `<think>` reasoning-tag streaming, and vision-model detection differ from OpenAI's wire format. It is registered lazily like the cloud providers, but its "API key" field is actually a local server URL. Because Ollama exposes a dynamic, locally-queried model list (not a static catalog), the UI (`ModelSelector`, `Settings`) special-cases it separately from the 5 static-catalog cloud providers. `useAI.ts` gains Ollama-only context-budget and OCR-based vision-workaround logic, gated on `provider.id === 'ollama'` so cloud providers are completely unaffected.

**Tech Stack:** TypeScript (strict), React 18, Electron 33, `tesseract.js` (already a dependency, reused for OCR).

**Reference implementation:** `D:\Projects\ghostai - Copy` (a pre-beta local copy of this repo, before Ollama was removed for the cloud-only beta pivot). All restored code in this plan is adapted from that copy.

## Global Constraints

- Cloud providers (OpenAI/Anthropic/Gemini/Groq/OpenRouter) must be byte-for-byte unaffected — every Ollama-specific branch must be gated on `provider.id === 'ollama'` or `providerId === 'ollama'`.
- `PROVIDER_IDS` in `src/shared/constants.ts` stays exactly `['openai', 'anthropic', 'gemini', 'groq', 'openrouter']` — it is the "shipping BYOK cloud provider" list used for cost-tracked static-catalog iteration (`ModelSelector`'s static provider order, `App.tsx`'s `checkProviders` key-check loop). Ollama is NOT added to it; it is handled as a separate, additive, dynamic branch everywhere that list is consumed for UI purposes. This matches how the old (pre-removal) codebase treated it.
- `ProviderID` (the type union) DOES gain `'ollama'` — it is a legitimate provider id used for routing (`AIProvider.id`, `ChatRequest`/model routing, encrypted-key storage).
- No new npm dependency is required — `tesseract.js` is already in `package.json` (used by `useCodeDetection.ts` for on-screen OCR) and is reused here for Ollama's vision workaround.
- `npm run typecheck` must pass clean after every task.

---

### Task 1: Shared types, constants, and provider-validation lists

**Files:**
- Modify: `src/shared/types.ts:7` (`ProviderID` union), `src/shared/types.ts:393-400` (`AppSettings.providers`)
- Modify: `src/shared/constants.ts:133-140` (`DEFAULT_SETTINGS.providers`), `src/shared/constants.ts:449-455` (`AI_API_DOMAINS`)
- Modify: `src/main/store.ts:15-26` (`StoreSchema`), `src/main/store.ts:195-196` (`VALID_PROVIDERS`)
- Modify: `src/main/ipc-handlers.ts:66` (`VALID_PROVIDERS`)

**Interfaces:**
- Produces: `ProviderID` now includes `'ollama'` — every later task's code that references `provider.id === 'ollama'` or `providerId === 'ollama'` depends on this.
- Produces: `AppSettings.providers.ollama: ProviderConfig` — Task 6 (Settings UI) relies on `store.ts`'s `setApiKey`/`getApiKey`/`removeApiKey` being able to persist an `ollama` entry without throwing "Invalid provider".

- [ ] **Step 1: Add `'ollama'` to the `ProviderID` union**

  In `src/shared/types.ts`, find:
  ```typescript
  // 'groq' + 'openrouter' added Jun 2026 — both OpenAI-compatible (see openai-compatible.ts).
  // OpenRouter exposes DeepSeek/Qwen/Mistral through a single BYOK key.
  export type ProviderID = 'openai' | 'anthropic' | 'gemini' | 'groq' | 'openrouter';
  ```
  Replace with:
  ```typescript
  // 'groq' + 'openrouter' added Jun 2026 — both OpenAI-compatible (see openai-compatible.ts).
  // OpenRouter exposes DeepSeek/Qwen/Mistral through a single BYOK key.
  // 'ollama' re-added for the open-source release — local server, no API key, dynamic model list.
  export type ProviderID = 'openai' | 'anthropic' | 'gemini' | 'groq' | 'openrouter' | 'ollama';
  ```

- [ ] **Step 2: Add `ollama` to `AppSettings.providers`**

  In `src/shared/types.ts`, find:
  ```typescript
  export interface AppSettings {
    providers: {
      openai: ProviderConfig;
      anthropic: ProviderConfig;
      gemini: ProviderConfig;
      groq: ProviderConfig;
      openrouter: ProviderConfig;
    };
  ```
  Replace with:
  ```typescript
  export interface AppSettings {
    providers: {
      openai: ProviderConfig;
      anthropic: ProviderConfig;
      gemini: ProviderConfig;
      groq: ProviderConfig;
      openrouter: ProviderConfig;
      ollama: ProviderConfig;
    };
  ```

- [ ] **Step 3: Add `ollama` to `DEFAULT_SETTINGS.providers`**

  In `src/shared/constants.ts`, find:
  ```typescript
  export const DEFAULT_SETTINGS: AppSettings = {
    providers: {
      openai: { hasKey: false, isValid: false },
      anthropic: { hasKey: false, isValid: false },
      gemini: { hasKey: false, isValid: false },
      groq: { hasKey: false, isValid: false },
      openrouter: { hasKey: false, isValid: false },
    },
  ```
  Replace with:
  ```typescript
  export const DEFAULT_SETTINGS: AppSettings = {
    providers: {
      openai: { hasKey: false, isValid: false },
      anthropic: { hasKey: false, isValid: false },
      gemini: { hasKey: false, isValid: false },
      groq: { hasKey: false, isValid: false },
      openrouter: { hasKey: false, isValid: false },
      ollama: { hasKey: false, isValid: false },
    },
  ```

- [ ] **Step 4: Add the local Ollama endpoint to `AI_API_DOMAINS`**

  In `src/shared/constants.ts`, find:
  ```typescript
  // Cloud-only (Beta Launch Plan §6.3). Local LLM endpoints removed permanently —
  // no localhost entry means an OpenAI-compatible local server can't be reached.
  export const AI_API_DOMAINS = [
    'https://api.openai.com/*',
    'https://api.anthropic.com/*',
    'https://generativelanguage.googleapis.com/*',
    'https://api.groq.com/*',
    'https://openrouter.ai/*',
  ];
  ```
  Replace with:
  ```typescript
  export const AI_API_DOMAINS = [
    'https://api.openai.com/*',
    'https://api.anthropic.com/*',
    'https://generativelanguage.googleapis.com/*',
    'https://api.groq.com/*',
    'https://openrouter.ai/*',
    'http://localhost:11434/*',
  ];
  ```

- [ ] **Step 5: Add `ollama` to the encrypted-keys schema in `store.ts`**

  In `src/main/store.ts`, find:
  ```typescript
  interface StoreSchema {
    settings: AppSettings;
    keys: {
      openai?: EncryptedPayload;
      anthropic?: EncryptedPayload;
      gemini?: EncryptedPayload;
      groq?: EncryptedPayload;
      openrouter?: EncryptedPayload;
    };
    windowState: WindowState;
    auth?: StoredAuthSession;
  }
  ```
  Replace with:
  ```typescript
  interface StoreSchema {
    settings: AppSettings;
    keys: {
      openai?: EncryptedPayload;
      anthropic?: EncryptedPayload;
      gemini?: EncryptedPayload;
      groq?: EncryptedPayload;
      openrouter?: EncryptedPayload;
      ollama?: EncryptedPayload;
    };
    windowState: WindowState;
    auth?: StoredAuthSession;
  }
  ```

- [ ] **Step 6: Allow `ollama` through the provider-validation gate in `store.ts`**

  In `src/main/store.ts`, find:
  ```typescript
  // Ollama removed permanently for the beta (Beta Launch Plan §6.3) — cloud-only.
  const VALID_PROVIDERS: ProviderID[] = PROVIDER_IDS;
  ```
  Replace with:
  ```typescript
  // PROVIDER_IDS is the 5 cloud BYOK providers; ollama is a local server (no
  // API key) added separately so setApiKey/getApiKey/removeApiKey accept it.
  const VALID_PROVIDERS: ProviderID[] = [...PROVIDER_IDS, 'ollama'];
  ```

- [ ] **Step 7: Allow `ollama` through the provider-validation gate in `ipc-handlers.ts`**

  In `src/main/ipc-handlers.ts`, find:
  ```typescript
  const VALID_PROVIDERS: ProviderID[] = PROVIDER_IDS;
  ```
  Replace with:
  ```typescript
  // PROVIDER_IDS is the 5 cloud BYOK providers; ollama is a local server (no
  // API key) added separately so store:set-api-key etc. accept it.
  const VALID_PROVIDERS: ProviderID[] = [...PROVIDER_IDS, 'ollama'];
  ```

- [ ] **Step 8: Typecheck**

  Run: `npm run typecheck`
  Expected: FAILS at this point — `ai-providers/index.ts`/`provider-manager.ts` don't yet register an `'ollama'` factory, but nothing in Task 1's files themselves should error. If `types.ts`/`constants.ts`/`store.ts`/`ipc-handlers.ts` show errors, fix them before proceeding; errors elsewhere (e.g. `ModelSelector.tsx` missing an `ollama` case in an exhaustive switch, if any) are expected and resolved in later tasks.

- [ ] **Step 9: Commit**

  ```bash
  git add src/shared/types.ts src/shared/constants.ts src/main/store.ts src/main/ipc-handlers.ts
  git commit -m "feat(ollama): add ollama to ProviderID, settings schema, and validation lists"
  ```

---

### Task 2: Restore the `OllamaProvider` and wire it into the provider registry

**Files:**
- Create: `src/renderer/services/ai-providers/ollama.ts`
- Modify: `src/renderer/services/ai-providers/index.ts`

**Interfaces:**
- Consumes: `AIProvider`, `ChatRequest`, `ChatResponse`, `StreamChunk`, `ModelConfig`, `ValidationResult` from `./types` (already exist, unchanged).
- Produces: `OllamaProvider` class implementing `AIProvider` with `id = 'ollama'`, plus a public `refreshModels(): Promise<ModelConfig[]>` method (used by Task 3's `ModelSelector` and Task 5's `useAI.ts`). `provider-manager.ts`'s existing `refreshModels(providerId)` already feature-detects this method via `'refreshModels' in provider` — no change needed there.

- [ ] **Step 1: Create `src/renderer/services/ai-providers/ollama.ts`**

  ```typescript
  import type { AIProvider, ChatRequest, ChatResponse, StreamChunk, ModelConfig, ValidationResult } from './types';

  const DEFAULT_OLLAMA_URL = 'http://localhost:11434';

  // Tuned conservatively for ~6GB VRAM after OS/Electron/browser overhead.
  // 7B Q4 model is ~4.7GB; KV cache for 4k ctx adds ~230MB → fits even with
  // Brave/Chrome running. Larger ctx caused observed spill-to-CPU on this hardware.
  const DEFAULT_NUM_CTX = 4096;

  // Reasoning models (DeepSeek-R1, QwQ) burn 4-8k tokens inside <think> before
  // emitting the answer. 6144 got fully consumed by thinking → no answer ever
  // emerged. 16384 leaves room for a full reasoning pass + the code answer.
  // (On ~6GB VRAM at ~37 tok/s this caps a hard problem at ~6-7 min worst case.)
  const DEFAULT_NUM_PREDICT = 16384;

  // Hold the model in VRAM between turns so follow-up queries skip the
  // 8-15s cold-load on small-VRAM machines.
  const KEEP_ALIVE = '30m';

  // Code tasks need deterministic sampling. 0.7 (Ollama's default) wanders.
  const DEFAULT_TEMPERATURE = 0.2;

  interface OllamaTagsResponse {
    models: Array<{
      name: string;
      model: string;
      size: number;
      details?: {
        family?: string;
        parameter_size?: string;
      };
    }>;
  }

  interface OllamaChatChunk {
    model: string;
    // Reasoning models (DeepSeek-R1, QwQ) return chain-of-thought in `thinking`,
    // separate from the final answer in `content`. Older models only use `content`.
    message: { role: string; content: string; thinking?: string };
    done: boolean;
    total_duration?: number;
    prompt_eval_count?: number;
    eval_count?: number;
  }

  const VISION_KEYWORDS = ['llava', 'vision', 'bakllava', 'moondream', 'llama-vision', 'minicpm-v'];

  function isVisionModel(name: string): boolean {
    const lower = name.toLowerCase();
    return VISION_KEYWORDS.some((kw) => lower.includes(kw));
  }

  export class OllamaProvider implements AIProvider {
    readonly name = 'Ollama';
    readonly id = 'ollama' as const;

    private _models: ModelConfig[] = [];
    private serverUrl: string = DEFAULT_OLLAMA_URL;
    private abortController: AbortController | null = null;

    get models(): ModelConfig[] {
      return this._models;
    }

    initialize(serverUrl: string): void {
      // The "API key" field stores the server URL for Ollama
      this.serverUrl = (serverUrl || DEFAULT_OLLAMA_URL).replace(/\/+$/, '');
    }

    async validateKey(): Promise<ValidationResult> {
      try {
        const res = await fetch(`${this.serverUrl}/api/tags`, { signal: AbortSignal.timeout(5000) });
        if (!res.ok) {
          return { valid: false, error: `Ollama returned ${res.status}` };
        }
        const data = (await res.json()) as OllamaTagsResponse;
        const modelNames = data.models?.map((m) => m.name) || [];
        // Refresh model list on successful validation
        this._models = this.buildModelConfigs(data);
        return { valid: true, models: modelNames };
      } catch (error: unknown) {
        const msg = (error as Error).message || 'Connection failed';
        if (msg.includes('fetch') || msg.includes('ECONNREFUSED') || msg.includes('Failed')) {
          return { valid: false, error: 'Cannot connect to Ollama. Is it running?' };
        }
        return { valid: false, error: msg };
      }
    }

    async refreshModels(): Promise<ModelConfig[]> {
      try {
        const res = await fetch(`${this.serverUrl}/api/tags`, { signal: AbortSignal.timeout(5000) });
        if (!res.ok) return this._models;
        const data = (await res.json()) as OllamaTagsResponse;
        this._models = this.buildModelConfigs(data);
        return this._models;
      } catch {
        return this._models;
      }
    }

    async *chat(request: ChatRequest): AsyncGenerator<StreamChunk, ChatResponse> {
      this.abortController = new AbortController();
      const startTime = Date.now();
      let fullContent = '';
      let usage = { inputTokens: 0, outputTokens: 0, totalTokens: 0, estimatedCostUSD: 0 };
      let finishReason: 'stop' | 'max_tokens' | 'error' = 'stop';

      try {
        const messages = this.buildMessages(request);

        const res = await fetch(`${this.serverUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: request.model,
            messages,
            stream: true,
            keep_alive: KEEP_ALIVE,
            options: {
              num_ctx: DEFAULT_NUM_CTX,
              num_predict: request.maxTokens || DEFAULT_NUM_PREDICT,
              temperature: request.temperature ?? DEFAULT_TEMPERATURE,
            },
          }),
          signal: this.abortController.signal,
        });

        if (!res.ok) {
          const errorText = await res.text().catch(() => `HTTP ${res.status}`);
          yield { type: 'error', error: `Ollama error: ${errorText}` };
          return {
            content: fullContent,
            model: request.model,
            usage,
            finishReason: 'error',
            latency: Date.now() - startTime,
          };
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let buffer = '';
        // Reasoning models stream `thinking` before `content`. We wrap thinking in
        // <think>...</think> markers so the renderer can show it live (dimmed) and
        // strip it from the stored answer. fullContent holds ONLY the final answer.
        let thinkingOpen = false;

        // Yields stream chunks for one parsed Ollama message. Defined as a closure
        // returning an array (generators can't yield from nested fns) — small payloads.
        const processChunk = (chunk: OllamaChatChunk): StreamChunk[] => {
          const out: StreamChunk[] = [];
          const thinking = chunk.message?.thinking;
          const content = chunk.message?.content;

          if (thinking) {
            if (!thinkingOpen) {
              out.push({ type: 'text', text: '<think>' });
              thinkingOpen = true;
            }
            out.push({ type: 'text', text: thinking });
          }
          if (content) {
            if (thinkingOpen) {
              out.push({ type: 'text', text: '</think>' });
              thinkingOpen = false;
            }
            fullContent += content;
            out.push({ type: 'text', text: content });
          }
          if (chunk.done) {
            // If the stream ended while still inside a thinking block (budget exhausted
            // before any answer), close the tag so the renderer doesn't hang open.
            if (thinkingOpen) {
              out.push({ type: 'text', text: '</think>' });
              thinkingOpen = false;
            }
            usage = {
              inputTokens: chunk.prompt_eval_count || 0,
              outputTokens: chunk.eval_count || 0,
              totalTokens: (chunk.prompt_eval_count || 0) + (chunk.eval_count || 0),
              estimatedCostUSD: 0, // Local — always free
            };
          }
          return out;
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const chunk = JSON.parse(line) as OllamaChatChunk;
              for (const c of processChunk(chunk)) yield c;
            } catch {
              // Skip unparseable lines
            }
          }
        }

        // Process remaining buffer
        if (buffer.trim()) {
          try {
            const chunk = JSON.parse(buffer) as OllamaChatChunk;
            for (const c of processChunk(chunk)) yield c;
          } catch {
            // ignore
          }
        }

        yield { type: 'done' };

        return {
          content: fullContent,
          model: request.model,
          usage,
          finishReason,
          latency: Date.now() - startTime,
        };
      } catch (error: unknown) {
        if ((error as Error).name === 'AbortError') {
          yield { type: 'done' };
          return {
            content: fullContent,
            model: request.model,
            usage,
            finishReason: 'stop',
            latency: Date.now() - startTime,
          };
        }
        yield { type: 'error', error: (error as Error).message };
        return {
          content: fullContent,
          model: request.model,
          usage,
          finishReason: 'error',
          latency: Date.now() - startTime,
        };
      } finally {
        this.abortController = null;
      }
    }

    abort(): void {
      this.abortController?.abort();
    }

    private buildMessages(
      request: ChatRequest
    ): Array<{ role: string; content: string; images?: string[] }> {
      const messages: Array<{ role: string; content: string; images?: string[] }> = [];

      if (request.systemPrompt) {
        messages.push({ role: 'system', content: request.systemPrompt });
      }

      for (const msg of request.messages) {
        if (msg.role === 'system' || msg.role === 'error') continue;

        const entry: { role: string; content: string; images?: string[] } = {
          role: msg.role,
          content: msg.content,
        };

        // Ollama vision: images as raw base64 strings (no data URI prefix)
        if (msg.role === 'user' && msg.images && msg.images.length > 0) {
          entry.images = msg.images.map((img) => img.data);
        }

        messages.push(entry);
      }

      // Attach request-level images to last user message
      if (request.images && request.images.length > 0) {
        const lastUser = [...messages].reverse().find((m) => m.role === 'user');
        if (lastUser && !lastUser.images) {
          lastUser.images = request.images.map((img) => img.data);
        }
      }

      return messages;
    }

    private buildModelConfigs(data: OllamaTagsResponse): ModelConfig[] {
      if (!data.models) return [];
      return data.models.map((m) => ({
        id: m.name,
        name: m.name,
        provider: 'ollama' as const,
        supportsVision: isVisionModel(m.name),
        maxContextTokens: 128000, // Reasonable default; Ollama doesn't expose this
        maxOutputTokens: 4096,
        costPer1MInput: 0,
        costPer1MOutput: 0,
        speed: 'medium' as const,
      }));
    }
  }
  ```

- [ ] **Step 2: Register `OllamaProvider` in `ai-providers/index.ts`**

  In `src/renderer/services/ai-providers/index.ts`, find:
  ```typescript
  providerManager.registerLazy('openrouter', async () => {
    const { OpenRouterProvider } = await import('./openrouter');
    return new OpenRouterProvider();
  });

  // Ollama removed permanently for the beta (Beta Launch Plan §6.3) — cloud-only.

  export { providerManager };
  export type { AIProvider } from './types';
  ```
  Replace with:
  ```typescript
  providerManager.registerLazy('openrouter', async () => {
    const { OpenRouterProvider } = await import('./openrouter');
    return new OpenRouterProvider();
  });

  // Ollama has no SDK to lazy-load, but registerLazy's factory pattern works
  // fine for a plain construction too — resolveProvider awaits it once.
  providerManager.registerLazy('ollama', async () => {
    const { OllamaProvider } = await import('./ollama');
    return new OllamaProvider();
  });

  export { providerManager };
  export type { AIProvider } from './types';
  ```

- [ ] **Step 3: Typecheck**

  Run: `npm run typecheck`
  Expected: PASS (Task 1 + Task 2 together resolve all `ProviderID`-related errors from providers/routing; remaining UI-layer errors, if any, belong to Tasks 3-4).

- [ ] **Step 4: Manual smoke test — provider resolves and connects**

  With a local Ollama server running (`ollama serve`, at least one model pulled, e.g. `ollama pull llama3.2`), temporarily add this to any already-mounted component's `useEffect` (or run via the DevTools console once the app is running in dev mode) to confirm the wiring works before the UI exists:
  ```javascript
  const { providerManager } = await import('./services/ai-providers/index');
  const p = await providerManager.resolveProvider('ollama');
  p.initialize('http://localhost:11434');
  console.log(await p.validateKey());
  ```
  Expected: `{ valid: true, models: [...] }` listing your pulled model(s). Remove the temporary snippet afterward — this is a manual check, not a permanent code change.

- [ ] **Step 5: Commit**

  ```bash
  git add src/renderer/services/ai-providers/ollama.ts src/renderer/services/ai-providers/index.ts
  git commit -m "feat(ollama): restore OllamaProvider and register it lazily"
  ```

---

### Task 3: Restore the "LOCAL" Ollama group in `ModelSelector`

**Files:**
- Modify: `src/renderer/components/ModelSelector.tsx` (full-file rewrite — the dynamic-model-fetching logic doesn't fit as a small patch)

**Interfaces:**
- Consumes: `providerManager.resolveProvider('ollama')`, `providerManager.refreshModels('ollama')` from Task 2; `window.ghostAPI.store.getApiKey('ollama')` (already generically supported by Task 1's `VALID_PROVIDERS` change).
- Produces: no new exports — `ModelSelector`'s default export signature is unchanged (`activeModel`, `onModelChange`, `availableProviders`, `onOpenSettings`, `compact`).

- [ ] **Step 1: Replace `src/renderer/components/ModelSelector.tsx` in full**

  ```typescript
  import React, { useState, useRef, useEffect, useCallback } from 'react';
  import { ChevronDown, Eye, Lock, Server } from 'lucide-react';
  import { GhostTooltip } from './ui/GhostTooltip';
  import { ALL_MODELS, PROVIDER_IDS } from '@shared/constants';
  import { providerManager } from '../services/ai-providers/provider-manager';
  import type { ModelConfig, ProviderID } from '@shared/types';

  interface ModelSelectorProps {
    activeModel: string;
    onModelChange: (modelId: string) => void;
    availableProviders: Set<ProviderID>;
    onOpenSettings: () => void;
    compact?: boolean;
  }

  const PROVIDER_LABELS: Record<ProviderID, string> = {
    openai: 'OPENAI',
    anthropic: 'ANTHROPIC',
    gemini: 'GOOGLE',
    groq: 'GROQ',
    openrouter: 'OPENROUTER',
    ollama: 'OLLAMA (LOCAL)',
  };
  // Static, cost-tracked cloud providers in display order. Ollama is NOT in
  // PROVIDER_IDS (it's a local server with a dynamic model list, not a static
  // catalog) — it's appended separately below, after its models are fetched.
  const PROVIDER_ORDER: ProviderID[] = PROVIDER_IDS;

  function abbreviateModelName(name: string): string {
    // "GPT-4o Mini" → "4o Mini", "Claude 3.5 Sonnet" → "3.5 Son.", "Gemini 1.5 Pro" → "1.5 Pro"
    return name
      .replace(/^GPT-/, '')
      .replace(/^Claude\s*/, '')
      .replace(/^Gemini\s*/, '')
      .replace(/Sonnet$/, 'Son.')
      .replace(/Haiku$/, 'Hai.');
  }

  function ModelSelector({
    activeModel,
    onModelChange,
    availableProviders,
    onOpenSettings,
    compact = false,
  }: ModelSelectorProps): JSX.Element {
    const [isOpen, setIsOpen] = useState(false);
    const [ollamaModels, setOllamaModels] = useState<ModelConfig[]>([]);
    const ref = useRef<HTMLDivElement>(null);
    const ollamaRefreshed = useRef(false);

    // Combine static (cloud) models with dynamically-fetched Ollama models
    const allModels = [...ALL_MODELS, ...ollamaModels];
    const currentModel = allModels.find((m) => m.id === activeModel) || ALL_MODELS[0];

    useEffect(() => {
      function handleClick(e: MouseEvent): void {
        if (ref.current && !ref.current.contains(e.target as Node)) {
          setIsOpen(false);
        }
      }
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    // Refresh Ollama's model list when the dropdown opens (once per open)
    const refreshOllama = useCallback(async () => {
      try {
        const ollamaProvider = await providerManager.resolveProvider('ollama');
        if (!ollamaProvider) return;
        const { key: serverUrl } = await window.ghostAPI.store.getApiKey('ollama');
        ollamaProvider.initialize(serverUrl || 'http://localhost:11434');
        const models = await providerManager.refreshModels('ollama');
        setOllamaModels(models);
      } catch {
        // Ollama not available — leave ollamaModels empty, section shows "Not detected"
      }
    }, []);

    useEffect(() => {
      if (isOpen && !ollamaRefreshed.current) {
        ollamaRefreshed.current = true;
        refreshOllama();
      }
      if (!isOpen) {
        ollamaRefreshed.current = false;
      }
    }, [isOpen, refreshOllama]);

    // Group models by provider
    const grouped = allModels.reduce<Partial<Record<ProviderID, ModelConfig[]>>>((acc, model) => {
      if (!acc[model.provider]) acc[model.provider] = [];
      acc[model.provider]!.push(model);
      return acc;
    }, {});

    return (
      <div ref={ref} className="relative no-drag">
        <GhostTooltip content={currentModel.name} placement="bottom" disabled={!compact}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-bg-hover text-text-primary text-xs transition-colors"
          >
            <span>{compact ? abbreviateModelName(currentModel.name) : currentModel.name}</span>
            <ChevronDown size={12} className="text-text-secondary" />
          </button>
        </GhostTooltip>

        {isOpen && (
          <div className="absolute top-full left-0 mt-1 w-52 bg-bg-overlay border border-border-subtle rounded-md shadow-dropdown z-50 max-h-[300px] overflow-y-auto">
            {PROVIDER_ORDER.map((provider) => {
              const models = grouped[provider];
              if (!models || models.length === 0) return null;

              const hasKey = availableProviders.has(provider);

              return (
                <div key={provider}>
                  <div className="px-3 py-1.5 text-text-placeholder text-[10px] font-bold uppercase tracking-wider">
                    {PROVIDER_LABELS[provider]}
                  </div>
                  {models.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => {
                        if (hasKey) {
                          onModelChange(model.id);
                          setIsOpen(false);
                        } else {
                          onOpenSettings();
                          setIsOpen(false);
                        }
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-bg-hover transition-colors ${
                        model.id === activeModel
                          ? 'text-accent-primary'
                          : hasKey
                          ? 'text-text-primary'
                          : 'text-text-placeholder'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        {!hasKey && <Lock size={10} />}
                        <span>{model.name}</span>
                      </div>
                      {model.supportsVision && <Eye size={10} className="text-text-secondary" />}
                    </button>
                  ))}
                </div>
              );
            })}

            {/* Ollama: dynamic local models, shown separately from the static cloud catalog */}
            {ollamaModels.length > 0 && (
              <div>
                <div className="px-3 py-1.5 text-text-placeholder text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <Server size={9} />
                  {PROVIDER_LABELS.ollama}
                </div>
                {ollamaModels.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => {
                      onModelChange(model.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-bg-hover transition-colors ${
                      model.id === activeModel ? 'text-accent-primary' : 'text-text-primary'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{model.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {model.supportsVision && <Eye size={10} className="text-text-secondary" />}
                      <span className="text-[9px] text-status-success">Free</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Show the Ollama section even when nothing is detected, so users discover it */}
            {ollamaModels.length === 0 && (
              <div>
                <div className="px-3 py-1.5 text-text-placeholder text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <Server size={9} />
                  {PROVIDER_LABELS.ollama}
                </div>
                <div className="px-3 py-2 text-text-placeholder text-[10px]">
                  Not detected. Install Ollama and pull a model to use local AI.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  export default React.memo(ModelSelector);
  ```

- [ ] **Step 2: Typecheck**

  Run: `npm run typecheck`
  Expected: PASS

- [ ] **Step 3: Commit**

  ```bash
  git add src/renderer/components/ModelSelector.tsx
  git commit -m "feat(ollama): restore LOCAL model group in ModelSelector"
  ```

---

### Task 4: Restore Ollama server-URL support in `Settings`

**Files:**
- Modify: `src/renderer/components/Settings.tsx`

**Interfaces:**
- Consumes: `providerManager.resolveProvider`, `window.ghostAPI.store.{getApiKey,setApiKey,removeApiKey}` (unchanged signatures; Task 1 made them accept `'ollama'`).
- Produces: no new exports.

**Note:** This task only touches the `PROVIDERS` array, the `keys` initial state, the key-loading `useEffect`, and the `api-keys` tab's JSX. It does not touch the `account` tab, `NAV_ITEMS`, or any auth-related props — those are owned by the separate de-gating plan and may or may not exist yet depending on which plan ran first. The snippets below match the current file regardless of that plan's status.

- [ ] **Step 1: Add the `Server` icon import**

  In `src/renderer/components/Settings.tsx`, find:
  ```typescript
  import {
    X, Eye, EyeOff, Check, CircleAlert, LoaderCircle, Trash2,
    Key, Keyboard, Monitor, Shield, Mic, Brain, Smartphone, Cpu,
    UserCircle, LogOut, GraduationCap, ShieldCheck,
  } from 'lucide-react';
  ```
  Replace with:
  ```typescript
  import {
    X, Eye, EyeOff, Check, CircleAlert, LoaderCircle, Trash2, Server,
    Key, Keyboard, Monitor, Shield, Mic, Brain, Smartphone, Cpu,
    UserCircle, LogOut, GraduationCap, ShieldCheck,
  } from 'lucide-react';
  ```
  > If the de-gating plan has already run and removed `UserCircle, LogOut, GraduationCap, ShieldCheck` (the account-tab icons) from this import, just add `Server` to whatever the import list looks like at that point — the exact surrounding names don't matter, only that `Server` is imported.

- [ ] **Step 2: Add Ollama to the `PROVIDERS` array with the `isServerUrl` flag**

  In `src/renderer/components/Settings.tsx`, find:
  ```typescript
  interface KeyState {
    value: string;
    masked: boolean;
    status: 'idle' | 'testing' | 'valid' | 'invalid';
    error?: string;
  }

  // Cloud-only (Beta Launch Plan §6.3) — Ollama removed permanently.
  const PROVIDERS: { id: ProviderID; name: string; placeholder: string }[] = [
    { id: 'openai', name: 'OpenAI', placeholder: 'sk-proj-...' },
    { id: 'anthropic', name: 'Anthropic', placeholder: 'sk-ant-...' },
    { id: 'gemini', name: 'Google Gemini', placeholder: 'AIza...' },
    { id: 'groq', name: 'Groq', placeholder: 'gsk_...' },
    { id: 'openrouter', name: 'OpenRouter', placeholder: 'sk-or-v1-...' },
  ];
  ```
  Replace with:
  ```typescript
  interface KeyState {
    value: string;
    masked: boolean;
    status: 'idle' | 'testing' | 'valid' | 'invalid';
    error?: string;
  }

  const PROVIDERS: { id: ProviderID; name: string; placeholder: string; isServerUrl?: boolean }[] = [
    { id: 'openai', name: 'OpenAI', placeholder: 'sk-proj-...' },
    { id: 'anthropic', name: 'Anthropic', placeholder: 'sk-ant-...' },
    { id: 'gemini', name: 'Google Gemini', placeholder: 'AIza...' },
    { id: 'groq', name: 'Groq', placeholder: 'gsk_...' },
    { id: 'openrouter', name: 'OpenRouter', placeholder: 'sk-or-v1-...' },
    { id: 'ollama', name: 'Ollama (Local)', placeholder: 'http://localhost:11434', isServerUrl: true },
  ];
  ```

- [ ] **Step 3: Add Ollama's default entry to the `keys` initial state**

  In `src/renderer/components/Settings.tsx`, find:
  ```typescript
    const [keys, setKeys] = useState<Record<ProviderID, KeyState>>({
      openai: { value: '', masked: true, status: 'idle' },
      anthropic: { value: '', masked: true, status: 'idle' },
      gemini: { value: '', masked: true, status: 'idle' },
      groq: { value: '', masked: true, status: 'idle' },
      openrouter: { value: '', masked: true, status: 'idle' },
    });
  ```
  Replace with:
  ```typescript
    const [keys, setKeys] = useState<Record<ProviderID, KeyState>>({
      openai: { value: '', masked: true, status: 'idle' },
      anthropic: { value: '', masked: true, status: 'idle' },
      gemini: { value: '', masked: true, status: 'idle' },
      groq: { value: '', masked: true, status: 'idle' },
      openrouter: { value: '', masked: true, status: 'idle' },
      ollama: { value: 'http://localhost:11434', masked: false, status: 'idle' },
    });
  ```

- [ ] **Step 4: Handle `isServerUrl` in the key-loading effect**

  In `src/renderer/components/Settings.tsx`, find:
  ```typescript
    // Load existing keys on open
    useEffect(() => {
      if (!isOpen) return;
      PROVIDERS.forEach(async ({ id }) => {
        const { key } = await window.ghostAPI.store.getApiKey(id);
        if (key) {
          setKeys((prev) => ({
            ...prev,
            [id]: { ...prev[id], value: key, status: 'idle' },
          }));
        }
      });
    }, [isOpen]);
  ```
  Replace with:
  ```typescript
    // Load existing keys on open
    useEffect(() => {
      if (!isOpen) return;
      PROVIDERS.forEach(async ({ id, isServerUrl }) => {
        const { key } = await window.ghostAPI.store.getApiKey(id);
        if (key) {
          setKeys((prev) => ({
            ...prev,
            [id]: { ...prev[id], value: key, masked: isServerUrl ? false : prev[id].masked, status: 'idle' },
          }));
        } else if (isServerUrl) {
          // Ollama defaults to localhost — no stored value means use the default
          setKeys((prev) => ({
            ...prev,
            [id]: { ...prev[id], value: 'http://localhost:11434', masked: false, status: 'idle' },
          }));
        }
      });
    }, [isOpen]);
  ```

- [ ] **Step 5: Render the server-URL variant in the `api-keys` tab**

  In `src/renderer/components/Settings.tsx`, find:
  ```typescript
              {PROVIDERS.map(({ id, name, placeholder }) => {
                const keyState = keys[id];
                return (
                  <div key={id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-text-primary text-sm font-medium flex items-center gap-1.5">
                        {name}
                      </label>
                      {keyState.status === 'valid' && (
                        <span className="flex items-center gap-1 text-status-success text-xs">
                          <Check size={12} /> Valid
                        </span>
                      )}
                      {keyState.status === 'invalid' && (
                        <span className="flex items-center gap-1 text-status-error text-xs">
                          <CircleAlert size={12} /> Invalid
                        </span>
                      )}
                    </div>

                    <div className="relative">
                      <input
                        type={keyState.masked ? 'password' : 'text'}
                        value={keyState.value}
                        onChange={(e) => handleKeyChange(id, e.target.value)}
                        onBlur={() => handleSaveKey(id)}
                        placeholder={placeholder}
                        className="w-full bg-bg-input border border-border-subtle rounded-md px-3 py-2 pr-10 text-sm text-text-primary placeholder:text-text-placeholder focus:outline-none focus:border-border-focus transition-colors"
                      />
                      <button
                        onClick={() => toggleMask(id)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                      >
                        {keyState.masked ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>

                    {keyState.error && (
                      <p className={`text-xs ${keyState.status === 'valid' ? 'text-status-success' : 'text-status-error'}`}>
                        {keyState.error}
                      </p>
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTestKey(id)}
                        disabled={!keyState.value.trim() || keyState.status === 'testing'}
                        className="px-3 py-1 text-xs font-medium rounded bg-bg-hover text-text-primary hover:bg-border-subtle disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                      >
                        {keyState.status === 'testing' ? (
                          <>
                            <LoaderCircle size={12} className="animate-spin" /> Testing...
                          </>
                        ) : (
                          'Test Key'
                        )}
                      </button>
                      {keyState.value.trim() && (
                        <GhostTooltip content="Remove API key" placement="top">
                          <button
                            onClick={() => handleRemoveKey(id)}
                            className="p-1 rounded text-text-secondary hover:text-status-error hover:bg-bg-hover transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </GhostTooltip>
                      )}
                    </div>
                  </div>
                );
              })}
  ```
  Replace with:
  ```typescript
              {PROVIDERS.map(({ id, name, placeholder, isServerUrl }) => {
                const keyState = keys[id];
                return (
                  <div key={id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-text-primary text-sm font-medium flex items-center gap-1.5">
                        {isServerUrl && <Server size={12} className="text-text-secondary" />}
                        {name}
                      </label>
                      {keyState.status === 'valid' && (
                        <span className="flex items-center gap-1 text-status-success text-xs">
                          <Check size={12} /> {isServerUrl ? 'Connected' : 'Valid'}
                        </span>
                      )}
                      {keyState.status === 'invalid' && (
                        <span className="flex items-center gap-1 text-status-error text-xs">
                          <CircleAlert size={12} /> {isServerUrl ? 'Unreachable' : 'Invalid'}
                        </span>
                      )}
                    </div>

                    {isServerUrl && (
                      <p className="text-text-secondary text-[10px]">Server URL (no API key needed)</p>
                    )}

                    <div className="relative">
                      <input
                        type={keyState.masked ? 'password' : 'text'}
                        value={keyState.value}
                        onChange={(e) => handleKeyChange(id, e.target.value)}
                        onBlur={() => handleSaveKey(id)}
                        placeholder={placeholder}
                        className="w-full bg-bg-input border border-border-subtle rounded-md px-3 py-2 pr-10 text-sm text-text-primary placeholder:text-text-placeholder focus:outline-none focus:border-border-focus transition-colors"
                      />
                      {!isServerUrl && (
                        <button
                          onClick={() => toggleMask(id)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                        >
                          {keyState.masked ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      )}
                    </div>

                    {keyState.error && (
                      <p className={`text-xs ${keyState.status === 'valid' ? 'text-status-success' : 'text-status-error'}`}>
                        {keyState.error}
                      </p>
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTestKey(id)}
                        disabled={!keyState.value.trim() || keyState.status === 'testing'}
                        className="px-3 py-1 text-xs font-medium rounded bg-bg-hover text-text-primary hover:bg-border-subtle disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                      >
                        {keyState.status === 'testing' ? (
                          <>
                            <LoaderCircle size={12} className="animate-spin" /> Testing...
                          </>
                        ) : (
                          isServerUrl ? 'Test Connection' : 'Test Key'
                        )}
                      </button>
                      {keyState.value.trim() && !isServerUrl && (
                        <GhostTooltip content="Remove API key" placement="top">
                          <button
                            onClick={() => handleRemoveKey(id)}
                            className="p-1 rounded text-text-secondary hover:text-status-error hover:bg-bg-hover transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </GhostTooltip>
                      )}
                    </div>
                  </div>
                );
              })}
  ```

- [ ] **Step 6: Typecheck**

  Run: `npm run typecheck`
  Expected: PASS

- [ ] **Step 7: Manual test — Settings UI**

  Run the app (`npm run dev`, or against a packaged build — see `docs/RELEASE.md`/CLAUDE.md's note that `npm run dev` is currently broken; test against a packaged build if dev mode fails). Open Settings → API Keys. Confirm:
  - An "Ollama (Local)" row appears with a server icon, pre-filled `http://localhost:11434`, unmasked, no eye-toggle button.
  - With `ollama serve` running and a model pulled, clicking "Test Connection" shows "Connected" and a model-count message.
  - With Ollama stopped, "Test Connection" shows "Unreachable".

- [ ] **Step 8: Commit**

  ```bash
  git add src/renderer/components/Settings.tsx
  git commit -m "feat(ollama): restore server-URL API-key variant in Settings"
  ```

---

### Task 5: Local-model-aware context budget and OCR vision workaround in `useAI.ts`

**Files:**
- Modify: `src/renderer/hooks/useAI.ts`

**Interfaces:**
- Consumes: `tesseract.js`'s `createWorker` (dynamic import, already a project dependency), `ChatMessage`, `ImageAttachment` from `@shared/types`.
- Produces: no exported-signature change to `useAI()` — `sendMessage`'s parameters and `UseAIReturn` shape are unchanged. All new logic is internal and gated on `provider.id === 'ollama'`.

- [ ] **Step 1: Add the OCR cap constant and helper functions**

  In `src/renderer/hooks/useAI.ts`, find:
  ```typescript
  // Char-based proxy for token budget. ~4 chars/token.
  // Reserve headroom for system prompt + assistant output → ~10k input budget.
  const MAX_CONTEXT_CHARS = 10000;

  /**
   * Smart truncation that preserves the FIRST user message (problem statement)
   * and the last few turns. Naive FIFO truncation drops the front, which is
   * precisely the problem statement on multi-turn debug sessions.
   */
  function smartTruncate(messages: ChatMessage[], maxChars: number): ChatMessage[] {
  ```
  Replace with:
  ```typescript
  // Char-based proxy for token budget. ~4 chars/token, num_ctx=4k → ~16k chars.
  // Reserve ~6k for system prompt + assistant output → ~10k input budget.
  const MAX_CONTEXT_CHARS = 10000;

  // Cap concatenated OCR text (Ollama vision workaround, see below). Three
  // screenshots of a problem statement easily hit 6-10k chars, half of it
  // redundant. With num_ctx=4096, OCR alone must not eat the whole budget.
  const MAX_OCR_CHARS = 4000;

  /**
   * Extract the LAST fenced code block from an assistant message.
   * Returns null if no code block found.
   */
  function extractLastCodeBlock(content: string): { code: string; lang: string } | null {
    const matches = [...content.matchAll(/```(\w+)?\n?([\s\S]*?)```/g)];
    if (matches.length === 0) return null;
    const last = matches[matches.length - 1];
    return { lang: last[1] || '', code: last[2].trim() };
  }

  /**
   * Detect a "fix this bug" turn: prior assistant message contains code AND
   * the new user turn has a screenshot (presumably of the error/wrong output).
   */
  function detectDebugTurn(
    messages: ChatMessage[],
    hasNewImages: boolean
  ): { isDebug: boolean; priorCode: { code: string; lang: string } | null } {
    if (!hasNewImages) return { isDebug: false, priorCode: null };
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant' && m.content);
    if (!lastAssistant) return { isDebug: false, priorCode: null };
    const priorCode = extractLastCodeBlock(lastAssistant.content);
    if (!priorCode || priorCode.code.length < 20) return { isDebug: false, priorCode: null };
    return { isDebug: true, priorCode };
  }

  /**
   * OCR-extract text from images using Tesseract.js. Used for Ollama models whose
   * vision capabilities are too weak to reliably read text/code from screenshots.
   *
   * Each Tesseract worker runs in a separate Web Worker thread — running images in
   * parallel across N workers converts O(N×25s) into ~max(25s). tesseract.js
   * downloads ~12MB of training data on first use; subsequent runs are cached.
   * The whole call is wrapped in a hard timeout so the pipeline can fall back to
   * image-less prompting if OCR stalls.
   */
  const OCR_TIMEOUT_MS = 60000;
  const OCR_MAX_PARALLEL = 3;
  const OCR_MAX_IMAGES = 3; // Cap defensively — 4+ screenshots are almost always redundant for a single query

  async function ocrExtractText(images: ImageAttachment[]): Promise<string> {
    const t0 = Date.now();
    const targets = images.slice(0, OCR_MAX_IMAGES);
    if (targets.length < images.length) {
      logger.warn(`[useAI] OCR: capped to first ${OCR_MAX_IMAGES} of ${images.length} images`);
    }

    try {
      const result = await Promise.race([
        (async (): Promise<string> => {
          const { createWorker } = await import('tesseract.js');
          const workerCount = Math.min(targets.length, OCR_MAX_PARALLEL);
          logger.log(`[useAI] OCR: creating ${workerCount} parallel worker(s)...`);

          const workers = await Promise.all(
            Array.from({ length: workerCount }, () => createWorker('eng'))
          );
          logger.log('[useAI] OCR: workers ready after', Date.now() - t0, 'ms');

          // Distribute images across workers; each runs recognize() concurrently on its own thread.
          const results = await Promise.all(
            targets.map(async (img, idx) => {
              const worker = workers[idx % workerCount];
              const ti = Date.now();
              const dataUri = `data:${img.mimeType};base64,${img.data}`;
              const { data: { text } } = await worker.recognize(dataUri);
              logger.log(`[useAI] OCR: image ${idx + 1}/${targets.length} done in ${Date.now() - ti}ms, ${text.length} chars`);
              return text.trim();
            })
          );

          await Promise.all(workers.map((w) => w.terminate().catch(() => undefined)));
          return results.filter(Boolean).join('\n\n');
        })(),
        new Promise<string>((_, reject) =>
          setTimeout(() => reject(new Error(`OCR timeout after ${OCR_TIMEOUT_MS}ms`)), OCR_TIMEOUT_MS)
        ),
      ]);
      logger.log('[useAI] OCR: total elapsed', Date.now() - t0, 'ms');
      return result;
    } catch (err) {
      logger.error('[useAI] OCR failed:', err);
      return '';
    }
  }

  /**
   * Smart truncation that preserves the FIRST user message (problem statement)
   * and the last few turns. Naive FIFO truncation drops the front, which is
   * precisely the problem statement on multi-turn debug sessions.
   */
  function smartTruncate(messages: ChatMessage[], maxChars: number): ChatMessage[] {
  ```

- [ ] **Step 2: Handle Ollama's server-URL initialization and dynamic model list in `initializeProvider`**

  In `src/renderer/hooks/useAI.ts`, find:
  ```typescript
      if (!initializedProviders.current.has(providerId)) {
        const { key: apiKey } = await window.ghostAPI.store.getApiKey(providerId);
        // No key → either not entered, or the trial has expired (getApiKey gates
        // on entitlement). Either way, prompt rather than silently failing.
        if (!apiKey) throw new Error(`No API key for ${provider.name}. Open Settings to add one.`);
        provider.initialize(apiKey);
        initializedProviders.current.add(providerId);
      }
  ```
  Replace with:
  ```typescript
      if (!initializedProviders.current.has(providerId)) {
        const { key: apiKey } = await window.ghostAPI.store.getApiKey(providerId);
        // Ollama uses a server URL (default localhost:11434), not an API key.
        if (providerId === 'ollama') {
          provider.initialize(apiKey || 'http://localhost:11434');
          if (provider.models.length === 0) {
            await providerManager.refreshModels('ollama');
          }
        } else {
          // No key → either not entered, or (pre-open-source) the trial had expired.
          if (!apiKey) throw new Error(`No API key for ${provider.name}. Open Settings to add one.`);
          provider.initialize(apiKey);
        }
        initializedProviders.current.add(providerId);
      }
  ```

- [ ] **Step 3: Add the OCR/debug-turn vision workaround to `sendMessage`, gated on Ollama**

  In `src/renderer/hooks/useAI.ts`, find:
  ```typescript
      const provider = await initializeProvider(options.model);
      activeProviderRef.current = provider;

      // Keep first user message + recent turns when over the context budget.
      const enrichedMessages = smartTruncate(contextMessages, MAX_CONTEXT_CHARS);

      const request: ChatRequest = {
        messages: enrichedMessages,
        model: options.model,
        systemPrompt: options.systemPrompt,
        images: options.images,
        stream: true,
      };
  ```
  Replace with:
  ```typescript
      const provider = await initializeProvider(options.model);
      activeProviderRef.current = provider;

      // For Ollama models: OCR-extract text from screenshots and send as text only.
      // Ollama vision models (llava, etc.) tend to *describe* images instead of
      // reading the text/code in them. By OCR-ing first and stripping the image, we
      // force the model to work with the actual content, producing far better
      // coding answers. Cloud providers are entirely unaffected by this block.
      let enrichedMessages: ChatMessage[] = contextMessages;
      let ollamaOcrApplied = false;
      let isDebugTurn = false;

      const ocrImages = options.images && options.images.length > 0
        ? options.images
        : contextMessages.filter((m) => m.role === 'user' && m.images?.length)
            .pop()?.images ?? [];

      if (provider.id === 'ollama' && ocrImages.length > 0) {
        let ocrText = await ocrExtractText(ocrImages);
        if (ocrText.length > MAX_OCR_CHARS) {
          ocrText = ocrText.slice(0, MAX_OCR_CHARS) + '\n\n[... OCR truncated to fit context budget ...]';
        }
        if (!ocrText) {
          // OCR failed (timeout, CDN issue, etc). Non-vision Ollama models would
          // otherwise silently ignore the raw image and respond to an effectively
          // empty prompt. Strip the image and tell the user what to do.
          logger.warn('[useAI] OCR returned empty — stripping image and notifying user');
          ollamaOcrApplied = true;
          enrichedMessages = contextMessages.map((msg, idx) => {
            if (idx === contextMessages.length - 1 && msg.role === 'user') {
              return {
                ...msg,
                images: undefined,
                content: `[A screenshot was attached but could not be read (OCR failed — likely first-run download of tesseract.js training data was blocked or timed out). Please paste the problem statement / code as text and resend.]\n\n${msg.content || ''}`,
              };
            }
            return msg;
          });
        }
        if (ocrText) {
          ollamaOcrApplied = true;

          // Detect "fix this code" follow-ups: prior assistant turn had code,
          // user now shows an error/wrong-output screenshot. Build a structured
          // debug prompt that explicitly pins the prior code as ground truth.
          const debug = detectDebugTurn(contextMessages, true);
          isDebugTurn = debug.isDebug;

          enrichedMessages = contextMessages.map((msg, idx) => {
            if (idx === contextMessages.length - 1 && msg.role === 'user') {
              const userQ = msg.content?.trim() || 'Fix the bug.';
              const enrichedContent = debug.isDebug && debug.priorCode
                ? [
                    'You previously gave this exact solution:',
                    '',
                    '```' + (debug.priorCode.lang || ''),
                    debug.priorCode.code,
                    '```',
                    '',
                    'The user ran it and shared the following output / error (OCR\'d from a screenshot — there may be minor character errors):',
                    '',
                    '---',
                    ocrText,
                    '---',
                    '',
                    `User says: ${userQ}`,
                    '',
                    'INSTRUCTIONS:',
                    '1. Trace through the PREVIOUS code above with the failing input. Identify the EXACT bug — not a generic issue.',
                    '2. State in 1-2 sentences WHY it fails (specific line, specific value).',
                    '3. Output the corrected FULL solution as a code block.',
                    '4. The corrected code MUST differ from the previous code in at least one substantive way. Do NOT re-emit the same code with cosmetic changes.',
                  ].join('\n')
                : `The following text was extracted from a screenshot. Answer the user's question based on this content.\n\n---\n${ocrText}\n---\n\n${userQ}`;

              return {
                ...msg,
                images: undefined, // Strip image — it confuses Ollama into describing instead of solving
                content: enrichedContent,
              };
            }
            return msg;
          });
          logger.log('[useAI] Ollama enrichment: OCR=%d chars, debugTurn=%s', ocrText.length, isDebugTurn);
        }
      }

      // Keep first user message + recent turns when over the context budget.
      enrichedMessages = smartTruncate(enrichedMessages, MAX_CONTEXT_CHARS);

      const request: ChatRequest = {
        messages: enrichedMessages,
        model: options.model,
        systemPrompt: options.systemPrompt,
        // Don't send images to Ollama when OCR succeeded — they cause image-description behavior.
        images: ollamaOcrApplied ? undefined : options.images,
        // Force deterministic sampling on debug turns so the model can't drift back to its prior wrong answer.
        temperature: isDebugTurn ? 0 : undefined,
        stream: true,
      };
  ```

- [ ] **Step 4: Typecheck**

  Run: `npm run typecheck`
  Expected: PASS

- [ ] **Step 5: Manual test — end-to-end Ollama chat**

  With `ollama serve` running and both a text model (e.g. `llama3.2`) and a vision model (e.g. `llava`) pulled:
  - Select an Ollama text model, send a plain-text question → confirm a streamed response with correct token usage (`estimatedCostUSD: 0`).
  - Select `llava`, attach a screenshot of a code problem, send → confirm the OCR path runs (check dev console for `[useAI] Ollama enrichment: OCR=...`) and the response addresses the screenshot's actual content rather than describing the image.
  - If you have a reasoning model pulled (e.g. `deepseek-r1`), send a question and confirm `<think>...</think>` reasoning renders as a dimmed section before the final answer.
  - Confirm cloud providers (e.g. OpenAI) still work exactly as before — no OCR, no `<think>` handling, unaffected by any of this task's changes.

- [ ] **Step 6: Commit**

  ```bash
  git add src/renderer/hooks/useAI.ts
  git commit -m "feat(ollama): local-model context budget + OCR vision workaround in useAI"
  ```

---

### Task 6: CLAUDE.md documentation pass (Ollama-specific sections)

**Files:**
- Modify: `CLAUDE.md`

**Interfaces:** None — documentation only.

- [ ] **Step 1: Update the "What This Project Does" cloud-only claim**

  Find the line:
  ```
  3. Sends screenshots + questions to cloud AI vision models (OpenAI, Anthropic, Google) — **cloud-only, BYOK**; the local-LLM/Ollama path was removed permanently
  ```
  Replace with:
  ```
  3. Sends screenshots + questions to cloud AI vision models (OpenAI, Anthropic, Google, Groq, OpenRouter) **or a local Ollama server** — BYOK for cloud providers, no key needed for Ollama
  ```

- [ ] **Step 2: Update §4 "AI Provider Abstraction"**

  Find the paragraph beginning:
  ```
  **Cloud-only, BYOK.** Five providers ship: OpenAI, Anthropic, Google Gemini, **Groq**, and **OpenRouter** (one key → DeepSeek/Qwen/Mistral). The Ollama/local-LLM adapter was removed permanently (no `ollama.ts`, no local endpoint in `AI_API_DOMAINS`). AI calls run in the **renderer** (HTTP), never the main process.
  ```
  Replace with:
  ```
  **Six providers ship:** OpenAI, Anthropic, Google Gemini, **Groq**, **OpenRouter** (one key → DeepSeek/Qwen/Mistral), and **Ollama** (local server, re-added for the open-source release — see `src/renderer/services/ai-providers/ollama.ts`). Ollama has no API key; its "key" field (`Settings.tsx`, `isServerUrl: true`) is a server URL defaulting to `http://localhost:11434`, and its model list is fetched dynamically from the running server rather than a static catalog. `useAI.ts` applies Ollama-only context-budget and OCR-based vision-workaround logic (small-context-window truncation, screenshot OCR via `tesseract.js` since local vision models tend to describe images rather than read their text) — entirely gated on `provider.id === 'ollama'`, so cloud providers are unaffected. AI calls run in the **renderer** (HTTP), never the main process.
  ```

- [ ] **Step 3: Update the Project Structure tree's provider list**

  Find:
  ```
  │   │   │   ├── anthropic.ts / gemini.ts             # all lazy-loaded
  │   │   │   │       # REMOVED: ollama.ts (local LLM removed permanently — cloud-only)
  ```
  Replace with:
  ```
  │   │   │   ├── anthropic.ts / gemini.ts / ollama.ts     # all lazy-loaded (ollama: bespoke, no SDK)
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add CLAUDE.md
  git commit -m "docs: update CLAUDE.md for Ollama re-add"
  ```
