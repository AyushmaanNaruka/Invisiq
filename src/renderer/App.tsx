import { useState, useCallback, useEffect, useRef } from 'react';
import HeaderBar from './components/HeaderBar';
import ChatPanel from './components/ChatPanel';
import InputArea from './components/InputArea';
import StatusBar from './components/StatusBar';
import Settings from './components/Settings';
import { useConversation } from './hooks/useConversation';
import { useAI } from './hooks/useAI';
import { useScreenshot } from './hooks/useScreenshot';
import { useSettings } from './hooks/useSettings';
import { useHotkeys } from './hooks/useHotkeys';
import { BUILT_IN_MODES } from '@shared/constants';
import type { ProviderID } from '@shared/types';

// Initialize AI providers
import './services/ai-providers/index';

export default function App(): JSX.Element {
  const { settings, updateSetting } = useSettings();
  const {
    messages,
    addUserMessage,
    addAssistantMessage,
    addErrorMessage,
    updateMessage,
    appendToMessage,
    clearConversation,
    getContextMessages,
  } = useConversation();
  const { isStreaming, error, lastUsage, sendMessage, stopGeneration } = useAI();
  const { pendingScreenshots, captureFull, captureRegion, clearScreenshot, clearAllScreenshots } = useScreenshot();
  const { registerCallback } = useHotkeys();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [availableProviders, setAvailableProviders] = useState<Set<ProviderID>>(new Set());
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Check which providers have API keys
  useEffect(() => {
    async function checkProviders(): Promise<void> {
      const providers: ProviderID[] = ['openai', 'anthropic', 'gemini'];
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
    registerCallback('new-conversation', clearConversation);
  }, [registerCallback, captureFull, captureRegion, clearConversation, messages]);

  const handleSend = useCallback(
    async (text: string) => {
      // Build images array from pending screenshots
      const images = pendingScreenshots.length > 0 ? pendingScreenshots : undefined;

      // Add user message to conversation
      addUserMessage(text, images);
      clearAllScreenshots();

      // Add empty assistant message to fill with streaming content
      const assistantMsg = addAssistantMessage();
      setStreamingMessageId(assistantMsg.id);

      // Get current mode's system prompt
      const currentMode = BUILT_IN_MODES.find((m) => m.id === settings.activeMode);

      await sendMessage(text, [...getContextMessages(), { id: '', role: 'user', content: text, images, timestamp: '' }], {
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
      sendMessage,
      appendToMessage,
      updateMessage,
      addErrorMessage,
    ]
  );

  const handleOpacityChange = useCallback(
    async (opacity: number) => {
      await window.ghostAPI.overlay.setOpacity(opacity);
      await updateSetting('display.opacity', opacity);
    },
    [updateSetting]
  );

  const handleClose = useCallback(() => {
    window.ghostAPI.overlay.hide();
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen bg-bg-overlay rounded-lg overflow-hidden select-none">
      <HeaderBar
        activeMode={settings.activeMode}
        activeModel={settings.activeModel}
        opacity={settings.display.opacity}
        availableProviders={availableProviders}
        onModeChange={(mode) => updateSetting('activeMode', mode)}
        onModelChange={(model) => updateSetting('activeModel', model)}
        onOpacityChange={handleOpacityChange}
        onOpenSettings={() => setSettingsOpen(true)}
        onClose={handleClose}
      />

      <ChatPanel
        messages={messages}
        isStreaming={isStreaming}
        streamingMessageId={streamingMessageId}
      />

      <InputArea
        isStreaming={isStreaming}
        pendingScreenshots={pendingScreenshots}
        onSend={handleSend}
        onStop={stopGeneration}
        onCaptureScreen={captureFull}
        onClearScreenshot={clearScreenshot}
        inputRef={inputRef}
      />

      <StatusBar
        isStreaming={isStreaming}
        error={error}
        lastUsage={lastUsage}
      />

      <Settings isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
