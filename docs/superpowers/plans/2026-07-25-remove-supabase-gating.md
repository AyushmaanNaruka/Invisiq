# Remove Supabase Auth/Trial/Analytics Gating Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the entire Supabase-backed beta gating stack (Google-OAuth login, server-clocked 14-day trial, prompt-capture analytics, T&C gate, remote kill-switch/version-floor) so InvisiQ boots straight to the main UI with no backend dependency, suitable for an open-source, self-hosted distribution.

**Architecture:** `App.tsx`'s boot sequence collapses from `ForcedUpdate → LoginScreen → LockScreen → TosGate → OnboardingFlow → main UI` down to `OnboardingFlow → main UI`. The main-process modules `auth.ts`, `entitlement.ts`, `analytics.ts` and their IPC surface are deleted outright. `crypto.ts` collapses from a dual-key scheme (machine-only key for legacy/auth secrets, entitlement-bound key gating API-key decryption on a live trial) to a single machine-only key — this is the actual trial-enforcement mechanism being removed, so it must go first among the "why does this even work" pieces. `electron-updater` keeps doing ordinary update checks against GitHub Releases; only the blocking kill-switch/version-floor check (which read a Supabase table) is removed.

**Tech Stack:** TypeScript (strict), Electron 33, `electron-store`, `electron-updater`.

## Global Constraints

- Existing users' API keys saved under the old entitlement-bound (v2) encryption scheme MUST NOT crash the app — they fail to decrypt post-collapse and must surface through the existing "no key / invalid key" UI path (prompt re-entry), never an unhandled exception. This is an accepted, approved one-time cost (see the design spec) — do not attempt to write a migration.
- No dependency removal is needed — `auth.ts`/`entitlement.ts`/`analytics.ts` use plain `fetch` against Supabase's REST endpoints, not an SDK (`package.json` has no `@supabase/supabase-js` or Google-OAuth library to remove).
- `npm run typecheck` must pass clean after every task.
- This plan is independent of, and can run before or after, the companion Ollama re-add plan (`docs/superpowers/plans/2026-07-25-ollama-readd.md`). Several steps below note where an anchor snippet might already be Ollama-adjusted by the other plan, and how to adapt.

---

### Task 1: Delete main-process auth/entitlement/analytics modules and their IPC handlers

**Files:**
- Delete: `src/main/auth.ts`, `src/main/entitlement.ts`, `src/main/analytics.ts`
- Modify: `src/main/index.ts`, `src/main/ipc-handlers.ts`

**Interfaces:**
- Produces: `registerIPCHandlers()` (in `ipc-handlers.ts`) no longer registers `auth:*`, `entitlement:*`, `analytics:*`, `tos:*` channels — Task 3 (preload) depends on this being done first, so the renderer's calls to those channels are removed in the same logical pass (preload can still reference dead channels harmlessly, but do Task 1 first for a clean sequence).

- [ ] **Step 1: Delete the three main-process modules**

  ```bash
  git rm src/main/auth.ts src/main/entitlement.ts src/main/analytics.ts
  ```
  Expected: three files staged for deletion.

- [ ] **Step 2: Remove their imports and call sites from `src/main/index.ts`**

  Find:
  ```typescript
  import { initInvisibleInput, cleanupInvisibleInput } from './invisible-input';
  import { initAuth } from './auth';
  import { initEntitlement } from './entitlement';
  import { trackEvent, flush as flushAnalytics } from './analytics';
  import { AI_API_DOMAINS, DEFAULT_PROCESS_NAME } from '@shared/constants';
  ```
  Replace:
  ```typescript
  import { initInvisibleInput, cleanupInvisibleInput } from './invisible-input';
  import { AI_API_DOMAINS, DEFAULT_PROCESS_NAME } from '@shared/constants';
  ```

  Find:
  ```typescript
    // Kick off silent auth refresh (non-blocking). The renderer's auth:status
    // query awaits this internally, so the login gate reflects a real session
    // without re-prompting returning users. Pure backend — no stealth impact.
    initAuth().catch((err) => console.error('[Auth] Silent refresh failed:', err));

    // Verify trial entitlement against the server (fetches the unlock fragment so
    // API keys can decrypt while active). Awaits auth internally. entitlement:status
    // awaits this, so the renderer's lock screen reflects a real server verdict.
    initEntitlement().catch((err) => console.error('[Entitlement] Init failed:', err));

    // Analytics (§8): privacy-safe launch event. Queued now, flushed once the
    // auth token is available (no-op if signed out).
    trackEvent('app_launch', { version: app.getVersion() });

    // Remote kill-switch / version floor (§10.4). Runs pre-auth (anon read);
    // fail-open. The renderer queries update:version-status to gate the UI.
    initVersionGate().catch((err) => console.error('[VersionGate] check failed:', err));

    // Create the overlay window
  ```
  Replace:
  ```typescript
    // Create the overlay window
  ```
  > Note: this block also removes the `initVersionGate()` call — its definition is removed from `updater.ts` in Task 2, and the now-stale `initVersionGate` import fixed there too.

  Find:
  ```typescript
  app.on('will-quit', () => {
    // Best-effort final analytics flush (fire-and-forget; quit doesn't await).
    flushAnalytics().catch(() => {});
    // Unregister all global shortcuts before quitting
    unregisterAllHotkeys();
  ```
  Replace:
  ```typescript
  app.on('will-quit', () => {
    // Unregister all global shortcuts before quitting
    unregisterAllHotkeys();
  ```

- [ ] **Step 3: Remove the handler registrations from `src/main/ipc-handlers.ts`**

  Find:
  ```typescript
  import { login as authLogin, logout as authLogout, getStatusReady as authStatus } from './auth';
  import { getStatusReady as entitlementStatus, refresh as entitlementRefresh } from './entitlement';
  import { trackEvent, capturePrompt, acceptTos, deleteMyData } from './analytics';
  import { CURRENT_TOS_VERSION, PROVIDER_IDS } from '@shared/constants';
  ```
  Replace:
  ```typescript
  import { PROVIDER_IDS } from '@shared/constants';
  ```

  Find:
  ```typescript
  export function registerIPCHandlers(): void {
    // ══════════════════════════════════════
    //  AUTH (Google OAuth — Beta)
    // ══════════════════════════════════════

    ipcMain.handle('auth:login', async () => {
      try {
        return await authLogin();
      } catch (error) {
        return {
          signedIn: false,
          email: null,
          userId: null,
          error: error instanceof Error ? error.message : 'login_failed',
        };
      }
    });

    ipcMain.handle('auth:logout', async () => {
      return authLogout();
    });

    ipcMain.handle('auth:status', async () => {
      return authStatus();
    });

    // ══════════════════════════════════════
    //  ENTITLEMENT (14-day trial — Beta)
    // ══════════════════════════════════════

    ipcMain.handle('entitlement:status', async () => {
      return entitlementStatus();
    });

    ipcMain.handle('entitlement:refresh', async () => {
      return entitlementRefresh();
    });

    // ══════════════════════════════════════
    //  ANALYTICS + T&C (Beta — §8)
    // ══════════════════════════════════════

    ipcMain.handle('analytics:track', (_event, args: unknown) => {
      if (!args || typeof args !== 'object') return;
      const { name, props } = args as { name?: unknown; props?: unknown };
      if (typeof name !== 'string') return;
      trackEvent(name, (props && typeof props === 'object' ? (props as Record<string, unknown>) : {}));
    });

    ipcMain.handle('analytics:capture-prompt', (_event, args: unknown) => {
      if (!args || typeof args !== 'object') return;
      const { prompt } = args as { prompt?: unknown };
      if (!prompt || typeof prompt !== 'object') return;
      const p = prompt as { content?: unknown; model?: unknown; mode?: unknown; hasImage?: unknown };
      if (typeof p.content !== 'string') return;
      capturePrompt({
        content: p.content,
        model: typeof p.model === 'string' ? p.model : undefined,
        mode: typeof p.mode === 'string' ? p.mode : undefined,
        hasImage: p.hasImage === true,
      });
    });

    ipcMain.handle('analytics:delete-my-data', async () => {
      return deleteMyData();
    });

    ipcMain.handle('tos:accept', async () => {
      return acceptTos();
    });

    ipcMain.handle('tos:status', () => {
      return { current: CURRENT_TOS_VERSION };
    });

    // ══════════════════════════════════════
    //  OVERLAY MANAGEMENT
    // ══════════════════════════════════════
  ```
  Replace:
  ```typescript
  export function registerIPCHandlers(): void {
    // ══════════════════════════════════════
    //  OVERLAY MANAGEMENT
    // ══════════════════════════════════════
  ```

- [ ] **Step 4: Typecheck**

  Run: `npm run typecheck`
  Expected: FAILS — `updater.ts` (Task 2), `preload/index.ts`/`global.d.ts` (Task 3), and renderer components (Tasks 4-5) still reference the removed surface. Confirm the errors are ONLY in those areas, not in `index.ts`/`ipc-handlers.ts` themselves.

- [ ] **Step 5: Commit**

  ```bash
  git add -A -- src/main/index.ts src/main/ipc-handlers.ts src/main/auth.ts src/main/entitlement.ts src/main/analytics.ts
  git commit -m "feat(open-source): remove auth/entitlement/analytics main-process modules and IPC handlers"
  ```

---

### Task 2: Remove the remote kill-switch / version-floor gate from the updater

**Files:**
- Modify: `src/main/updater.ts`, `src/main/ipc-handlers.ts`, `src/main/index.ts`

**Interfaces:**
- Produces: `updater.ts` no longer exports `initVersionGate`/`getVersionGateStatus`/`compareSemver` — Task 3 removes the corresponding `update:version-status` renderer API and `VersionGateStatus` type usage.

- [ ] **Step 1: Replace `src/main/updater.ts` in full**

  ```typescript
  import { autoUpdater, type UpdateInfo, type ProgressInfo } from 'electron-updater';
  import { BrowserWindow, shell } from 'electron';
  import { RELEASES_LATEST_URL } from '@shared/constants';

  let overlayRef: BrowserWindow | null = null;

  function sendToRenderer(channel: string, data?: unknown): void {
    if (overlayRef && !overlayRef.isDestroyed()) {
      overlayRef.webContents.send(channel, data);
    }
  }

  export function initializeAutoUpdater(overlayWindow: BrowserWindow): void {
    overlayRef = overlayWindow;

    // Configuration
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    // Events
    autoUpdater.on('checking-for-update', () => {
      console.log('[Updater] Checking for updates...');
      sendToRenderer('update:checking');
    });

    autoUpdater.on('update-available', (info: UpdateInfo) => {
      console.log('[Updater] Update available:', info.version);
      sendToRenderer('update:available', {
        version: info.version,
        releaseDate: info.releaseDate,
      });
    });

    autoUpdater.on('update-not-available', () => {
      console.log('[Updater] No updates available');
      sendToRenderer('update:not-available');
    });

    autoUpdater.on('download-progress', (progress: ProgressInfo) => {
      sendToRenderer('update:progress', {
        percent: Math.round(progress.percent),
        bytesPerSecond: progress.bytesPerSecond,
        transferred: progress.transferred,
        total: progress.total,
      });
    });

    autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
      console.log('[Updater] Update downloaded:', info.version);
      sendToRenderer('update:downloaded', {
        version: info.version,
      });
    });

    autoUpdater.on('error', (error: Error) => {
      console.error('[Updater] Error:', error.message);
      sendToRenderer('update:error', { message: error.message });
    });

    // Deferred auto-check (10 seconds after startup)
    setTimeout(() => {
      checkForUpdates().catch(() => {
        // Silently fail — don't interrupt app startup
      });
    }, 10000);
  }

  export async function checkForUpdates(): Promise<void> {
    try {
      await autoUpdater.checkForUpdates();
    } catch (error) {
      console.error('[Updater] Check failed:', (error as Error).message);
    }
  }

  export function downloadUpdate(): void {
    autoUpdater.downloadUpdate().catch((error) => {
      console.error('[Updater] Download failed:', (error as Error).message);
    });
  }

  export function installUpdate(): void {
    autoUpdater.quitAndInstall(false, true);
  }

  /**
   * Manual-download fallback. Opens the public releases page in the default
   * browser — used when the in-app updater feed is unreachable (offline,
   * GitHub rate-limit, or pre-publish).
   */
  export function openReleasesPage(): void {
    shell.openExternal(RELEASES_LATEST_URL).catch((error) => {
      console.error('[Updater] Failed to open releases page:', (error as Error).message);
    });
  }
  ```

- [ ] **Step 2: Fix the now-stale `updater` import in `src/main/index.ts`**

  Find:
  ```typescript
  import { initializeAutoUpdater, initVersionGate } from './updater';
  ```
  Replace:
  ```typescript
  import { initializeAutoUpdater } from './updater';
  ```

- [ ] **Step 3: Remove the version-status handler and stale import in `src/main/ipc-handlers.ts`**

  Find:
  ```typescript
  import {
    checkForUpdates,
    downloadUpdate,
    installUpdate,
    getVersionGateStatus,
    openReleasesPage,
  } from './updater';
  ```
  Replace:
  ```typescript
  import {
    checkForUpdates,
    downloadUpdate,
    installUpdate,
    openReleasesPage,
  } from './updater';
  ```

  Find:
  ```typescript
    ipcMain.handle('update:version-status', async () => {
      return getVersionGateStatus();
    });

    ipcMain.handle('update:open-releases', () => {
  ```
  Replace:
  ```typescript
    ipcMain.handle('update:open-releases', () => {
  ```

- [ ] **Step 4: Typecheck**

  Run: `npm run typecheck`
  Expected: still FAILS in preload/global.d.ts/renderer (Tasks 3-5) — `updater.ts`, `index.ts`, `ipc-handlers.ts` themselves should be clean now.

- [ ] **Step 5: Commit**

  ```bash
  git add src/main/updater.ts src/main/index.ts src/main/ipc-handlers.ts
  git commit -m "feat(open-source): remove remote kill-switch/version-floor gate from updater"
  ```

---

### Task 3: Strip the removed API surface from preload and its type declarations

**Files:**
- Modify: `src/preload/index.ts`, `src/renderer/types/global.d.ts`

**Interfaces:**
- Produces: `window.ghostAPI` no longer has `.auth`, `.entitlement`, `.analytics`, `.tos`, or `.update.versionStatus` — Task 5 (`App.tsx`) and Task 6 (`Settings.tsx`) must not reference them after this task.

- [ ] **Step 1: Remove dead renderer-event channels from `VALID_CHANNELS` in `src/preload/index.ts`**

  Find:
  ```typescript
    'update:downloaded',
    'update:error',
    'update:required',
    // Phase 4
  ```
  Replace:
  ```typescript
    'update:downloaded',
    'update:error',
    // Phase 4
  ```

  Find:
  ```typescript
    // Model B — default-on stealth capture
    'capture:key',
    'capture:state',
    'capture:failed',
    'capture:paste',
    'proctor:detected',
    // Beta — auth + entitlement
    'auth:changed',
    'entitlement:changed',
  ];
  ```
  Replace:
  ```typescript
    // Model B — default-on stealth capture
    'capture:key',
    'capture:state',
    'capture:failed',
    'capture:paste',
    'proctor:detected',
  ];
  ```

- [ ] **Step 2: Remove the `auth`, `entitlement`, `analytics`, `tos` objects from `ghostAPI`**

  Find:
  ```typescript
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
  ```
  Replace:
  ```typescript
  const ghostAPI = {
    // ══════════════════════════════════════
    //  OVERLAY
    // ══════════════════════════════════════
    overlay: {
  ```

- [ ] **Step 3: Remove `versionStatus` from the `update` object**

  Find:
  ```typescript
      install: () =>
        ipcRenderer.invoke('update:install'),
      versionStatus: () =>
        ipcRenderer.invoke('update:version-status'),
      openReleases: () =>
  ```
  Replace:
  ```typescript
      install: () =>
        ipcRenderer.invoke('update:install'),
      openReleases: () =>
  ```

- [ ] **Step 4: Update `src/renderer/types/global.d.ts` to match**

  Find:
  ```typescript
  import type {
    AppSettings,
    AuthStatus,
    EntitlementStatus,
    VersionGateStatus,
    ProviderID,
  ```
  Replace:
  ```typescript
  import type {
    AppSettings,
    ProviderID,
  ```

  Find:
  ```typescript
    interface Window {
      ghostAPI: {
        auth: {
          login(): Promise<AuthStatus & { error?: string }>;
          logout(): Promise<AuthStatus>;
          status(): Promise<AuthStatus>;
        };
        entitlement: {
          status(): Promise<EntitlementStatus>;
          refresh(): Promise<EntitlementStatus>;
        };
        analytics: {
          track(name: string, props?: Record<string, unknown>): Promise<void>;
          capturePrompt(prompt: {
            content: string;
            model?: string;
            mode?: string;
            hasImage?: boolean;
          }): Promise<void>;
          deleteMyData(): Promise<{ ok: boolean; error?: string }>;
        };
        tos: {
          accept(): Promise<{ ok: boolean }>;
          status(): Promise<{ current: string }>;
        };
        overlay: {
  ```
  Replace:
  ```typescript
    interface Window {
      ghostAPI: {
        overlay: {
  ```

  Find:
  ```typescript
          install(): Promise<void>;
          versionStatus(): Promise<VersionGateStatus>;
          openReleases(): Promise<void>;
  ```
  Replace:
  ```typescript
          install(): Promise<void>;
          openReleases(): Promise<void>;
  ```

- [ ] **Step 5: Typecheck**

  Run: `npm run typecheck`
  Expected: still FAILS in renderer components (Tasks 4-6) that reference `useAuth`/`useEntitlement`/`useUpdateGate`/`LoginScreen`/etc. `preload/index.ts` and `global.d.ts` themselves should be clean.

- [ ] **Step 6: Commit**

  ```bash
  git add src/preload/index.ts src/renderer/types/global.d.ts
  git commit -m "feat(open-source): remove auth/entitlement/analytics/tos from preload API surface"
  ```

---

### Task 4: Delete gate-only renderer components and hooks

**Files:**
- Delete: `src/renderer/components/LoginScreen.tsx`, `src/renderer/components/LockScreen.tsx`, `src/renderer/components/TosGate.tsx`, `src/renderer/components/ForcedUpdate.tsx`, `src/renderer/components/TrialBanner.tsx`
- Delete: `src/renderer/hooks/useAuth.ts`, `src/renderer/hooks/useEntitlement.ts`, `src/renderer/hooks/useUpdateGate.ts`

**Interfaces:** None produced — these are pure removals. Task 5 removes every remaining import of them from `App.tsx` (the only consumer, confirmed by a repo-wide grep during planning).

- [ ] **Step 1: Delete the five gate-only components**

  ```bash
  git rm src/renderer/components/LoginScreen.tsx src/renderer/components/LockScreen.tsx src/renderer/components/TosGate.tsx src/renderer/components/ForcedUpdate.tsx src/renderer/components/TrialBanner.tsx
  ```

- [ ] **Step 2: Delete the three gate-only hooks**

  ```bash
  git rm src/renderer/hooks/useAuth.ts src/renderer/hooks/useEntitlement.ts src/renderer/hooks/useUpdateGate.ts
  ```
  > `useUpdateGate` is deleted (not simplified) because its sole purpose was feeding the now-deleted `ForcedUpdate` blocking screen. Ordinary update notifications (`update:checking`/`update:available`/`update:downloaded`) already flow independently through the existing `UpdateNotification` component, which does not depend on `useUpdateGate`.

- [ ] **Step 3: Commit**

  ```bash
  git add -A -- src/renderer/components/LoginScreen.tsx src/renderer/components/LockScreen.tsx src/renderer/components/TosGate.tsx src/renderer/components/ForcedUpdate.tsx src/renderer/components/TrialBanner.tsx src/renderer/hooks/useAuth.ts src/renderer/hooks/useEntitlement.ts src/renderer/hooks/useUpdateGate.ts
  git commit -m "feat(open-source): delete gate-only auth/entitlement/version-gate components and hooks"
  ```

---

### Task 5: Simplify `App.tsx`'s boot flow

**Files:**
- Modify: `src/renderer/App.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `AppInner`'s render now goes straight from the settings-loading check to the onboarding check to the main UI — no login/lock/T&C/forced-update branches remain.

- [ ] **Step 1: Trim the import block**

  Find:
  ```typescript
  import Settings from './components/Settings';
  import ConversationHistory from './components/ConversationHistory';
  import OnboardingFlow from './components/OnboardingFlow';
  import LoginScreen from './components/LoginScreen';
  import LockScreen from './components/LockScreen';
  import TrialBanner from './components/TrialBanner';
  import TosGate from './components/TosGate';
  import ForcedUpdate from './components/ForcedUpdate';
  import UpdateNotification from './components/UpdateNotification';
  ```
  Replace:
  ```typescript
  import Settings from './components/Settings';
  import ConversationHistory from './components/ConversationHistory';
  import OnboardingFlow from './components/OnboardingFlow';
  import UpdateNotification from './components/UpdateNotification';
  ```

  Find:
  ```typescript
  import { useSettings } from './hooks/useSettings';
  import { useAuth } from './hooks/useAuth';
  import { useEntitlement } from './hooks/useEntitlement';
  import { useUpdateGate } from './hooks/useUpdateGate';
  import { useHotkeys } from './hooks/useHotkeys';
  ```
  Replace:
  ```typescript
  import { useSettings } from './hooks/useSettings';
  import { useHotkeys } from './hooks/useHotkeys';
  ```

  Find:
  ```typescript
  import { UNIVERSAL_MODE, CURRENT_TOS_VERSION, PROVIDER_IDS } from '@shared/constants';
  import type { ProviderID, ImageAttachment } from '@shared/types';

  // Initialize AI providers
  import './services/ai-providers/index';

  // Coarse length bucket for the message_sent event (never the text itself).
  function lengthBucket(len: number): string {
    if (len <= 50) return '0-50';
    if (len <= 200) return '51-200';
    if (len <= 500) return '201-500';
    if (len <= 1000) return '501-1000';
    return '1000+';
  }

  // Clipboard monitor — lives inside ToastProvider so it can show toasts
  ```
  Replace:
  ```typescript
  import { UNIVERSAL_MODE, PROVIDER_IDS } from '@shared/constants';
  import type { ProviderID, ImageAttachment } from '@shared/types';

  // Initialize AI providers
  import './services/ai-providers/index';

  // Clipboard monitor — lives inside ToastProvider so it can show toasts
  ```

- [ ] **Step 2: Remove the auth/entitlement/update-gate hooks from `AppInner`**

  Find:
  ```typescript
  function AppInner(): JSX.Element {
    const { settings, isLoading: settingsLoading, updateSetting } = useSettings();
    const {
      status: authStatus,
      isLoading: authLoading,
      isBusy: authBusy,
      error: authError,
      login: authLoginFn,
      logout: authLogoutFn,
    } = useAuth();
    const {
      entitlement,
      isLoading: entitlementLoading,
      isRefreshing: entitlementRefreshing,
      refresh: refreshEntitlement,
    } = useEntitlement(authStatus.signedIn);
    const { gate: updateGate } = useUpdateGate();
    const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  ```
  Replace:
  ```typescript
  function AppInner(): JSX.Element {
    const { settings, isLoading: settingsLoading, updateSetting } = useSettings();
    const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  ```

- [ ] **Step 3: Remove the analytics calls from `handleSend`**

  Find:
  ```typescript
        // Add user message to conversation (shows original text)
        addUserMessage(text, images);
        clearAllScreenshots();

        // Beta analytics (§8): capture the user's TYPED prompt (text only — never
        // screenshots/OCR) + a privacy-safe event. Server redacts before storing.
        window.ghostAPI.analytics.capturePrompt({
          content: text,
          model: settings.activeModel,
          mode: settings.activeMode,
          hasImage: !!images && images.length > 0,
        });
        window.ghostAPI.analytics.track('message_sent', {
          lengthBucket: lengthBucket(text.length),
          model: settings.activeModel,
          mode: settings.activeMode,
          hasImage: !!images && images.length > 0,
        });

        // Phase 4: Auto-extract facts from user message (non-blocking)
  ```
  Replace:
  ```typescript
        // Add user message to conversation (shows original text)
        addUserMessage(text, images);
        clearAllScreenshots();

        // Phase 4: Auto-extract facts from user message (non-blocking)
  ```

- [ ] **Step 4: Remove `handleAcceptTos`, the expired-trial analytics effect, and all four gate checks**

  Find:
  ```typescript
    // ── T&C acceptance (beta prompt-logging disclosure, §8) ──
    const handleAcceptTos = useCallback(async () => {
      await updateSetting('tosAcceptedVersion', CURRENT_TOS_VERSION);
      window.ghostAPI.tos.accept().catch(() => {});
      window.ghostAPI.analytics.track('tos_accepted', { version: CURRENT_TOS_VERSION });
    }, [updateSetting]);

    // Analytics: record when the trial lock is hit.
    useEffect(() => {
      if (entitlement.status === 'expired') {
        window.ghostAPI.analytics.track('expired_hit', {});
      }
    }, [entitlement.status]);

    // Forced-update gate — precedes everything (a killed/below-floor build must
    // update before any use, even sign-in). Fail-open: default is not-required.
    if (updateGate.required) {
      return <ForcedUpdate gate={updateGate} />;
    }

    // Show nothing while settings/auth are loading
    if (settingsLoading || authLoading || showOnboarding === null) {
      return <div className="h-screen w-screen bg-bg-overlay rounded-lg" />;
    }

    // Auth gate — must sign in before anything else (precedes onboarding)
    if (!authStatus.signedIn) {
      return <LoginScreen onLogin={authLoginFn} isBusy={authBusy} error={authError} />;
    }

    // Entitlement gate — block until the server confirms the trial is active.
    // Fail-closed: expired/offline/unknown all lock (the hard gate is in getApiKey).
    if (entitlementLoading) {
      return <div className="h-screen w-screen bg-bg-overlay rounded-lg" />;
    }
    if (entitlement.status !== 'active') {
      return (
        <LockScreen
          entitlement={entitlement}
          isRefreshing={entitlementRefreshing}
          onRefresh={refreshEntitlement}
          onSignOut={authLogoutFn}
        />
      );
    }

    // T&C gate — must accept the current beta terms (prompt-logging disclosure)
    // before any use; acceptance is logged server-side as proof of disclosure.
    if (settings.tosAcceptedVersion !== CURRENT_TOS_VERSION) {
      return <TosGate onAccept={handleAcceptTos} />;
    }

    // Onboarding gate
    if (showOnboarding) {
  ```
  Replace:
  ```typescript
    // Show nothing while settings are loading
    if (settingsLoading || showOnboarding === null) {
      return <div className="h-screen w-screen bg-bg-overlay rounded-lg" />;
    }

    // Onboarding gate
    if (showOnboarding) {
  ```

- [ ] **Step 5: Remove the `TrialBanner` render**

  Find:
  ```typescript
      <div className="flex flex-col h-screen w-screen bg-bg-overlay rounded-lg overflow-hidden select-none">
        <TrialBanner daysLeft={entitlement.daysLeft} />
        <HeaderBar
  ```
  Replace:
  ```typescript
      <div className="flex flex-col h-screen w-screen bg-bg-overlay rounded-lg overflow-hidden select-none">
        <HeaderBar
  ```

- [ ] **Step 6: Remove `accountEmail`/`onLogout` from the `Settings` render**

  Find:
  ```typescript
        <Settings
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          settings={settings}
          onUpdateSetting={updateSetting}
          compact={compact}
          isStealthFocus={isStealthFocus}
          onToggleStealthFocus={handleToggleStealthFocus}
          accountEmail={authStatus.email}
          onLogout={authLogoutFn}
          onReplayTutorial={() => setShowTour(true)}
        />
  ```
  Replace:
  ```typescript
        <Settings
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          settings={settings}
          onUpdateSetting={updateSetting}
          compact={compact}
          isStealthFocus={isStealthFocus}
          onToggleStealthFocus={handleToggleStealthFocus}
          onReplayTutorial={() => setShowTour(true)}
        />
  ```

- [ ] **Step 7: Typecheck**

  Run: `npm run typecheck`
  Expected: still FAILS in `Settings.tsx` (Task 6) and `types.ts`/`constants.ts` (Task 7) — `App.tsx` itself should be clean.

- [ ] **Step 8: Commit**

  ```bash
  git add src/renderer/App.tsx
  git commit -m "feat(open-source): boot straight to main UI — remove login/trial/tos/forced-update gates"
  ```

---

### Task 6: Remove the auth-only Account tab from `Settings`, preserving tutorial replay

**Files:**
- Modify: `src/renderer/components/Settings.tsx`

**Interfaces:**
- Produces: `SettingsProps` no longer has `accountEmail`/`onLogout` (already removed from the sole caller in Task 5). `onReplayTutorial` is preserved — it moves to a renamed `help` tab.

> These edits target only the account/auth-specific code — the `api-keys` tab, `ShieldCheck` privacy note, and all other tabs are untouched and independent of whether the companion Ollama plan has already added an `ollama` row to the `PROVIDERS` array.

- [ ] **Step 1: Drop the auth-only icon imports**

  Find:
  ```typescript
  import {
    X, Eye, EyeOff, Check, CircleAlert, LoaderCircle, Trash2,
    Key, Keyboard, Monitor, Shield, Mic, Brain, Smartphone, Cpu,
    UserCircle, LogOut, GraduationCap, ShieldCheck,
  } from 'lucide-react';
  ```
  Replace:
  ```typescript
  import {
    X, Eye, EyeOff, Check, CircleAlert, LoaderCircle, Trash2,
    Key, Keyboard, Monitor, Shield, Mic, Brain, Smartphone, Cpu,
    GraduationCap, ShieldCheck,
  } from 'lucide-react';
  ```
  > If the Ollama plan already ran and this import list also contains `Server` (added after `Trash2,`), keep `Server` in place — just drop `UserCircle, LogOut,` from wherever they appear in the list.

- [ ] **Step 2: Remove `accountEmail`/`onLogout` from `SettingsProps`**

  Find:
  ```typescript
  interface SettingsProps {
    isOpen: boolean;
    onClose: () => void;
    settings: AppSettings;
    onUpdateSetting: (key: string, value: unknown) => Promise<void>;
    compact?: boolean;
    isStealthFocus?: boolean;
    onToggleStealthFocus?: () => void;
    accountEmail?: string | null;
    onLogout?: () => Promise<void>;
    /** Re-launch the interactive walkthrough (InvisiQ Academy) in replay mode. */
    onReplayTutorial?: () => void;
  }
  ```
  Replace:
  ```typescript
  interface SettingsProps {
    isOpen: boolean;
    onClose: () => void;
    settings: AppSettings;
    onUpdateSetting: (key: string, value: unknown) => Promise<void>;
    compact?: boolean;
    isStealthFocus?: boolean;
    onToggleStealthFocus?: () => void;
    /** Re-launch the interactive walkthrough (InvisiQ Academy) in replay mode. */
    onReplayTutorial?: () => void;
  }
  ```

- [ ] **Step 3: Rename the `'account'` tab to `'help'`, drop the logout state/callback and props**

  Find:
  ```typescript
  type TabId = 'account' | 'api-keys' | 'hotkeys' | 'display' | 'privacy' | 'audio' | 'memory' | 'companion' | 'resilience';

  export default function Settings({ isOpen, onClose, settings, onUpdateSetting, compact = false, isStealthFocus = false, onToggleStealthFocus, accountEmail, onLogout, onReplayTutorial }: SettingsProps): JSX.Element | null {
    const [activeTab, setActiveTab] = useState<TabId>('api-keys');
    const [loggingOut, setLoggingOut] = useState(false);

    const handleLogout = useCallback(async () => {
      if (!onLogout) return;
      setLoggingOut(true);
      try {
        await onLogout();
        // On success, App's auth gate drops back to the login screen and this
        // panel unmounts — no need to close it explicitly.
      } finally {
        setLoggingOut(false);
      }
    }, [onLogout]);
  ```
  Replace:
  ```typescript
  type TabId = 'api-keys' | 'hotkeys' | 'display' | 'privacy' | 'audio' | 'memory' | 'companion' | 'resilience' | 'help';

  export default function Settings({ isOpen, onClose, settings, onUpdateSetting, compact = false, isStealthFocus = false, onToggleStealthFocus, onReplayTutorial }: SettingsProps): JSX.Element | null {
    const [activeTab, setActiveTab] = useState<TabId>('api-keys');
  ```
  > If the Ollama plan's `resilience` position in `TabId` differs (it doesn't touch this line), the anchor still matches — this edit doesn't depend on the Ollama plan's changes elsewhere in the file.

- [ ] **Step 4: Move the `Account` nav item to a trailing `Help` item**

  Find:
  ```typescript
    const NAV_ITEMS: { id: TabId; icon: JSX.Element; label: string }[] = [
      { id: 'account', icon: <UserCircle size={16} strokeWidth={1.75} />, label: 'Account' },
      { id: 'api-keys', icon: <Key size={16} strokeWidth={1.75} />, label: 'API Keys' },
      { id: 'hotkeys', icon: <Keyboard size={16} strokeWidth={1.75} />, label: 'Hotkeys' },
      { id: 'display', icon: <Monitor size={16} strokeWidth={1.75} />, label: 'Display' },
      { id: 'privacy', icon: <Shield size={16} strokeWidth={1.75} />, label: 'Privacy' },
      { id: 'audio', icon: <Mic size={16} strokeWidth={1.75} />, label: 'Audio' },
      { id: 'memory', icon: <Brain size={16} strokeWidth={1.75} />, label: 'Memory' },
      { id: 'companion', icon: <Smartphone size={16} strokeWidth={1.75} />, label: 'Companion' },
      { id: 'resilience', icon: <Cpu size={16} strokeWidth={1.75} />, label: 'Resilience' },
    ];
  ```
  Replace:
  ```typescript
    const NAV_ITEMS: { id: TabId; icon: JSX.Element; label: string }[] = [
      { id: 'api-keys', icon: <Key size={16} strokeWidth={1.75} />, label: 'API Keys' },
      { id: 'hotkeys', icon: <Keyboard size={16} strokeWidth={1.75} />, label: 'Hotkeys' },
      { id: 'display', icon: <Monitor size={16} strokeWidth={1.75} />, label: 'Display' },
      { id: 'privacy', icon: <Shield size={16} strokeWidth={1.75} />, label: 'Privacy' },
      { id: 'audio', icon: <Mic size={16} strokeWidth={1.75} />, label: 'Audio' },
      { id: 'memory', icon: <Brain size={16} strokeWidth={1.75} />, label: 'Memory' },
      { id: 'companion', icon: <Smartphone size={16} strokeWidth={1.75} />, label: 'Companion' },
      { id: 'resilience', icon: <Cpu size={16} strokeWidth={1.75} />, label: 'Resilience' },
      { id: 'help', icon: <GraduationCap size={16} strokeWidth={1.75} />, label: 'Help' },
    ];
  ```

- [ ] **Step 5: Replace the `account` tab body with a slimmer `help` tab body**

  Find:
  ```typescript
            {activeTab === 'account' && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-text-primary text-sm font-medium">Signed in as</label>
                  <div className="flex items-center gap-3 bg-bg-input border border-border-subtle rounded-md px-3 py-2.5">
                    <UserCircle size={20} className="text-text-secondary shrink-0" />
                    <span className="text-sm text-text-primary truncate">
                      {accountEmail || 'Google account'}
                    </span>
                  </div>
                  <p className="text-text-secondary text-[10px]">
                    You're signed in with Google. Signing out returns you to the login screen; your
                    API keys and conversations stay on this device.
                  </p>
                </div>

                {onReplayTutorial && (
                  <div className="space-y-2 border-t border-border-subtle pt-4">
                    <label className="text-text-primary text-sm font-medium">Learn InvisiQ</label>
                    <p className="text-text-secondary text-[10px]">
                      Replay the interactive walkthrough — every feature, step by step.
                    </p>
                    <button
                      onClick={() => {
                        onClose();
                        onReplayTutorial();
                      }}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20 transition-colors"
                    >
                      <GraduationCap size={15} /> Replay tutorial
                    </button>
                  </div>
                )}

                <button
                  onClick={handleLogout}
                  disabled={loggingOut || !onLogout}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md bg-status-error/10 text-status-error hover:bg-status-error/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loggingOut ? (
                    <>
                      <LoaderCircle size={14} className="animate-spin" /> Signing out...
                    </>
                  ) : (
                    <>
                      <LogOut size={14} /> Sign Out
                    </>
                  )}
                </button>
              </div>
            )}
            {activeTab === 'api-keys' && (
  ```
  Replace:
  ```typescript
            {activeTab === 'help' && (
              <div className="space-y-5">
                {onReplayTutorial ? (
                  <div className="space-y-2">
                    <label className="text-text-primary text-sm font-medium">Learn InvisiQ</label>
                    <p className="text-text-secondary text-[10px]">
                      Replay the interactive walkthrough — every feature, step by step.
                    </p>
                    <button
                      onClick={() => {
                        onClose();
                        onReplayTutorial();
                      }}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20 transition-colors"
                    >
                      <GraduationCap size={15} /> Replay tutorial
                    </button>
                  </div>
                ) : (
                  <p className="text-text-secondary text-[10px]">No help actions available.</p>
                )}
              </div>
            )}
            {activeTab === 'api-keys' && (
  ```

- [ ] **Step 6: Typecheck**

  Run: `npm run typecheck`
  Expected: still FAILS in `types.ts`/`constants.ts`/`crypto.ts`/`store.ts` (Tasks 7-8) — `Settings.tsx` itself should be clean.

- [ ] **Step 7: Manual test**

  Run the app. Open Settings — confirm there is no "Account" tab, no sign-out button, and a "Help" tab (last icon in the sidebar) shows the "Replay tutorial" button and it still works.

- [ ] **Step 8: Commit**

  ```bash
  git add src/renderer/components/Settings.tsx
  git commit -m "feat(open-source): remove auth Account tab from Settings, preserve tutorial replay under Help"
  ```

---

### Task 7: Remove Auth/Entitlement/VersionGate types and Supabase/T&C constants

**Files:**
- Modify: `src/shared/types.ts`, `src/shared/constants.ts`

**Interfaces:**
- Produces: `AppSettings` no longer has `tosAcceptedVersion`; `EncryptedPayload` no longer has `v`; `AuthStatus`/`EntitlementStatus`/`EntitlementStatusKind`/`VersionGateStatus` types no longer exist — Task 8 (`crypto.ts`/`store.ts`) depends on `EncryptedPayload` losing `v` since the encrypt/decrypt functions stop setting or reading it.

- [ ] **Step 1: Remove `tosAcceptedVersion` from `AppSettings`**

  In `src/shared/types.ts`, find:
  ```typescript
    isFirstLaunch: boolean;
    onboardingComplete: boolean;
    // T&C version the user has accepted (beta prompt-logging disclosure, §8). When
    // this !== CURRENT_TOS_VERSION the app shows the T&C gate before use.
    tosAcceptedVersion: string;
    version: string;
  }
  ```
  Replace:
  ```typescript
    isFirstLaunch: boolean;
    onboardingComplete: boolean;
    version: string;
  }
  ```

- [ ] **Step 2: Remove the `v` field from `EncryptedPayload`**

  In `src/shared/types.ts`, find:
  ```typescript
  export interface EncryptedPayload {
    iv: string;
    data: string;
    tag: string;
    // Payload scheme version. Absent/1 = machine-only key (legacy API keys + auth
    // secrets). 2 = entitlement-bound key (machineId + server fragment). See crypto.ts.
    v?: number;
  }
  ```
  Replace:
  ```typescript
  export interface EncryptedPayload {
    iv: string;
    data: string;
    tag: string;
  }
  ```

- [ ] **Step 3: Remove the `AuthStatus`/`EntitlementStatus`/`VersionGateStatus` sections**

  In `src/shared/types.ts`, find:
  ```typescript
  // ══════════════════════════════════════
  //  AUTH (Beta — Google OAuth via Supabase)
  // ══════════════════════════════════════

  export interface AuthStatus {
    signedIn: boolean;
    email: string | null;
    userId: string | null;
  }

  // ══════════════════════════════════════
  //  ENTITLEMENT (Beta — 14-day trial gate)
  // ══════════════════════════════════════

  export type EntitlementStatusKind =
    | 'active' // trial live → API keys decryptable
    | 'expired' // trial ended → locked
    | 'offline' // couldn't verify at launch (fail-closed) → locked
    | 'unknown'; // not signed in / not yet checked

  export interface EntitlementStatus {
    status: EntitlementStatusKind;
    daysLeft: number;
    expiresAt: string | null;
  }

  // ══════════════════════════════════════
  //  VERSION GATE (Beta — remote kill-switch / forced update §10.4)
  // ══════════════════════════════════════

  export interface VersionGateStatus {
    required: boolean; // running build must update before it can be used
    reason: 'killed' | 'below-floor' | null;
    message: string | null;
    minVersion: string | null;
    latestVersion: string | null;
    currentVersion: string;
  }

  // ══════════════════════════════════════
  //  APPLICATION SETTINGS
  // ══════════════════════════════════════
  ```
  Replace:
  ```typescript
  // ══════════════════════════════════════
  //  APPLICATION SETTINGS
  // ══════════════════════════════════════
  ```

- [ ] **Step 4: Remove the Supabase backend + T&C-version constants**

  In `src/shared/constants.ts`, find:
  ```typescript
  // ══════════════════════════════════════
  //  SUPABASE BACKEND (Beta — auth / trial / analytics)
  // ══════════════════════════════════════
  // Project: hlpxesuuqypxnubswbzh. The anon key is client-safe (RLS-protected;
  // Beta Launch Plan §5.1/§14) — service-role key & signing secrets NEVER ship.
  export const SUPABASE_URL = 'https://hlpxesuuqypxnubswbzh.supabase.co';
  export const SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhscHhlc3V1cXlweG51YnN3YnpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NjIxOTEsImV4cCI6MjA5NjIzODE5MX0.aJwlUR3mTODc9j26idwW2amHwmSyMaecPAcZqHO5eZY';

  // T&C version in force. Bump this (and the policy text) whenever the terms that
  // disclose prompt logging change — the gate re-prompts and each prompt row is
  // stamped with the accepted version (Beta Launch Plan §8). Beta prompt data is
  // purged server-side after 30 days.
  export const CURRENT_TOS_VERSION = '2026-06-08';

  // ══════════════════════════════════════
  //  AUTO-UPDATE FEED
  // ══════════════════════════════════════
  ```
  Replace:
  ```typescript
  // ══════════════════════════════════════
  //  AUTO-UPDATE FEED
  // ══════════════════════════════════════
  ```

- [ ] **Step 5: Remove `tosAcceptedVersion` from `DEFAULT_SETTINGS`**

  In `src/shared/constants.ts`, find:
  ```typescript
    isFirstLaunch: true,
    onboardingComplete: false,
    tosAcceptedVersion: '',
    version: '2.0.0',
  };
  ```
  Replace:
  ```typescript
    isFirstLaunch: true,
    onboardingComplete: false,
    version: '2.0.0',
  };
  ```

- [ ] **Step 6: Typecheck**

  Run: `npm run typecheck`
  Expected: still FAILS in `crypto.ts`/`store.ts` (Task 8, which references the removed `v`-based migration helpers) — `types.ts`/`constants.ts` themselves should be clean.

- [ ] **Step 7: Commit**

  ```bash
  git add src/shared/types.ts src/shared/constants.ts
  git commit -m "feat(open-source): remove Auth/Entitlement/VersionGate types and Supabase/TOS constants"
  ```

---

### Task 8: Collapse `crypto.ts` to a single machine-only key; simplify `store.ts` accordingly

**Files:**
- Modify: `src/main/crypto.ts` (full-file rewrite), `src/main/store.ts`

**Interfaces:**
- Produces: `encryptApiKey`/`decryptApiKey` always use the machine-only key. `getDeviceId`, `setServerFragment`, `hasServerFragment`, `isLegacyApiKeyPayload` no longer exist (they had no consumers left after Task 1 deleted `entitlement.ts`, confirmed by a repo-wide grep during planning). `store.ts` no longer has `auth`-session storage or the entitlement gate in `getApiKey`.

**This is the task that actually removes trial enforcement** — before this task, an API key would silently fail to decrypt with no `hasServerFragment()` (i.e. no live trial); after it, decryption depends only on the local machine key, so a saved key always works.

- [ ] **Step 1: Replace `src/main/crypto.ts` in full**

  ```typescript
  import crypto from 'crypto';
  import { machineIdSync } from 'node-machine-id';
  import { app } from 'electron';
  import fs from 'fs';
  import path from 'path';
  import type { EncryptedPayload } from '@shared/types';

  const APP_SALT = 'ghostai-v1-api-key-encryption-salt';
  const PBKDF2_ITERATIONS = 100_000;
  const KEY_LENGTH = 32; // 256 bits
  const IV_LENGTH = 12; // 96 bits for GCM
  const AUTH_TAG_LENGTH = 16; // 128 bits

  let cachedMachineId: string | null = null;
  let machineKey: Buffer | null = null;

  function getFallbackMachineId(): string {
    const fallbackPath = path.join(app.getPath('userData'), '.machine-id');
    try {
      return fs.readFileSync(fallbackPath, 'utf-8').trim();
    } catch {
      const id = crypto.randomUUID();
      fs.mkdirSync(path.dirname(fallbackPath), { recursive: true });
      fs.writeFileSync(fallbackPath, id, 'utf-8');
      return id;
    }
  }

  function getMachineId(): string {
    if (cachedMachineId) return cachedMachineId;
    try {
      cachedMachineId = machineIdSync(true);
    } catch {
      cachedMachineId = getFallbackMachineId();
    }
    return cachedMachineId;
  }

  // ── Key derivation ──────────────────────────────────────────
  // IMPORTANT: APP_SALT is fixed (changing it bricks every saved key — CLAUDE.md).

  function getMachineKey(): Buffer {
    if (machineKey) return machineKey;
    const id = getMachineId();
    machineKey = crypto.pbkdf2Sync(
      id,
      Buffer.from(id + APP_SALT, 'utf-8'),
      PBKDF2_ITERATIONS,
      KEY_LENGTH,
      'sha512'
    );
    return machineKey;
  }

  // ── AES-256-GCM core ────────────────────────────────────────

  function aesEncrypt(key: Buffer, plaintext: string): { iv: string; data: string; tag: string } {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv, { authTagLength: AUTH_TAG_LENGTH });
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf-8'), cipher.final()]);
    return {
      iv: iv.toString('base64'),
      data: encrypted.toString('base64'),
      tag: cipher.getAuthTag().toString('base64'),
    };
  }

  function aesDecrypt(key: Buffer, payload: EncryptedPayload): string {
    const iv = Buffer.from(payload.iv, 'base64');
    const data = Buffer.from(payload.data, 'base64');
    const tag = Buffer.from(payload.tag, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv, { authTagLength: AUTH_TAG_LENGTH });
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf-8');
  }

  // ── API keys (machine-only key) ─────────────────────────────

  export function encryptApiKey(plaintext: string): EncryptedPayload {
    return aesEncrypt(getMachineKey(), plaintext);
  }

  /**
   * Decrypt an API key. A payload saved under the old entitlement-bound scheme
   * (pre open-source release) cannot be decrypted here — that scheme no longer
   * exists. The caller (store.ts's getApiKey) treats a decrypt failure as
   * "no key", clearing the entry and prompting re-entry rather than crashing.
   */
  export function decryptApiKey(payload: EncryptedPayload): string {
    return aesDecrypt(getMachineKey(), payload);
  }

  // ── Generic machine-key secrets ─────────────────────────────

  export function encryptSecret(plaintext: string): EncryptedPayload {
    return aesEncrypt(getMachineKey(), plaintext);
  }

  export function decryptSecret(payload: EncryptedPayload): string {
    return aesDecrypt(getMachineKey(), payload);
  }
  ```

- [ ] **Step 2: Drop the stale `crypto.ts` import in `store.ts`**

  In `src/main/store.ts`, find:
  ```typescript
  import { encryptApiKey, decryptApiKey, hasServerFragment, isLegacyApiKeyPayload } from './crypto';
  ```
  Replace:
  ```typescript
  import { encryptApiKey, decryptApiKey } from './crypto';
  ```

- [ ] **Step 3: Remove the `auth` field and `StoredAuthSession` interface from `StoreSchema`**

  In `src/main/store.ts`, find:
  ```typescript
  interface StoredAuthSession {
    refreshToken: EncryptedPayload; // encrypted with the machine-only key
    userId: string;
    email: string | null;
  }

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
  Replace:
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
  }
  ```
  > If the companion Ollama plan already ran, this block additionally has `ollama?: EncryptedPayload;` inside `keys` — keep that line; only remove `auth?: StoredAuthSession;` and the `StoredAuthSession` interface above it.

- [ ] **Step 4: Simplify `getApiKey` — remove the entitlement gate and the v1→v2 migration**

  In `src/main/store.ts`, find:
  ```typescript
  export function getApiKey(provider: ProviderID): string | null {
    if (!VALID_PROVIDERS.includes(provider)) {
      throw new Error(`Invalid provider: ${provider}`);
    }

    // Entitlement gate (Beta Launch Plan §6.1): with no server fragment held
    // (trial expired or unverified), API keys cannot be decrypted — so no key is
    // returned and no provider can initialize. This is the core trial enforcement.
    if (!hasServerFragment()) {
      return null;
    }

    const encrypted = store.get(`keys.${provider}`) as EncryptedPayload | undefined;
    if (!encrypted || !encrypted.iv || !encrypted.data || !encrypted.tag) {
      return null;
    }

    try {
      const plain = decryptApiKey(encrypted);
      // Migrate legacy (machine-key, v1) payloads to the entitled (v2) scheme on
      // first read while active. Guarded so a re-encrypt failure never bricks the
      // key — we've already decrypted it successfully.
      if (isLegacyApiKeyPayload(encrypted)) {
        try {
          store.set(`keys.${provider}`, encryptApiKey(plain));
        } catch (migErr) {
          console.error(`Key migration failed for ${provider} (kept legacy):`, migErr);
        }
      }
      return plain;
    } catch (error) {
      console.error(`Failed to decrypt ${provider} API key:`, error);
      // Clear corrupted entry so the user is prompted to re-enter rather than
      // hitting a permanent silent failure.
      store.delete(`keys.${provider}` as keyof StoreSchema);
      store.set(`settings.providers.${provider}.hasKey`, false);
      store.set(`settings.providers.${provider}.isValid`, false);
      return null;
    }
  }
  ```
  Replace:
  ```typescript
  export function getApiKey(provider: ProviderID): string | null {
    if (!VALID_PROVIDERS.includes(provider)) {
      throw new Error(`Invalid provider: ${provider}`);
    }

    const encrypted = store.get(`keys.${provider}`) as EncryptedPayload | undefined;
    if (!encrypted || !encrypted.iv || !encrypted.data || !encrypted.tag) {
      return null;
    }

    try {
      return decryptApiKey(encrypted);
    } catch (error) {
      console.error(`Failed to decrypt ${provider} API key:`, error);
      // Clear corrupted/undecryptable entry (e.g. a key saved under the old,
      // now-removed entitlement-bound scheme) so the user is prompted to
      // re-enter rather than hitting a permanent silent failure.
      store.delete(`keys.${provider}` as keyof StoreSchema);
      store.set(`settings.providers.${provider}.hasKey`, false);
      store.set(`settings.providers.${provider}.isValid`, false);
      return null;
    }
  }
  ```

- [ ] **Step 5: Remove the auth-session accessor functions**

  In `src/main/store.ts`, find:
  ```typescript
  // ══════════════════════════════════════
  //  AUTH SESSION (refresh token encrypted)
  // ══════════════════════════════════════

  export function getAuthSession(): StoredAuthSession | null {
    return (store.get('auth') as StoredAuthSession | undefined) ?? null;
  }

  export function setAuthSession(session: StoredAuthSession): void {
    store.set('auth', session);
  }

  export function clearAuthSession(): void {
    store.delete('auth' as keyof StoreSchema);
  }

  // ══════════════════════════════════════
  //  CLEAR ALL
  // ══════════════════════════════════════
  ```
  Replace:
  ```typescript
  // ══════════════════════════════════════
  //  CLEAR ALL
  // ══════════════════════════════════════
  ```

- [ ] **Step 6: Typecheck**

  Run: `npm run typecheck`
  Expected: PASS. This is the last task with functional code changes — a clean pass here means the full de-gate is typecheck-complete.

- [ ] **Step 7: Manual test — full boot + key re-entry behavior**

  Delete or rename the existing `RuntimeBroker` userData config (or test on a fresh machine/VM) is NOT required — instead, on your existing dev install:
  - Launch the app with no network reachable (disable Wi-Fi/Ethernet). Confirm it boots straight to the main UI (or onboarding, on a fresh profile) with no login/lock/T&C screen at any point.
  - If you have a pre-existing saved API key from before this change, open Settings → API Keys and confirm it now either still works (if it was a legacy v1 payload) or shows as empty/invalid (if it was v2) — in the latter case, re-enter and save the key, confirm it validates and persists across an app restart.
  - Confirm cloud chat (e.g. OpenAI) still works end-to-end after key re-entry.

- [ ] **Step 8: Commit**

  ```bash
  git add src/main/crypto.ts src/main/store.ts
  git commit -m "feat(open-source): collapse crypto to a single machine-only key, remove trial enforcement"
  ```

---

### Task 9: Documentation pass — CLAUDE.md Beta Launch removal + README

**Files:**
- Modify: `CLAUDE.md`
- Modify: `docs/InvisiQ-Beta-Launch-Plan.md`
- Modify: `README.md` (or the project's root user-facing readme, whichever exists)

**Interfaces:** None — documentation only.

- [ ] **Step 1: Remove the "Beta Launch — Auth, Trial, Analytics & Kill-Switch" section from `CLAUDE.md`**

  Find the entire section starting at the heading:
  ```
  ## Beta Launch — Auth, Trial, Analytics & Kill-Switch
  ```
  through to (but not including) the next `---` horizontal rule that precedes `## Development Phases`. Replace it with a short superseding note in the same style as the existing de-impersonation section:
  ```markdown
  ## Beta Launch Gating — Removed for Open Source

  The shipping beta (through v1.3.0) was gated: Google sign-in, a server-clocked
  14-day trial (fail-closed), full prompt-capture analytics, a T&C gate, and a
  remote kill-switch/version-floor, all backed by a Supabase project. This entire
  stack was **removed** for the open-source release (2026-07-25): `auth.ts`,
  `entitlement.ts`, `analytics.ts`, and their IPC/preload surface are deleted;
  `App.tsx` boots straight to onboarding/main UI; `crypto.ts` collapsed from a
  dual-key scheme (machine key + entitlement-bound key gating decryption on a
  live trial) to a single machine-only key. `electron-updater` still checks
  GitHub Releases normally — only the blocking kill-switch/version-floor check
  was removed. `docs/InvisiQ-Beta-Launch-Plan.md` is now a historical design
  spec (see its status banner). Existing users' API keys saved under the old
  entitlement-bound scheme needed a one-time re-entry after this change.
  ```

- [ ] **Step 2: Add a superseded-status banner to `docs/InvisiQ-Beta-Launch-Plan.md`**

  At the very top of the file (before its first heading), insert:
  ```markdown
  > **⚠ HISTORICAL — SUPERSEDED (2026-07-25):** This document describes the
  > gated-beta design (Google auth, server-clocked trial, analytics, T&C gate,
  > kill-switch). That entire stack was removed for the open-source release —
  > see CLAUDE.md's "Beta Launch Gating — Removed for Open Source" section for
  > current behavior. Kept for historical reference only.

  ```

- [ ] **Step 3: Update the root README (or add one) for open-source framing**

  If `README.md` exists at the repo root, find any section describing sign-in/trial requirements and replace it with open-source framing: no sign-in required, BYOK cloud keys are optional (add whichever cloud provider keys you want in Settings → API Keys), or run fully free/offline with a local Ollama server (install Ollama, `ollama pull <model>`, point InvisiQ at it in Settings). If no root `README.md` exists, skip this step — do not create a new marketing document as part of this plan.

- [ ] **Step 4: Commit**

  ```bash
  git add CLAUDE.md docs/InvisiQ-Beta-Launch-Plan.md README.md
  git commit -m "docs: remove Beta Launch gating docs, add open-source framing"
  ```
