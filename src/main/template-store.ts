/**
 * template-store.ts — Phase 4 / Sprint 16
 *
 * CRUD for prompt templates stored in electron-store under 'templates.customTemplates'.
 * Built-in templates are served from the renderer constants file — only custom ones are persisted.
 */

import { getSettings, setNestedSetting } from './store';
import { BUILT_IN_TEMPLATES } from '@shared/built-in-templates';
import type { PromptTemplate } from '@shared/types';

export function listTemplates(): { builtIn: PromptTemplate[]; custom: PromptTemplate[] } {
  const settings = getSettings();
  return {
    builtIn: BUILT_IN_TEMPLATES,
    custom: settings.templates?.customTemplates || [],
  };
}

export function saveTemplate(template: PromptTemplate): { success: boolean; error?: string } {
  try {
    const settings = getSettings();
    const custom: PromptTemplate[] = settings.templates?.customTemplates || [];

    const idx = custom.findIndex((t) => t.id === template.id);
    const now = new Date().toISOString();

    const saved: PromptTemplate = {
      ...template,
      isBuiltIn: false,
      updatedAt: now,
      createdAt: idx >= 0 ? (custom[idx].createdAt ?? now) : now,
    };

    if (idx >= 0) {
      custom[idx] = saved;
    } else {
      custom.push(saved);
    }

    setNestedSetting('templates.customTemplates', custom);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Save failed' };
  }
}

export function deleteTemplate(id: string): { success: boolean; error?: string } {
  try {
    const settings = getSettings();
    const custom = (settings.templates?.customTemplates || []).filter((t) => t.id !== id);
    setNestedSetting('templates.customTemplates', custom);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Delete failed' };
  }
}

export function recordTemplateUsage(id: string): void {
  try {
    const settings = getSettings();
    const custom = settings.templates?.customTemplates || [];
    const idx = custom.findIndex((t) => t.id === id);
    if (idx >= 0) {
      custom[idx] = { ...custom[idx], usageCount: (custom[idx].usageCount || 0) + 1 };
      setNestedSetting('templates.customTemplates', custom);
    }

    // Track recent IDs
    const recent = [id, ...(settings.templates?.recentIds || []).filter((r) => r !== id)].slice(0, 10);
    setNestedSetting('templates.recentIds', recent);
  } catch { /* ignore */ }
}
