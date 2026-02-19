import { useState, useCallback, useEffect, useRef } from 'react';
import HeaderBar from './components/HeaderBar';
import ChatPanel from './components/ChatPanel';
import InputArea from './components/InputArea';
import TranscriptPanel from './components/TranscriptPanel';
import StatusBar from './components/StatusBar';
import Settings from './components/Settings';
import ConversationHistory from './components/ConversationHistory';
import CustomModeEditor from './components/CustomModeEditor';
import OnboardingFlow from './components/OnboardingFlow';
import UpdateNotification from './components/UpdateNotification';
import { ToastProvider, useToast } from './components/Toast';
import { useConversation } from './hooks/useConversation';
import { useConversationHistory } from './hooks/useConversationHistory';
import { useAI } from './hooks/useAI';
import { useScreenshot } from './hooks/useScreenshot';
import { useSettings } from './hooks/useSettings';
import { useHotkeys } from './hooks/useHotkeys';
import { useAudioTranscription } from './hooks/useAudioTranscription';
import { useTokenCost } from './hooks/useTokenCost';
import { useInternalKeyboard } from './hooks/useInternalKeyboard';
import { useWindowSize } from './hooks/useWindowSize';
import { BUILT_IN_MODES } from '@shared/constants';
import type { ProviderID, CustomMode } from '@shared/types';

// Initialize AI providers
import './services/ai-providers/index';

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

export default function App(): JSX.Element {
  const { settings, isLoading: settingsLoading, updateSetting } = useSettings();
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);

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
    clearConversation,
    getContextMessages,
  } = useConversation({
    persistChatHistory: settings.privacy.persistChatHistory,
    activeMode: settings.activeMode,
    activeModel: settings.activeModel,
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
  const { isStreaming, error, lastUsage, sendMessage, stopGeneration } = useAI();
  const { pendingScreenshots, captureFull, captureRegion, clearScreenshot, clearAllScreenshots } = useScreenshot();
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

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [modeEditorOpen, setModeEditorOpen] = useState(false);
  const [editingMode, setEditingMode] = useState<CustomMode | undefined>(undefined);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [availableProviders, setAvailableProviders] = useState<Set<ProviderID>>(new Set());
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Apply font size from settings on mount/change
  useEffect(() => {
    if (settings.display.fontSize && settings.display.fontSize !== 13) {
      document.documentElement.style.fontSize = `${settings.display.fontSize}px`;
    }
  }, [settings.display.fontSize]);

  // Check which providers have API keys
  useEffect(() => {
    async function checkProviders(): Promise<void> {
      const providers: ProviderID[] = ['openai', 'anthropic', 'gemini'];
      const available = new Set<ProviderID>();
      for (const p of providers) {
        const { key } = await window.ghostAPI.store.getApiKey(p);
        if (key) available.add(p);
      }
      // Ollama is always "available" — no API key required
      available.add('ollama');
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

  // ── Custom mode editor ──────────────────────────────────

  const handleCreateMode = useCallback(() => {
    setEditingMode(undefined);
    setModeEditorOpen(true);
  }, []);

  const handleEditMode = useCallback((mode: CustomMode) => {
    setEditingMode(mode);
    setModeEditorOpen(true);
  }, []);

  const handleSaveMode = useCallback(
    async (mode: CustomMode) => {
      await window.ghostAPI.modes.save(mode);
      // Refresh settings to pick up new customModes array
      const updated = await window.ghostAPI.store.getAll();
      await updateSetting('customModes', (updated as { customModes: CustomMode[] }).customModes || []);
      setModeEditorOpen(false);
      setEditingMode(undefined);
    },
    [updateSetting]
  );

  const handleDeleteMode = useCallback(
    async (id: string) => {
      await window.ghostAPI.modes.delete(id);
      const updated = await window.ghostAPI.store.getAll();
      await updateSetting('customModes', (updated as { customModes: CustomMode[] }).customModes || []);
      // If deleted mode was active, switch to 'general'
      if (settings.activeMode === id) {
        await updateSetting('activeMode', 'general');
      }
      setModeEditorOpen(false);
      setEditingMode(undefined);
    },
    [updateSetting, settings.activeMode]
  );

  // ── Send message ─────────────────────────────────────────

  const handleSend = useCallback(
    async (text: string) => {
      // Build images array from pending screenshots
      const images = pendingScreenshots.length > 0 ? pendingScreenshots : undefined;

      // Meeting mode auto-context: prepend transcript for AI but show original text in chat
      let aiText = text;
      if (
        settings.activeMode === 'meeting' &&
        settings.audio?.autoIncludeTranscript &&
        transcript.trim()
      ) {
        aiText = `[Current meeting transcript:\n${transcript.trim()}]\n\n${text}`;
      }

      // Add user message to conversation (shows original text)
      addUserMessage(text, images);
      clearAllScreenshots();

      // Add empty assistant message to fill with streaming content
      const assistantMsg = addAssistantMessage();
      setStreamingMessageId(assistantMsg.id);

      // Get current mode's system prompt (check both built-in and custom modes)
      const currentMode =
        BUILT_IN_MODES.find((m) => m.id === settings.activeMode) ||
        settings.customModes.find((m) => m.id === settings.activeMode);

      await sendMessage(aiText, [...getContextMessages(), { id: '', role: 'user', content: aiText, images, timestamp: '' }], {
        model: settings.activeModel,
        systemPrompt: currentMode?.systemPrompt,
        onToken: (token) => {
          appendToMessage(assistantMsg.id, token);
        },
        onDone: (usage, latency) => {
          updateMessage(assistantMsg.id, {
            usage,
            latencyMs: latency,
            model: settings.activeModel,
          });
          recordUsage(usage);
          setStreamingMessageId(null);
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
      settings.customModes,
      settings.audio?.autoIncludeTranscript,
      transcript,
      sendMessage,
      appendToMessage,
      updateMessage,
      addErrorMessage,
      recordUsage,
    ]
  );

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
    window.ghostAPI.overlay.hide();
  }, []);

  // Show nothing while settings are loading
  if (settingsLoading || showOnboarding === null) {
    return <div className="h-screen w-screen bg-bg-overlay rounded-lg" />;
  }

  // Onboarding gate
  if (showOnboarding) {
    return <OnboardingFlow onComplete={() => setShowOnboarding(false)} />;
  }

  return (
    <ToastProvider>
    <ClipboardListener onAnalyze={handleSend} />
    <UpdateNotification />
    <div className="flex flex-col h-screen w-screen bg-bg-overlay rounded-lg overflow-hidden select-none">
      <HeaderBar
        activeMode={settings.activeMode}
        activeModel={settings.activeModel}
        opacity={settings.display.opacity}
        availableProviders={availableProviders}
        customModes={settings.customModes}
        compact={compact}
        onModeChange={(mode) => updateSetting('activeMode', mode)}
        onModelChange={(model) => updateSetting('activeModel', model)}
        onOpacityChange={handleOpacityChange}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenHistory={handleOpenHistory}
        onNewConversation={handleNewConversation}
        onCreateMode={handleCreateMode}
        onEditMode={handleEditMode}
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
      />

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

      <Settings
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onUpdateSetting={updateSetting}
        compact={compact}
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

      <CustomModeEditor
        mode={editingMode}
        isOpen={modeEditorOpen}
        onSave={handleSaveMode}
        onDelete={editingMode ? handleDeleteMode : undefined}
        onClose={() => {
          setModeEditorOpen(false);
          setEditingMode(undefined);
        }}
      />
    </div>
    </ToastProvider>
  );
}
