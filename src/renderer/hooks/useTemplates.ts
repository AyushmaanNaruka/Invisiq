/**
 * useTemplates — Phase 4 / Sprint 16
 *
 * Template CRUD + search/filter via IPC.
 * Handles variable substitution before returning the final prompt.
 */

import { useState, useCallback, useEffect } from 'react';
import type { PromptTemplate, TemplateCategory } from '@shared/types';

interface UseTemplatesReturn {
  builtIn: PromptTemplate[];
  custom: PromptTemplate[];
  isLoading: boolean;
  searchQuery: string;
  activeCategory: TemplateCategory | 'all';
  filtered: PromptTemplate[];
  setSearchQuery: (q: string) => void;
  setActiveCategory: (cat: TemplateCategory | 'all') => void;
  saveTemplate: (template: PromptTemplate) => Promise<boolean>;
  deleteTemplate: (id: string) => Promise<boolean>;
  applyTemplate: (template: PromptTemplate, variables: Record<string, string>) => string;
  refresh: () => Promise<void>;
}

export function useTemplates(): UseTemplatesReturn {
  const [builtIn, setBuiltIn] = useState<PromptTemplate[]>([]);
  const [custom, setCustom] = useState<PromptTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<TemplateCategory | 'all'>('all');

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await window.ghostAPI.template.list();
      setBuiltIn(result.builtIn);
      setCustom(result.custom);
    } catch (err) {
      console.error('[useTemplates] Failed to load templates:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const saveTemplate = useCallback(async (template: PromptTemplate): Promise<boolean> => {
    try {
      const result = await window.ghostAPI.template.save(template);
      if (result.success) await refresh();
      return result.success;
    } catch {
      return false;
    }
  }, [refresh]);

  const deleteTemplate = useCallback(async (id: string): Promise<boolean> => {
    try {
      const result = await window.ghostAPI.template.delete(id);
      if (result.success) await refresh();
      return result.success;
    } catch {
      return false;
    }
  }, [refresh]);

  /** Substitute {{variable}} placeholders with provided values */
  const applyTemplate = useCallback(
    (template: PromptTemplate, variables: Record<string, string>): string => {
      let prompt = template.prompt;
      for (const [key, value] of Object.entries(variables)) {
        prompt = prompt.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
      }
      // Remove any unresolved placeholders
      prompt = prompt.replace(/\{\{[^}]+\}\}/g, '');
      return prompt.trim();
    },
    []
  );

  // Filter templates by search query and category
  const all = [...builtIn, ...custom];
  const filtered = all.filter((t) => {
    const matchesCategory = activeCategory === 'all' || t.category === activeCategory;
    if (!matchesCategory) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.tags.some((tag) => tag.toLowerCase().includes(q))
    );
  });

  return {
    builtIn,
    custom,
    isLoading,
    searchQuery,
    activeCategory,
    filtered,
    setSearchQuery,
    setActiveCategory,
    saveTemplate,
    deleteTemplate,
    applyTemplate,
    refresh,
  };
}
