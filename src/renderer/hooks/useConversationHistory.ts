import { useState, useCallback, useEffect, useRef } from 'react';
import type { ConversationMeta } from '@shared/types';

interface UseConversationHistoryReturn {
  conversations: ConversationMeta[];
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  refresh: () => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  exportConversation: (id: string) => Promise<void>;
  deleteAllConversations: () => Promise<void>;
}

export function useConversationHistory(): UseConversationHistoryReturn {
  const [conversations, setConversations] = useState<ConversationMeta[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQueryState] = useState('');
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await window.ghostAPI.conversation.list();
      setConversations(list);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Debounced search
  const setSearchQuery = useCallback(
    (query: string) => {
      setSearchQueryState(query);
      clearTimeout(searchTimeoutRef.current);

      if (!query.trim()) {
        // Empty query — reload full list
        refresh();
        return;
      }

      searchTimeoutRef.current = setTimeout(async () => {
        setIsLoading(true);
        try {
          const results = await window.ghostAPI.conversation.search(query);
          setConversations(results);
        } catch (error) {
          console.error('Failed to search conversations:', error);
        } finally {
          setIsLoading(false);
        }
      }, 300);
    },
    [refresh]
  );

  const deleteConversation = useCallback(
    async (id: string) => {
      try {
        await window.ghostAPI.conversation.delete(id);
        await refresh();
      } catch (error) {
        console.error('Failed to delete conversation:', error);
      }
    },
    [refresh]
  );

  const exportConversation = useCallback(async (id: string) => {
    try {
      const result = await window.ghostAPI.conversation.export(id);
      if (!result) return;

      // Trigger download via Blob + anchor
      const blob = new Blob([result.content], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = result.filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export conversation:', error);
    }
  }, []);

  const deleteAllConversations = useCallback(async () => {
    try {
      await window.ghostAPI.conversation.deleteAll();
      setConversations([]);
      setSearchQueryState('');
    } catch (error) {
      console.error('Failed to delete all conversations:', error);
    }
  }, []);

  return {
    conversations,
    isLoading,
    searchQuery,
    setSearchQuery,
    refresh,
    deleteConversation,
    exportConversation,
    deleteAllConversations,
  };
}
