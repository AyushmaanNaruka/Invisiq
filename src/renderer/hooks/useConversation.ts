import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { ChatMessage, ImageAttachment, TokenUsage } from '@shared/types';

interface UseConversationReturn {
  messages: ChatMessage[];
  addUserMessage: (content: string, images?: ImageAttachment[]) => ChatMessage;
  addAssistantMessage: () => ChatMessage;
  addErrorMessage: (error: string) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  appendToMessage: (id: string, text: string) => void;
  clearConversation: () => void;
  getContextMessages: () => ChatMessage[];
}

export function useConversation(): UseConversationReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const addUserMessage = useCallback((content: string, images?: ImageAttachment[]): ChatMessage => {
    const msg: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content,
      images,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, msg]);
    return msg;
  }, []);

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

  const clearConversation = useCallback(() => {
    setMessages([]);
  }, []);

  const getContextMessages = useCallback((): ChatMessage[] => {
    return messages.filter((m) => m.role === 'user' || m.role === 'assistant');
  }, [messages]);

  return {
    messages,
    addUserMessage,
    addAssistantMessage,
    addErrorMessage,
    updateMessage,
    appendToMessage,
    clearConversation,
    getContextMessages,
  };
}
