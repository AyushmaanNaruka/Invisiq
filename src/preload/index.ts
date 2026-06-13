import { contextBridge, ipcRenderer } from 'electron';

// Channel whitelist for events from main → renderer
const VALID_CHANNELS = [
  'hotkeys:triggered',
  'overlay:visibility-changed',
  'screenshot:captured',
  'app:error',
  'clipboard:changed',
  'monitors:changed',
  'update:checking',
  'update:available',
  'update:not-available',
  'update:progress',
  'update:downloaded',
  'update:error',
  'update:required',
  // Phase 4
  'audio:chunk',
  'companion:message',
  'companion:device-connected',
  'companion:device-disconnected',
  // Phase 5
  'resilience:agent-status-changed',
  'resilience:agent-response',
  'overlay:stealth-focus-changed',
  'overlay:clipboard-input-requested',
  // Invisible Input (legacy uiohook fallback tier)
  'invisible-input:status',
  'invisible-input:char',
  'invisible-input:enter',
  'invisible-input:backspace',
  'invisible-input:delete',
  // Model B — default-on stealth capture
  'capture:key',
  'capture:state',
  'capture:failed',
  'proctor:detected',
  // Beta — auth + entitlement
  'auth:changed',
  'entitlement:changed',
];

const ghostAPI = {
  // ══════════════════════════════════════
  //  AUTH (Google OAuth — Beta)
  // ══════════════════════════════════════
  auth: {
    login: (): Promise<{ signedIn: boolean; email: string | null; userId: string | null; error?: string }> =>
      ipcRenderer.invoke('auth:login'),
    logout: (): Promise<{ signedIn: boolean; email: string | null; userId: string | null }> =>
      ipcRenderer.invoke('auth:logout'),
    status: (): Promise<{ signedIn: boolean; email: string | null; userId: string | null }> =>
      ipcRenderer.invoke('auth:status'),
  },

  // ══════════════════════════════════════
  //  ENTITLEMENT (14-day trial — Beta)
  // ══════════════════════════════════════
  entitlement: {
    status: (): Promise<{ status: string; daysLeft: number; expiresAt: string | null }> =>
      ipcRenderer.invoke('entitlement:status'),
    refresh: (): Promise<{ status: string; daysLeft: number; expiresAt: string | null }> =>
      ipcRenderer.invoke('entitlement:refresh'),
  },

  // ══════════════════════════════════════
  //  ANALYTICS + T&C (Beta — §8)
  // ══════════════════════════════════════
  analytics: {
    track: (name: string, props?: Record<string, unknown>): Promise<void> =>
      ipcRenderer.invoke('analytics:track', { name, props }),
    capturePrompt: (prompt: {
      content: string;
      model?: string;
      mode?: string;
      hasImage?: boolean;
    }): Promise<void> => ipcRenderer.invoke('analytics:capture-prompt', { prompt }),
    deleteMyData: (): Promise<{ ok: boolean; error?: string }> =>
      ipcRenderer.invoke('analytics:delete-my-data'),
  },
  tos: {
    accept: (): Promise<{ ok: boolean }> => ipcRenderer.invoke('tos:accept'),
    status: (): Promise<{ current: string }> => ipcRenderer.invoke('tos:status'),
  },

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
    // Phase 4
    setPassthrough: (enabled: boolean, forward?: boolean): Promise<void> =>
      ipcRenderer.invoke('overlay:set-passthrough', { enabled, forward }),
    // Phase 5 — Stealth focus (anti-detection for monitored apps)
    setStealthFocus: (enabled: boolean): Promise<{ enabled: boolean }> =>
      ipcRenderer.invoke('overlay:set-stealth-focus', { enabled }),
    getStealthFocusStatus: (): Promise<{ enabled: boolean }> =>
      ipcRenderer.invoke('overlay:stealth-focus-status'),
    requestFocus: (timeoutMs?: number): Promise<void> =>
      ipcRenderer.invoke('overlay:request-focus', { timeoutMs }),
    releaseFocus: (): Promise<void> =>
      ipcRenderer.invoke('overlay:release-focus'),
  },

  // ══════════════════════════════════════
  //  SCREENSHOT
  // ══════════════════════════════════════
  screenshot: {
    captureFull: (monitorId?: string) =>
      ipcRenderer.invoke('screenshot:capture-full', monitorId ? { monitorId } : undefined),
    captureRegion: () =>
      ipcRenderer.invoke('screenshot:capture-region'),
    getMonitors: () =>
      ipcRenderer.invoke('screenshot:capture-monitors'),
    // Phase 4 — silent capture (no overlay hide/show, for background OCR)
    captureSilent: (monitorId?: string) =>
      ipcRenderer.invoke('screenshot:capture-silent', monitorId ? { monitorId } : undefined),
    // Phase 4 — inline snipping
    captureForSnip: () =>
      ipcRenderer.invoke('screenshot:capture-for-snip'),
    cropRegion: (req: unknown) =>
      ipcRenderer.invoke('screenshot:crop-region', req),
  },

  // ══════════════════════════════════════
  //  MONITORS
  // ══════════════════════════════════════
  monitors: {
    getAll: () =>
      ipcRenderer.invoke('monitors:get-all'),
    moveOverlay: (monitorId: string) =>
      ipcRenderer.invoke('monitors:move-overlay', { monitorId }),
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
    startMonitor: (interval?: number) =>
      ipcRenderer.invoke('clipboard:start-monitor', { interval }),
    stopMonitor: () =>
      ipcRenderer.invoke('clipboard:stop-monitor'),
    monitorStatus: () =>
      ipcRenderer.invoke('clipboard:monitor-status'),
  },

  // ══════════════════════════════════════
  //  MODES
  // ══════════════════════════════════════
  modes: {
    list: () =>
      ipcRenderer.invoke('modes:list'),
    save: (mode: unknown) =>
      ipcRenderer.invoke('modes:save', { mode }),
    delete: (id: string) =>
      ipcRenderer.invoke('modes:delete', { id }),
  },

  // ══════════════════════════════════════
  //  CONVERSATION
  // ══════════════════════════════════════
  conversation: {
    save: (conversation: unknown) =>
      ipcRenderer.invoke('conversation:save', { conversation }),
    load: (id: string) =>
      ipcRenderer.invoke('conversation:load', { id }),
    list: () =>
      ipcRenderer.invoke('conversation:list'),
    delete: (id: string) =>
      ipcRenderer.invoke('conversation:delete', { id }),
    search: (query: string) =>
      ipcRenderer.invoke('conversation:search', { query }),
    export: (id: string, format: string = 'markdown') =>
      ipcRenderer.invoke('conversation:export', { id, format }),
    deleteAll: () =>
      ipcRenderer.invoke('conversation:delete-all'),
  },

  // ══════════════════════════════════════
  //  APP
  // ══════════════════════════════════════
  app: {
    getInfo: () =>
      ipcRenderer.invoke('app:get-info'),
    quit: () =>
      ipcRenderer.invoke('app:quit'),
    openDataFolder: () =>
      ipcRenderer.invoke('app:open-data-folder'),
  },

  // ══════════════════════════════════════
  //  AUTO-UPDATER
  // ══════════════════════════════════════
  update: {
    check: () =>
      ipcRenderer.invoke('update:check'),
    download: () =>
      ipcRenderer.invoke('update:download'),
    install: () =>
      ipcRenderer.invoke('update:install'),
    versionStatus: () =>
      ipcRenderer.invoke('update:version-status'),
  },

  // ══════════════════════════════════════
  //  PHASE 4: AUDIO CAPTURE
  // ══════════════════════════════════════
  audio: {
    startSystemCapture: (source: string, chunkIntervalMs: number) =>
      ipcRenderer.invoke('audio:start-system-capture', { source, chunkIntervalMs }),
    stopSystemCapture: () =>
      ipcRenderer.invoke('audio:stop-system-capture'),
    captureStatus: () =>
      ipcRenderer.invoke('audio:capture-status'),
  },

  // ══════════════════════════════════════
  //  PHASE 4: COMPANION
  // ══════════════════════════════════════
  companion: {
    start: (port: number) =>
      ipcRenderer.invoke('companion:start', { port }),
    stop: () =>
      ipcRenderer.invoke('companion:stop'),
    status: () =>
      ipcRenderer.invoke('companion:status'),
    devices: () =>
      ipcRenderer.invoke('companion:devices'),
  },

  // ══════════════════════════════════════
  //  PHASE 4: TEMPLATES
  // ══════════════════════════════════════
  template: {
    list: () =>
      ipcRenderer.invoke('template:list'),
    save: (template: unknown) =>
      ipcRenderer.invoke('template:save', { template }),
    delete: (id: string) =>
      ipcRenderer.invoke('template:delete', { id }),
  },

  // ══════════════════════════════════════
  //  PHASE 4: EXPORT
  // ══════════════════════════════════════
  export: {
    conversation: (id: string, format: string) =>
      ipcRenderer.invoke('export:conversation', { id, format }),
    saveDialog: (defaultName: string, format: string) =>
      ipcRenderer.invoke('export:save-dialog', { defaultName, format }),
  },

  // ══════════════════════════════════════
  //  PHASE 4: MEMORY
  // ══════════════════════════════════════
  memory: {
    search: (query: string, limit?: number) =>
      ipcRenderer.invoke('memory:search', { query, limit }),
    add: (content: string, tags?: string[]) =>
      ipcRenderer.invoke('memory:add', { content, tags }),
    delete: (id: string) =>
      ipcRenderer.invoke('memory:delete', { id }),
    list: (page: number, limit?: number) =>
      ipcRenderer.invoke('memory:list', { page, limit }),
    clearAll: () =>
      ipcRenderer.invoke('memory:clear-all'),
    stats: () =>
      ipcRenderer.invoke('memory:stats'),
    extract: (conversationId: string) =>
      ipcRenderer.invoke('memory:extract', { conversationId }),
  },

  // ══════════════════════════════════════
  //  INVISIBLE INPUT (Global keyboard capture for stealth mode)
  // ══════════════════════════════════════
  invisibleInput: {
    arm: (): Promise<{ armed: boolean; error?: string }> =>
      ipcRenderer.invoke('invisible-input:arm'),
    disarm: (): Promise<{ armed: boolean }> =>
      ipcRenderer.invoke('invisible-input:disarm'),
    toggle: (): Promise<{ armed: boolean; error?: string }> =>
      ipcRenderer.invoke('invisible-input:toggle'),
    status: (): Promise<{ armed: boolean }> =>
      ipcRenderer.invoke('invisible-input:status'),
  },

  // ══════════════════════════════════════
  //  MODEL B: STEALTH CAPTURE (logical-focus typing)
  // ══════════════════════════════════════
  capture: {
    enter: (): Promise<{ active: boolean; epoch: number; tier: string }> =>
      ipcRenderer.invoke('capture:enter'),
    exit: (): Promise<{ active: boolean }> =>
      ipcRenderer.invoke('capture:exit'),
    status: (): Promise<{ active: boolean; epoch: number; tier: string }> =>
      ipcRenderer.invoke('capture:status'),
    panic: (): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('capture:panic'),
    proctorStatus: (): Promise<{ detected: boolean; names: string[] }> =>
      ipcRenderer.invoke('capture:proctor-status'),
  },

  // ══════════════════════════════════════
  //  PHASE 5: RESILIENCE
  // ══════════════════════════════════════
  resilience: {
    startAgent: (helperPath?: string, pipeName?: string) =>
      ipcRenderer.invoke('resilience:start-agent', { helperPath, pipeName }),
    stopAgent: () =>
      ipcRenderer.invoke('resilience:stop-agent'),
    sendCommand: (command: { type: string; payload?: Record<string, unknown> }) =>
      ipcRenderer.invoke('resilience:send-command', { command }),
    status: () =>
      ipcRenderer.invoke('resilience:status'),
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
