import { useState, useCallback, useEffect, useRef } from 'react';
import { MotionConfig, AnimatePresence, useReducedMotion } from 'framer-motion';
import HeaderBar from './components/HeaderBar';
import ChatPanel from './components/ChatPanel';
import InputArea from './components/InputArea';
import TranscriptPanel from './components/TranscriptPanel';
import StatusBar from './components/StatusBar';
import Settings from './components/Settings';
import ConversationHistory from './components/ConversationHistory';
import OnboardingFlow from './components/OnboardingFlow';
import LoginScreen from './components/LoginScreen';
import LockScreen from './components/LockScreen';
import TrialBanner from './components/TrialBanner';
import TosGate from './components/TosGate';
import ForcedUpdate from './components/ForcedUpdate';
import UpdateNotification from './components/UpdateNotification';
import InlineRegionSelector from './components/InlineRegionSelector';
import MeetingPanel from './components/MeetingPanel';
import MemoryPanel from './components/MemoryPanel';
import CodeDetectionCard from './components/CodeDetectionCard';
import { ToastProvider, useToast } from './components/Toast';
import { useConversation } from './hooks/useConversation';
import { useConversationHistory } from './hooks/useConversationHistory';
import { useAI } from './hooks/useAI';
import { useScreenshot } from './hooks/useScreenshot';
import { useSettings } from './hooks/useSettings';
import { useAuth } from './hooks/useAuth';
import { useEntitlement } from './hooks/useEntitlement';
import { useUpdateGate } from './hooks/useUpdateGate';
import { useHotkeys } from './hooks/useHotkeys';
import { useAudioTranscription } from './hooks/useAudioTranscription';
import { useLiveTranscription } from './hooks/useLiveTranscription';
import { useMeetingAssistant } from './hooks/useMeetingAssistant';
import { useCodeDetection, buildScreenContextPrefix } from './hooks/useCodeDetection';
import { useMemory } from './hooks/useMemory';
import { useTokenCost } from './hooks/useTokenCost';
import { useInternalKeyboard } from './hooks/useInternalKeyboard';
import { useWindowSize } from './hooks/useWindowSize';
import { UNIVERSAL_MODE, CURRENT_TOS_VERSION, PROVIDER_IDS } from '@shared/constants';
import type { ProviderID } from '@shared/types';

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
function ClipboardListener({ onAnalyze }: { onAnalyze: (text: string) => void }): null {
  const { showToast } = useToast();
  const analyzeRef = useRef(onAnalyze);
  analyzeRef.current = onAnalyze;

  useEffect(() => {
    window.ghostAPI.clipboard.startMonitor();
    const cleanup = window.ghostAPI.on('clipboard:changed', (data: unknown) => {
      const { text } = data as { text: string; timestamp: number };
      if (text && text.length > 10) {
        const preview = text.length > 50 ? `${text.substring(0, 50)}...` : text;
        showToast('info', `Clipboard: "${preview}"`, {
          label: 'Analyze with AI',
          onClick: () => analyzeRef.current(text),
        });
      }
    });
    return () => {
      window.ghostAPI.clipboard.stopMonitor();
      cleanup();
    };
  }, [showToast]);

  return null;
}

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
  const [showTour, setShowTour] = useState(false); // replay of the academy from Settings

  // Determine whether to show onboarding after settings load
  useEffect(() => {
    if (!settingsLoading) {
      setShowOnboarding(!settings.onboardingComplete);
    }
  }, [settingsLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Apply theme class on documentElement
  useEffect(() => {
    document.documentElement.classList.toggle('light-theme', settings.display.theme === 'light');
  }, [settings.display.theme]);

  const { isStreaming, error, lastUsage, sendMessage, stopGeneration } = useAI();
  const {
    messages,
    conversationId,
    conversationTitle,
    addUserMessage,
    addAssistantMessage,
    addErrorMessage,
    updateMessage,
    appendToMessage,
    startNewConversation,
    loadConversation,
    getContextMessages,
  } = useConversation({
    persistChatHistory: settings.privacy.persistChatHistory,
    activeMode: settings.activeMode,
    activeModel: settings.activeModel,
    isStreaming,
  });
  const {
    conversations,
    isLoading: historyLoading,
    searchQuery,
    setSearchQuery,
    refresh: refreshHistory,
    deleteConversation: deleteHistoryConversation,
    exportConversation: exportHistoryConversation,
    deleteAllConversations,
  } = useConversationHistory();
  const {
    pendingScreenshots,
    snipScreenshot,
    captureFull,
    captureSilentNow,
    captureRegion,
    confirmRegion,
    cancelSnip,
    clearScreenshot,
    clearAllScreenshots,
  } = useScreenshot();
  const [isStealthFocus, setIsStealthFocus] = useState(false);
  const { registerCallback } = useHotkeys();
  const { lastRequest: costLastRequest, conversation: costConversation, session: costSession, recordUsage, resetConversation: resetCostConversation } = useTokenCost();

  // Audio transcription (lifted from InputArea for TranscriptPanel + meeting auto-context)
  const {
    isListening,
    transcript,
    interimTranscript,
    isAvailable: micAvailable,
    error: micError,
    startListening,
    stopListening,
    clearTranscript,
  } = useAudioTranscription();

  const handleToggleMic = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening(settings.audio?.engine || 'browser', settings.audio?.language || 'en-US');
    }
  }, [isListening, startListening, stopListening, settings.audio?.engine, settings.audio?.language]);

  // Stealth focus toggle (anti-detection for monitored apps)
  const handleToggleStealthFocus = useCallback(async () => {
    const newState = !isStealthFocus;
    try {
      await window.ghostAPI.overlay.setStealthFocus(newState);
      setIsStealthFocus(newState);
    } catch (err) {
      console.error('[StealthFocus] toggle failed:', err);
    }
  }, [isStealthFocus]);

  // Model B: stealth focus is default-ON in main. Sync the UI toggle to the
  // actual main-process state on mount so the HeaderBar reflects reality.
  useEffect(() => {
    let cancelled = false;
    window.ghostAPI.overlay.getStealthFocusStatus().then((s) => {
      if (!cancelled) setIsStealthFocus(s.enabled);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Session restore: on launch, reopen the most recent conversation so chats
  // survive an app/PC restart (instead of always booting to a blank chat).
  // Runs once, after settings + history have loaded; only when persistence is on
  // and there's no active chat to clobber.
  const didRestoreRef = useRef(false);
  useEffect(() => {
    if (didRestoreRef.current) return;
    if (settingsLoading || historyLoading) return; // wait for both to settle
    didRestoreRef.current = true;
    if (!settings.privacy.persistChatHistory) return;
    if (conversations.length === 0) return;
    if (messages.length > 0 || conversationId) return; // don't overwrite an active chat
    loadConversation(conversations[0].id)
      .then((res) => {
        if (res?.model) updateSetting('activeModel', res.model);
      })
      .catch(() => {});
  }, [
    settingsLoading,
    historyLoading,
    conversations,
    settings.privacy.persistChatHistory,
    messages.length,
    conversationId,
    loadConversation,
    updateSetting,
  ]);

  // Phase 4: system audio / live transcription
  const {
    isActive: isSystemAudioActive,
    liveTranscript,
    captureMethod,
    start: startSystemAudio,
    stop: stopSystemAudio,
    clear: clearLiveTranscript,
  } = useLiveTranscription();

  // Phase 4: meeting assistant — question detection
  const { detectedQuestions, dismissQuestion } = useMeetingAssistant({
    liveTranscript,
    silenceThresholdMs: settings.meeting?.silenceThresholdMs ?? 3000,
    autoSuggestEnabled: settings.meeting?.autoSuggestEnabled ?? false,
  });

  // Phase 4: code detection
  const { lastDetection: codeDetection, dismiss: dismissCodeDetection, latestOcrText } = useCodeDetection({
    // Scan when code-detection OR rolling-OCR screen-awareness is on.
    enabled: (settings.privacy?.codeDetectionEnabled ?? false) || (settings.privacy?.screenAwarenessRollingOcr ?? false),
    intervalMs: settings.privacy?.codeDetectionIntervalMs ?? 30000,
    retainOcrText: settings.privacy?.screenAwarenessRollingOcr ?? false,
  });

  const [meetingPanelOpen, setMeetingPanelOpen] = useState(false);

  // Auto-open meeting panel when system audio capture is enabled
  useEffect(() => {
    if (settings.meeting?.enableSystemAudio) {
      setMeetingPanelOpen(true);
    }
  }, [settings.meeting?.enableSystemAudio]);

  const handleUseQuestion = useCallback(
    (questionText: string) => {
      setInjectedInputText(questionText);
    },
    []
  );

  // Responsive layout
  const { mode: layoutMode } = useWindowSize();
  const compact = layoutMode === 'compact';

  // Internal keyboard shortcuts
  useInternalKeyboard({
    toggleSettings: () => setSettingsOpen((prev) => !prev),
    clearConversation: () => {
      startNewConversation();
      resetCostConversation();
    },
    focusSearch: () => {
      refreshHistory();
      setHistoryOpen(true);
    },
  });

  // Phase 4: memory (RAG)
  const { buildContextPrefix, autoExtractFromMessage } = useMemory(settings.memory?.enabled ?? false);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [memoryPanelOpen, setMemoryPanelOpen] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [availableProviders, setAvailableProviders] = useState<Set<ProviderID>>(new Set());
  const [injectedInputText, setInjectedInputText] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Keep the latest stealth-focus preference available to the Settings effect
  // below without making it a dependency (so the effect only fires on open/close).
  const stealthFocusRef = useRef(isStealthFocus);
  useEffect(() => {
    stealthFocusRef.current = isStealthFocus;
  }, [isStealthFocus]);

  // Settings contains plain inputs (API key, hotkey capture, memory facts) that
  // need real keyboard focus. With default-on stealth focus the overlay is
  // WS_EX_NOACTIVATE, so clicks/typing/paste never reach those inputs (same
  // problem OnboardingFlow solves). While Settings is open we temporarily relax
  // stealth focus and bring the window forward; content protection stays ON the
  // whole time, so the panel is still invisible to screen capture. On close we
  // restore the user's persistent stealth-focus preference.
  useEffect(() => {
    const api = window.ghostAPI;
    if (!api?.overlay) return;
    if (settingsOpen) {
      api.overlay
        .setStealthFocus(false)
        .then(() => api.overlay.requestFocus())
        .catch(() => {});
    } else if (stealthFocusRef.current) {
      api.overlay.setStealthFocus(true).catch(() => {});
    }
  }, [settingsOpen]);

  // Apply font size from settings on mount/change
  useEffect(() => {
    if (settings.display.fontSize && settings.display.fontSize !== 13) {
      document.documentElement.style.fontSize = `${settings.display.fontSize}px`;
    }
  }, [settings.display.fontSize]);

  // Check which providers have API keys
  useEffect(() => {
    async function checkProviders(): Promise<void> {
      const providers: ProviderID[] = PROVIDER_IDS;
      const available = new Set<ProviderID>();
      for (const p of providers) {
        const { key } = await window.ghostAPI.store.getApiKey(p);
        if (key) available.add(p);
      }
      setAvailableProviders(available);
    }
    checkProviders();
  }, [settingsOpen]); // Re-check when settings close

  // Register hotkey callbacks
  useEffect(() => {
    registerCallback('capture-screen', captureFull);
    registerCallback('capture-region', captureRegion);
    registerCallback('focus-input', () => inputRef.current?.focus());
    registerCallback('copy-response', () => {
      const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
      if (lastAssistant) {
        window.ghostAPI.clipboard.copy(lastAssistant.content);
      }
    });
    registerCallback('new-conversation', handleNewConversation);
    registerCallback('paste-response', () => {
      const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
      if (lastAssistant && lastAssistant.content) {
        window.ghostAPI.clipboard.smartPaste(lastAssistant.content);
      }
    });
  }, [registerCallback, captureFull, captureRegion, messages]);

  // ── New Conversation ─────────────────────────────────────

  const handleNewConversation = useCallback(() => {
    startNewConversation();
    resetCostConversation();
    refreshHistory();
    inputRef.current?.focus();
  }, [startNewConversation, resetCostConversation, refreshHistory]);

  // ── Select conversation from history ─────────────────────

  const handleSelectConversation = useCallback(
    async (id: string) => {
      if (id === conversationId) {
        setHistoryOpen(false);
        return;
      }
      // Flush current conversation before switching
      if (conversationId && messages.length > 0 && settings.privacy.persistChatHistory) {
        await window.ghostAPI.conversation.save({
          id: conversationId,
          title: conversationTitle || 'Untitled',
          messages,
          mode: settings.activeMode,
          model: settings.activeModel,
          createdAt: '',
          updatedAt: new Date().toISOString(),
          totalTokens: messages.reduce((sum, m) => sum + (m.usage?.totalTokens || 0), 0),
          estimatedCost: messages.reduce((sum, m) => sum + (m.usage?.estimatedCostUSD || 0), 0),
        });
      }
      const result = await loadConversation(id);
      if (result) {
        if (result.mode) await updateSetting('activeMode', result.mode);
        if (result.model) await updateSetting('activeModel', result.model);
      }
      resetCostConversation();
      setHistoryOpen(false);
    },
    [conversationId, conversationTitle, messages, settings.privacy.persistChatHistory, settings.activeMode, settings.activeModel, loadConversation, updateSetting, resetCostConversation]
  );

  // ── Open/close history ───────────────────────────────────

  const handleOpenHistory = useCallback(() => {
    refreshHistory();
    setHistoryOpen(true);
  }, [refreshHistory]);

  // ── Send message ─────────────────────────────────────────

  const handleSend = useCallback(
    async (text: string) => {
      // Build images array from pending screenshots (clone to prevent mutation by clearAll)
      let images = pendingScreenshots.length > 0
        ? pendingScreenshots.map((img) => ({ ...img }))
        : undefined;

      // Ambient Screen Awareness: if the user attached NO manual screenshot and the
      // feature is on, silently auto-capture the current screen so the AI "sees" what's
      // on screen — no screenshot button needed. Capture hides the overlay (stealth-safe).
      if (!images && settings.privacy?.screenAwarenessEnabled) {
        const auto = await captureSilentNow();
        if (auto) images = [auto];
      }

      // Auto-context: when transcription is active and the user opted in, prepend
      // the live transcript for the AI but show the original text in chat. Gated on
      // the audio setting (not a mode) since InvisiQ has a single universal mode.
      let aiText = text;
      if (settings.audio?.autoIncludeTranscript && transcript.trim()) {
        aiText = `[Current meeting transcript:\n${transcript.trim()}]\n\n${text}`;
      }

      // Phase 4: memory context injection
      if (settings.memory?.enabled) {
        const memPrefix = await buildContextPrefix(text, settings.memory.maxContextFacts ?? 5);
        if (memPrefix) {
          aiText = memPrefix + aiText;
        }
      }

      // Screen Awareness (rolling OCR): prepend a lightweight text snapshot of the
      // screen so even text-only queries are screen-aware. Text-only — never sent to
      // analytics (capturePrompt below uses the original `text`, not `aiText`).
      if (settings.privacy?.screenAwarenessRollingOcr) {
        const screenPrefix = buildScreenContextPrefix(latestOcrText);
        if (screenPrefix) {
          aiText = screenPrefix + aiText;
        }
      }

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
      if (settings.memory?.enabled && settings.memory?.autoExtract) {
        autoExtractFromMessage(text).catch(() => {});
      }

      // Add empty assistant message to fill with streaming content
      const assistantMsg = addAssistantMessage();
      setStreamingMessageId(assistantMsg.id);

      // InvisiQ has a single universal, intent-adaptive system prompt.
      await sendMessage([...getContextMessages(), { id: '', role: 'user', content: aiText, images, timestamp: '' }], {
        model: settings.activeModel,
        systemPrompt: UNIVERSAL_MODE.systemPrompt,
        images,
        onToken: (token) => {
          appendToMessage(assistantMsg.id, token);
        },
        onDone: (usage, latency, finalContent) => {
          updateMessage(assistantMsg.id, {
            usage,
            latencyMs: latency,
            model: settings.activeModel,
            // Replace the streamed content (which included live <think> reasoning)
            // with the answer-only text, so stored history stays clean and small.
            ...(finalContent ? { content: finalContent } : {}),
          });
          recordUsage(usage);
          setStreamingMessageId(null);
          // In stealth focus mode, release focus back to the test window after AI responds
          if (isStealthFocus) {
            window.ghostAPI.overlay.releaseFocus().catch(() => {});
          }
        },
        onError: (errMsg) => {
          if (!assistantMsg.content) {
            // If no content was generated, remove the empty assistant message and add error
            updateMessage(assistantMsg.id, { role: 'error', content: errMsg });
          } else {
            addErrorMessage(errMsg);
          }
          setStreamingMessageId(null);
        },
      });
    },
    [
      pendingScreenshots,
      addUserMessage,
      clearAllScreenshots,
      addAssistantMessage,
      getContextMessages,
      settings.activeMode,
      settings.activeModel,
      settings.audio?.autoIncludeTranscript,
      settings.privacy?.screenAwarenessEnabled,
      settings.privacy?.screenAwarenessRollingOcr,
      captureSilentNow,
      latestOcrText,
      settings.memory?.enabled,
      settings.memory?.autoExtract,
      settings.memory?.maxContextFacts,
      transcript,
      buildContextPrefix,
      autoExtractFromMessage,
      sendMessage,
      appendToMessage,
      updateMessage,
      addErrorMessage,
      recordUsage,
      isStealthFocus,
    ]
  );

  // ── Stealth mode: clipboard-based input (zero focus) ────────
  useEffect(() => {
    if (!isStealthFocus) return;

    const unsubscribe = window.ghostAPI.on('overlay:clipboard-input-requested', async () => {
      try {
        const { text } = await window.ghostAPI.clipboard.read();
        if (text && text.trim()) {
          handleSend(text.trim());
        }
      } catch (err) {
        console.error('[StealthInput] clipboard read failed:', err);
      }
    });

    return unsubscribe;
  }, [isStealthFocus, handleSend]);

  const handleOpacityChange = useCallback(
    async (opacity: number) => {
      await window.ghostAPI.overlay.setOpacity(opacity);
      await updateSetting('display.opacity', opacity);
    },
    [updateSetting]
  );

  // ── Delete conversation from history ────────────────────
  const handleDeleteHistoryConversation = useCallback(
    async (id: string) => {
      await deleteHistoryConversation(id);
      if (id === conversationId) {
        startNewConversation();
      }
    },
    [deleteHistoryConversation, conversationId, startNewConversation]
  );

  const handleClose = useCallback(() => {
    // X button fully quits the app (Escape still hides). Works in stealth mode —
    // app.quit() is OS-level and unaffected by content protection / non-focusable window.
    window.ghostAPI.app.quit();
  }, []);

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
    return <OnboardingFlow onComplete={() => setShowOnboarding(false)} />;
  }

  // Replay of the interactive walkthrough (launched from Settings → Account).
  // Replay mode does not touch onboarding/setup state.
  if (showTour) {
    return <OnboardingFlow mode="replay" onComplete={() => setShowTour(false)} />;
  }

  return (
    <ToastProvider>
    <ClipboardListener onAnalyze={handleSend} />
    <UpdateNotification />
    <div className="flex flex-col h-screen w-screen bg-bg-overlay rounded-lg overflow-hidden select-none">
      <TrialBanner daysLeft={entitlement.daysLeft} />
      <HeaderBar
        activeModel={settings.activeModel}
        opacity={settings.display.opacity}
        availableProviders={availableProviders}
        compact={compact}
        onModelChange={(model) => updateSetting('activeModel', model)}
        onOpacityChange={handleOpacityChange}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenHistory={handleOpenHistory}
        onNewConversation={handleNewConversation}
        onClose={handleClose}
      />

      <ChatPanel
        messages={messages}
        isStreaming={isStreaming}
        streamingMessageId={streamingMessageId}
      />

      <TranscriptPanel
        isListening={isListening}
        transcript={transcript}
        interimTranscript={interimTranscript}
        onClear={clearTranscript}
      />

      <InputArea
        isStreaming={isStreaming}
        pendingScreenshots={pendingScreenshots}
        onSend={handleSend}
        onStop={stopGeneration}
        onCaptureScreen={captureFull}
        onClearScreenshot={clearScreenshot}
        inputRef={inputRef}
        isListening={isListening}
        transcript={transcript}
        interimTranscript={interimTranscript}
        micAvailable={micAvailable}
        micError={micError}
        onToggleMic={handleToggleMic}
        injectedText={injectedInputText}
        onInjectedTextConsumed={() => setInjectedInputText(null)}
      />

      {/* Phase 4: Code detection notification */}
      <AnimatePresence>
        {codeDetection && (
          <CodeDetectionCard
            detection={codeDetection}
            onDismiss={dismissCodeDetection}
          />
        )}
      </AnimatePresence>

      <StatusBar
        isStreaming={isStreaming}
        error={error}
        lastUsage={lastUsage}
        compact={compact}
        costs={{
          lastRequest: costLastRequest,
          conversation: costConversation,
          session: costSession,
        }}
      />

      {/* Phase 4: Meeting panel — absolute overlay on the right side */}
      <MeetingPanel
        isOpen={meetingPanelOpen}
        isSystemAudioActive={isSystemAudioActive}
        liveTranscript={liveTranscript}
        detectedQuestions={detectedQuestions}
        captureMethod={captureMethod}
        onClose={() => setMeetingPanelOpen(false)}
        onStartCapture={() => startSystemAudio(settings.meeting?.audioSource ?? 'system')}
        onStopCapture={stopSystemAudio}
        onClearTranscript={clearLiveTranscript}
        onDismissQuestion={dismissQuestion}
        onUseQuestion={handleUseQuestion}
      />

      {/* Phase 4: Memory panel */}
      <MemoryPanel
        isOpen={memoryPanelOpen}
        onClose={() => setMemoryPanelOpen(false)}
      />

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

      <ConversationHistory
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        activeConversationId={conversationId}
        conversations={conversations}
        isLoading={historyLoading}
        searchQuery={searchQuery}
        compact={compact}
        onSearchChange={setSearchQuery}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteHistoryConversation}
        onExportConversation={exportHistoryConversation}
        onDeleteAll={deleteAllConversations}
      />

      {/* Phase 4: Inline region selector — rendered over all chat content */}
      <AnimatePresence>
        {snipScreenshot && (
          <InlineRegionSelector
            screenshot={snipScreenshot}
            onSelect={confirmRegion}
            onCancel={cancelSnip}
          />
        )}
      </AnimatePresence>
    </div>
    </ToastProvider>
  );
}

export default function App(): JSX.Element {
  const prefersReduced = useReducedMotion();
  return (
    <MotionConfig reducedMotion={prefersReduced ? 'always' : 'never'}>
      <AppInner />
    </MotionConfig>
  );
}
