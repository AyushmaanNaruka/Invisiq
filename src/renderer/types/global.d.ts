import type {
  AppSettings,
  ProviderID,
  ScreenshotResult,
  MonitorInfo,
  AppInfo,
  Conversation,
  ConversationMeta,
  Mode,
  CustomMode,
  RegionCropRequest,
  AudioCaptureSource,
  CompanionDevice,
  PromptTemplate,
  ExportFormat,
  MemoryFact,
  MemorySearchResult,
  MemoryStats,
  ResilienceCommand,
  ResilienceStatus,
} from '@shared/types';

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
        /** Phase 4: Click-through passthrough mode */
        setPassthrough(enabled: boolean, forward?: boolean): Promise<void>;
        /** Phase 5: Stealth focus — anti-detection for exams */
        setStealthFocus(enabled: boolean): Promise<{ enabled: boolean }>;
        getStealthFocusStatus(): Promise<{ enabled: boolean }>;
        requestFocus(timeoutMs?: number): Promise<void>;
        releaseFocus(): Promise<void>;
      };
      screenshot: {
        captureFull(monitorId?: string): Promise<ScreenshotResult>;
        captureRegion(): Promise<ScreenshotResult | null>;
        getMonitors(): Promise<{ monitors: MonitorInfo[] }>;
        /** Phase 4: Silent capture — no overlay hide/show (for background OCR) */
        captureSilent(monitorId?: string): Promise<ScreenshotResult>;
        /** Phase 4: Capture full screen for inline snipping (leaves overlay visible) */
        captureForSnip(): Promise<ScreenshotResult>;
        /** Phase 4: Crop the snip screenshot to the user-selected region */
        cropRegion(req: RegionCropRequest): Promise<ScreenshotResult>;
      };
      monitors: {
        getAll(): Promise<{ monitors: MonitorInfo[] }>;
        moveOverlay(monitorId: string): Promise<{ success: boolean }>;
      };
      store: {
        get(key: string): Promise<{ value: unknown }>;
        set(key: string, value: unknown): Promise<{ success: boolean }>;
        getAll(): Promise<AppSettings>;
        setApiKey(provider: ProviderID, key: string): Promise<{ success: boolean }>;
        getApiKey(provider: ProviderID): Promise<{ key: string | null }>;
        removeApiKey(provider: ProviderID): Promise<{ success: boolean }>;
        clearAll(): Promise<{ success: boolean }>;
      };
      hotkeys: {
        registerAll(): Promise<{ registered: string[] }>;
        update(action: string, shortcut: string): Promise<{ success: boolean; error?: string }>;
      };
      clipboard: {
        copy(text: string): Promise<{ success: boolean }>;
        read(): Promise<{ text: string | null; hasImage: boolean }>;
        smartPaste(text: string, wpm?: number): Promise<{ success: boolean; error?: string }>;
        startMonitor(interval?: number): Promise<{ success: boolean }>;
        stopMonitor(): Promise<{ success: boolean }>;
        monitorStatus(): Promise<{ running: boolean }>;
      };
      modes: {
        list(): Promise<{ builtIn: Mode[]; custom: CustomMode[] }>;
        save(mode: CustomMode): Promise<{ success: boolean }>;
        delete(id: string): Promise<{ success: boolean }>;
      };
      conversation: {
        save(conversation: Conversation): Promise<{ success: boolean }>;
        load(id: string): Promise<Conversation | null>;
        list(): Promise<ConversationMeta[]>;
        delete(id: string): Promise<{ success: boolean }>;
        search(query: string): Promise<ConversationMeta[]>;
        export(id: string, format?: string): Promise<{ content: string; filename: string } | null>;
        deleteAll(): Promise<{ success: boolean; count: number }>;
      };
      app: {
        getInfo(): Promise<AppInfo>;
        quit(): Promise<void>;
        openDataFolder(): Promise<void>;
      };
      update: {
        check(): Promise<void>;
        download(): Promise<void>;
        install(): Promise<void>;
      };
      /** Phase 4: System audio capture */
      audio: {
        startSystemCapture(
          source: AudioCaptureSource,
          chunkIntervalMs: number
        ): Promise<{ success: boolean; method: 'native' | 'powershell' | 'unavailable' }>;
        stopSystemCapture(): Promise<void>;
        captureStatus(): Promise<{ active: boolean; method: string }>;
      };
      /** Phase 4: Companion device server */
      companion: {
        start(port: number): Promise<{ success: boolean; url: string; qrDataUrl: string }>;
        stop(): Promise<void>;
        status(): Promise<{ running: boolean; connectedDevices: CompanionDevice[]; port: number }>;
        devices(): Promise<CompanionDevice[]>;
      };
      /** Phase 4: Prompt templates */
      template: {
        list(): Promise<{ builtIn: PromptTemplate[]; custom: PromptTemplate[] }>;
        save(template: PromptTemplate): Promise<{ success: boolean }>;
        delete(id: string): Promise<{ success: boolean }>;
      };
      /** Phase 4: Conversation export */
      export: {
        conversation(id: string, format: ExportFormat): Promise<{ success: boolean; path?: string }>;
        saveDialog(
          defaultName: string,
          format: ExportFormat
        ): Promise<{ path: string | null }>;
      };
      /** Phase 4: Local memory (RAG) */
      memory: {
        search(query: string, limit?: number): Promise<MemorySearchResult[]>;
        add(content: string, tags?: string[]): Promise<{ id: string }>;
        delete(id: string): Promise<{ success: boolean }>;
        list(page: number, limit?: number): Promise<{ facts: MemoryFact[]; total: number }>;
        clearAll(): Promise<{ count: number }>;
        stats(): Promise<MemoryStats>;
        extract(conversationId: string): Promise<{ extracted: number }>;
      };
      /** Invisible Input — global keyboard capture for stealth mode */
      invisibleInput: {
        arm(): Promise<{ armed: boolean; error?: string }>;
        disarm(): Promise<{ armed: boolean }>;
        toggle(): Promise<{ armed: boolean; error?: string }>;
        status(): Promise<{ armed: boolean }>;
      };
      /** Phase 5: Resilience helper agent */
      resilience: {
        startAgent(helperPath?: string, pipeName?: string): Promise<{ success: boolean; error?: string }>;
        stopAgent(): Promise<{ success: boolean }>;
        sendCommand(command: ResilienceCommand): Promise<{ success: boolean; error?: string }>;
        status(): Promise<ResilienceStatus>;
      };
      on(channel: string, callback: (...args: unknown[]) => void): () => void;
      off(channel: string, callback: (...args: unknown[]) => void): void;
    };
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }

  // ── Web Speech API Types ─────────────────────────────

  interface SpeechRecognitionResult {
    readonly isFinal: boolean;
    readonly length: number;
    [index: number]: SpeechRecognitionAlternative;
  }

  interface SpeechRecognitionAlternative {
    readonly transcript: string;
    readonly confidence: number;
  }

  interface SpeechRecognitionResultList {
    readonly length: number;
    [index: number]: SpeechRecognitionResult;
  }

  interface SpeechRecognitionEvent extends Event {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
  }

  interface SpeechRecognitionErrorEvent extends Event {
    readonly error: string;
    readonly message: string;
  }

  interface SpeechRecognition extends EventTarget {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    maxAlternatives: number;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onend: (() => void) | null;
    onstart: (() => void) | null;
    start(): void;
    stop(): void;
    abort(): void;
  }

  interface SpeechRecognitionConstructor {
    new (): SpeechRecognition;
  }
}

export {};
