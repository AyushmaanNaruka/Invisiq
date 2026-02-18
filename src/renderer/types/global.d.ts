import type {
  AppSettings,
  ProviderID,
  ScreenshotResult,
  MonitorInfo,
  AppInfo,
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
        captureFull(): Promise<ScreenshotResult>;
        captureRegion(): Promise<ScreenshotResult | null>;
        getMonitors(): Promise<{ monitors: MonitorInfo[] }>;
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
        smartPaste(text: string, wpm?: number): Promise<{ success: boolean }>;
      };
      app: {
        getInfo(): Promise<AppInfo>;
        quit(): Promise<void>;
      };
      on(channel: string, callback: (...args: unknown[]) => void): () => void;
      off(channel: string, callback: (...args: unknown[]) => void): void;
    };
  }
}

export {};
