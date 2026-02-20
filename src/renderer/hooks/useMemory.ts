/**
 * useMemory — Phase 4 / Sprint 17
 *
 * Memory CRUD + context injection for handleSend in App.tsx.
 */

import { useState, useCallback } from 'react';
import type { MemoryFact, MemorySearchResult, MemoryStats } from '@shared/types';

/** Regex patterns for extracting memorable facts from user messages */
const EXTRACT_PATTERNS: { pattern: RegExp; extract: (match: RegExpMatchArray) => string }[] = [
  { pattern: /remember\s+that\s+(.+)/i, extract: (m) => m[1].replace(/[.!?]+$/, '').trim() },
  { pattern: /my\s+(name|language|favorite\s+[\w\s]+?|preferred\s+[\w\s]+?|job|role|company|email|location|timezone)\s+is\s+(.+)/i, extract: (m) => `User's ${m[1].trim()} is ${m[2].replace(/[.!?]+$/, '').trim()}` },
  { pattern: /I\s+prefer\s+(.+)/i, extract: (m) => `User prefers ${m[1].replace(/[.!?]+$/, '').trim()}` },
  { pattern: /I\s+work\s+(?:at|for)\s+(.+)/i, extract: (m) => `User works at ${m[1].replace(/[.!?]+$/, '').trim()}` },
  { pattern: /I(?:'m|\s+am)\s+a\s+(.+)/i, extract: (m) => `User is a ${m[1].replace(/[.!?]+$/, '').trim()}` },
  { pattern: /I\s+use\s+(.+)\s+for\s+(.+)/i, extract: (m) => `User uses ${m[1].trim()} for ${m[2].replace(/[.!?]+$/, '').trim()}` },
  { pattern: /I\s+always\s+(.+)/i, extract: (m) => `User always ${m[1].replace(/[.!?]+$/, '').trim()}` },
];

interface UseMemoryReturn {
  isEnabled: boolean;
  /** Search memory and return relevant facts as a context prefix string */
  buildContextPrefix: (query: string, maxFacts?: number) => Promise<string>;
  /** Manually add a fact */
  addFact: (content: string, tags?: string[]) => Promise<string>;
  /** Delete a fact by id */
  deleteFact: (id: string) => Promise<boolean>;
  /** List all facts (paginated) */
  listFacts: (page?: number) => Promise<{ facts: MemoryFact[]; total: number }>;
  /** Search facts */
  searchFacts: (query: string, limit?: number) => Promise<MemorySearchResult[]>;
  /** Clear all facts */
  clearAll: () => Promise<number>;
  /** Get stats */
  getStats: () => Promise<MemoryStats | null>;
  /** Extract facts from a conversation */
  extractFromConversation: (conversationId: string) => Promise<number>;
  /** Auto-extract facts from a user message */
  autoExtractFromMessage: (text: string) => Promise<void>;
}

export function useMemory(enabled: boolean): UseMemoryReturn {
  const [isEnabled] = useState(enabled);

  const buildContextPrefix = useCallback(
    async (query: string, maxFacts: number = 5): Promise<string> => {
      if (!enabled || !query.trim()) return '';
      try {
        const results = await window.ghostAPI.memory.search(query, maxFacts);
        if (results.length === 0) return '';
        const facts = results.map((r) => `- ${r.fact.content}`).join('\n');
        return `[Relevant context from memory:\n${facts}]\n\n`;
      } catch {
        return '';
      }
    },
    [enabled]
  );

  const addFact = useCallback(async (content: string, tags?: string[]): Promise<string> => {
    try {
      const result = await window.ghostAPI.memory.add(content, tags);
      return result.id;
    } catch {
      return '';
    }
  }, []);

  const deleteFact = useCallback(async (id: string): Promise<boolean> => {
    try {
      const result = await window.ghostAPI.memory.delete(id);
      return result.success;
    } catch {
      return false;
    }
  }, []);

  const listFacts = useCallback(
    async (page: number = 1): Promise<{ facts: MemoryFact[]; total: number }> => {
      try {
        return await window.ghostAPI.memory.list(page);
      } catch {
        return { facts: [], total: 0 };
      }
    },
    []
  );

  const searchFacts = useCallback(
    async (query: string, limit?: number): Promise<MemorySearchResult[]> => {
      try {
        return await window.ghostAPI.memory.search(query, limit);
      } catch {
        return [];
      }
    },
    []
  );

  const clearAll = useCallback(async (): Promise<number> => {
    try {
      const result = await window.ghostAPI.memory.clearAll();
      return result.count;
    } catch {
      return 0;
    }
  }, []);

  const getStats = useCallback(async (): Promise<MemoryStats | null> => {
    try {
      return await window.ghostAPI.memory.stats();
    } catch {
      return null;
    }
  }, []);

  const extractFromConversation = useCallback(async (conversationId: string): Promise<number> => {
    try {
      const result = await window.ghostAPI.memory.extract(conversationId);
      return result.extracted;
    } catch {
      return 0;
    }
  }, []);

  const autoExtractFromMessage = useCallback(async (text: string): Promise<void> => {
    if (!enabled) return;

    for (const { pattern, extract } of EXTRACT_PATTERNS) {
      const match = text.match(pattern);
      if (match) {
        const fact = extract(match);
        if (!fact || fact.length < 3) continue;

        // Check for duplicates — search existing facts before adding
        try {
          const existing = await window.ghostAPI.memory.search(fact, 3);
          const isDuplicate = existing.some((r) => r.score > 0.8);
          if (!isDuplicate) {
            await window.ghostAPI.memory.add(fact, ['auto-extracted']);
          }
        } catch {
          // Best effort — don't block the send flow
        }
      }
    }
  }, [enabled]);

  return {
    isEnabled,
    buildContextPrefix,
    addFact,
    deleteFact,
    listFacts,
    searchFacts,
    clearAll,
    getStats,
    extractFromConversation,
    autoExtractFromMessage,
  };
}
