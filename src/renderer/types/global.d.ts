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
      };
      screenshot: {
        captureFull(monitorId?: string): Promise<ScreenshotResult>;
        captureRegion(): Promise<ScreenshotResult | null>;
        getMonitors(): Promise<{ monitors: MonitorInfo[] }>;
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
