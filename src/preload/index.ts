import { contextBridge, ipcRenderer } from 'electron';

// Channel whitelist for events from main → renderer
const VALID_CHANNELS = [
  'hotkeys:triggered',
  'overlay:visibility-changed',
  'screenshot:captured',
  'app:error',
];

const ghostAPI = {
  // ══════════════════════════════════════
  //  OVERLAY
  // ══════════════════════════════════════
  overlay: {
    toggle: (): Promise<{ visible: boolean }> =>
      ipcRenderer.invoke('overlay:toggle'),
    hide: (): Promise<void> =>
      ipcRenderer.invoke('overlay:hide'),
    show: (): Promise<void> =>
      ipcRenderer.invoke('overlay:show'),
    setOpacity: (opacity: number): Promise<void> =>
      ipcRenderer.invoke('overlay:set-opacity', { opacity }),
    setPosition: (x: number, y: number): Promise<void> =>
      ipcRenderer.invoke('overlay:set-position', { x, y }),
    setSize: (width: number, height: number): Promise<void> =>
      ipcRenderer.invoke('overlay:set-size', { width, height }),
    getBounds: (): Promise<{ x: number; y: number; width: number; height: number }> =>
      ipcRenderer.invoke('overlay:get-bounds'),
  },

  // ══════════════════════════════════════
  //  SCREENSHOT
  // ══════════════════════════════════════
  screenshot: {
    captureFull: () =>
      ipcRenderer.invoke('screenshot:capture-full'),
    captureRegion: () =>
      ipcRenderer.invoke('screenshot:capture-region'),
    getMonitors: () =>
      ipcRenderer.invoke('screenshot:capture-monitors'),
  },

  // ══════════════════════════════════════
  //  STORE
  // ══════════════════════════════════════
  store: {
    get: (key: string) =>
      ipcRenderer.invoke('store:get', { key }),
    set: (key: string, value: unknown) =>
      ipcRenderer.invoke('store:set', { key, value }),
    getAll: () =>
      ipcRenderer.invoke('store:get-all'),
    setApiKey: (provider: string, key: string) =>
      ipcRenderer.invoke('store:set-api-key', { provider, key }),
    getApiKey: (provider: string) =>
      ipcRenderer.invoke('store:get-api-key', { provider }),
    removeApiKey: (provider: string) =>
      ipcRenderer.invoke('store:remove-api-key', { provider }),
    clearAll: () =>
      ipcRenderer.invoke('store:clear-all'),
  },

  // ══════════════════════════════════════
  //  HOTKEYS
  // ══════════════════════════════════════
  hotkeys: {
    registerAll: () =>
      ipcRenderer.invoke('hotkeys:register-all'),
    update: (action: string, shortcut: string) =>
      ipcRenderer.invoke('hotkeys:update', { action, shortcut }),
  },

  // ══════════════════════════════════════
  //  CLIPBOARD
  // ══════════════════════════════════════
  clipboard: {
    copy: (text: string) =>
      ipcRenderer.invoke('clipboard:copy', { text }),
    read: () =>
      ipcRenderer.invoke('clipboard:read'),
    smartPaste: (text: string, wpm?: number) =>
      ipcRenderer.invoke('clipboard:smart-paste', { text, wpm }),
  },

  // ══════════════════════════════════════
  //  APP
  // ══════════════════════════════════════
  app: {
    getInfo: () =>
      ipcRenderer.invoke('app:get-info'),
    quit: () =>
      ipcRenderer.invoke('app:quit'),
  },

  // ══════════════════════════════════════
  //  EVENTS (Main → Renderer)
  // ══════════════════════════════════════
  on: (channel: string, callback: (...args: unknown[]) => void): (() => void) => {
    if (VALID_CHANNELS.includes(channel)) {
      const wrapper = (_event: unknown, ...args: unknown[]): void => callback(...args);
      ipcRenderer.on(channel, wrapper);
      return () => ipcRenderer.removeListener(channel, wrapper);
    }
    return () => {};
  },

  off: (channel: string, callback: (...args: unknown[]) => void): void => {
    if (VALID_CHANNELS.includes(channel)) {
      ipcRenderer.removeListener(channel, callback);
    }
  },
};

contextBridge.exposeInMainWorld('ghostAPI', ghostAPI);
