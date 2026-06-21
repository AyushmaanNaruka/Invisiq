import { useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { ChatMessage, ImageAttachment, Conversation } from '@shared/types';

// ══════════════════════════════════════
//  TYPES
// ══════════════════════════════════════

interface UseConversationConfig {
  persistChatHistory: boolean;
  activeMode: string;
  activeModel: string;
  /** While true, tokens are still streaming in — saves are debounced. When the
   *  turn goes idle, the conversation is flushed to disk immediately so closing
   *  the app right after a response never loses it. */
  isStreaming: boolean;
}

interface UseConversationReturn {
  messages: ChatMessage[];
  conversationId: string | null;
  conversationTitle: string;
  addUserMessage: (content: string, images?: ImageAttachment[]) => ChatMessage;
  addAssistantMessage: () => ChatMessage;
  addErrorMessage: (error: string) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  appendToMessage: (id: string, text: string) => void;
  startNewConversation: () => void;
  loadConversation: (id: string) => Promise<{ mode?: string; model?: string } | null>;
  clearConversation: () => void;
  getContextMessages: () => ChatMessage[];
}

// ══════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════

function generateTitle(firstUserMessage: string): string {
  const trimmed = firstUserMessage.trim();
  if (trimmed.length <= 50) return trimmed;

  const truncated = trimmed.substring(0, 50);
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > 20) {
    return truncated.substring(0, lastSpace) + '...';
  }
  return truncated + '...';
}

// ══════════════════════════════════════
//  HOOK
// ══════════════════════════════════════

export function useConversation(config: UseConversationConfig): UseConversationReturn {
  const { persistChatHistory, activeMode, activeModel, isStreaming } = config;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationTitle, setConversationTitle] = useState<string>('');

  const createdAtRef = useRef<string>(new Date().toISOString());
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const titleGeneratedRef = useRef<boolean>(false);

  // Always-current snapshot of "what would we persist right now" so the
  // close/quit flush below can write without depending on stale closures.
  const snapshotRef = useRef<{ canSave: boolean; build: () => Conversation }>({
    canSave: false,
    build: () => ({}) as Conversation,
  });
  snapshotRef.current = {
    canSave: !!conversationId && messages.length > 0 && persistChatHistory,
    build: (): Conversation => ({
      id: conversationId as string,
      title: conversationTitle || 'Untitled',
      messages,
      mode: activeMode,
      model: activeModel,
      createdAt: createdAtRef.current,
      updatedAt: new Date().toISOString(),
      totalTokens: messages.reduce((sum, m) => sum + (m.usage?.totalTokens || 0), 0),
      estimatedCost: messages.reduce((sum, m) => sum + (m.usage?.estimatedCostUSD || 0), 0),
    }),
  };

  // ── Auto-save ────────────────────────────────────────────
  // Debounce only while tokens are still streaming in; once the turn is idle we
  // flush immediately (delay 0) so a quick close right after a response can't
  // lose the conversation to a pending 500ms timer.
  useEffect(() => {
    if (!conversationId || messages.length === 0 || !persistChatHistory) return;

    clearTimeout(saveTimeoutRef.current);
    const delay = isStreaming ? 500 : 0;
    saveTimeoutRef.current = setTimeout(() => {
      window.ghostAPI.conversation.save(snapshotRef.current.build()).catch(console.error);
    }, delay);

    return () => clearTimeout(saveTimeoutRef.current);
  }, [messages, conversationId, conversationTitle, persistChatHistory, activeMode, activeModel, isStreaming]);

  // ── Flush on window close / quit ─────────────────────────
  // Best-effort final write so the in-flight conversation survives an app/PC
  // restart even if it happened inside the debounce window.
  useEffect(() => {
    const flush = (): void => {
      if (snapshotRef.current.canSave) {
        window.ghostAPI.conversation.save(snapshotRef.current.build()).catch(() => {});
      }
    };
    window.addEventListener('beforeunload', flush);
    return () => window.removeEventListener('beforeunload', flush);
  }, []);

  // ── Auto-generate title from first user message ──────────
  useEffect(() => {
    if (titleGeneratedRef.current || conversationTitle) return;
    if (messages.length < 2) return;

    const firstUser = messages.find((m) => m.role === 'user');
    const hasAssistant = messages.some((m) => m.role === 'assistant' && m.content.length > 0);

    if (firstUser && hasAssistant) {
      const title = generateTitle(firstUser.content);
      setConversationTitle(title);
      titleGeneratedRef.current = true;
    }
  }, [messages, conversationTitle]);

  // ── Message operations ───────────────────────────────────

  const addUserMessage = useCallback(
    (content: string, images?: ImageAttachment[]): ChatMessage => {
      // Create conversation ID on first message if none exists
      let currentId = conversationId;
      if (!currentId) {
        currentId = uuidv4();
        setConversationId(currentId);
        createdAtRef.current = new Date().toISOString();
        titleGeneratedRef.current = false;
      }

      const msg: ChatMessage = {
        id: uuidv4(),
        role: 'user',
        content,
        images,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, msg]);
      return msg;
    },
    [conversationId]
  );

  const addAssistantMessage = useCallback((): ChatMessage => {
    const msg: ChatMessage = {
      id: uuidv4(),
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, msg]);
    return msg;
  }, []);

  const addErrorMessage = useCallback((error: string) => {
    const msg: ChatMessage = {
      id: uuidv4(),
      role: 'error',
      content: error,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, msg]);
  }, []);

  const updateMessage = useCallback((id: string, updates: Partial<ChatMessage>) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, ...updates } : msg))
    );
  }, []);

  const appendToMessage = useCallback((id: string, text: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === id ? { ...msg, content: msg.content + text } : msg
      )
    );
  }, []);

  // ── Conversation management ──────────────────────────────

  const startNewConversation = useCallback(() => {
    // Flush any pending save before clearing
    clearTimeout(saveTimeoutRef.current);

    setMessages([]);
    setConversationId(null);
    setConversationTitle('');
    createdAtRef.current = new Date().toISOString();
    titleGeneratedRef.current = false;
  }, []);

  const loadConversation = useCallback(async (id: string): Promise<{ mode?: string; model?: string } | null> => {
    try {
      const conversation = await window.ghostAPI.conversation.load(id);
      if (!conversation) return null;

      setMessages(conversation.messages);
      setConversationId(conversation.id);
      setConversationTitle(conversation.title);
      createdAtRef.current = conversation.createdAt;
      titleGeneratedRef.current = true;
      return { mode: conversation.mode, model: conversation.model };
    } catch (error) {
      console.error('Failed to load conversation:', error);
      return null;
    }
  }, []);

  const clearConversation = useCallback(() => {
    startNewConversation();
  }, [startNewConversation]);

  const getContextMessages = useCallback((): ChatMessage[] => {
    return messages.filter((m) => m.role === 'user' || m.role === 'assistant');
  }, [messages]);

  return {
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
  };
}
