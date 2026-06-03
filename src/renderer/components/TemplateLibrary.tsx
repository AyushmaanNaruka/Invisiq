/**
 * TemplateLibrary — Phase 4 / Sprint 16
 *
 * Full-screen modal with searchable, filterable template grid.
 * Selecting a template opens variable substitution if needed, then inserts the prompt.
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Search, FileText, Code, Pencil, ChartNoAxesColumn,
  Users, BookOpen, FlaskConical, Bug, Plus, Star,
} from 'lucide-react';
import { scaleIn } from './ui/animations';
import { useTemplates } from '../hooks/useTemplates';
import type { PromptTemplate, TemplateCategory } from '@shared/types';

interface TemplateLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (prompt: string) => void;
}

type CategoryDef = { id: TemplateCategory | 'all'; label: string; icon: JSX.Element };

const CATEGORIES: CategoryDef[] = [
  { id: 'all', label: 'All', icon: <Star size={12} strokeWidth={1.75} /> },
  { id: 'coding', label: 'Coding', icon: <Code size={12} strokeWidth={1.75} /> },
  { id: 'writing', label: 'Writing', icon: <Pencil size={12} strokeWidth={1.75} /> },
  { id: 'analysis', label: 'Analysis', icon: <ChartNoAxesColumn size={12} strokeWidth={1.75} /> },
  { id: 'meeting', label: 'Meeting', icon: <Users size={12} strokeWidth={1.75} /> },
  { id: 'solve', label: 'Solve', icon: <BookOpen size={12} strokeWidth={1.75} /> },
  { id: 'research', label: 'Research', icon: <FlaskConical size={12} strokeWidth={1.75} /> },
  { id: 'debugging', label: 'Debug', icon: <Bug size={12} strokeWidth={1.75} /> },
  { id: 'custom', label: 'Custom', icon: <FileText size={12} strokeWidth={1.75} /> },
];

// Variable substitution dialog
function VariableDialog({
  template,
  onConfirm,
  onCancel,
}: {
  template: PromptTemplate;
  onConfirm: (vars: Record<string, string>) => void;
  onCancel: () => void;
}): JSX.Element {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(template.variables.map((v) => [v.name, '']))
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(values);
  };

  return (
    <motion.div
      variants={scaleIn}
      initial="hidden"
      animate="visible"
      exit="hidden"
      className="absolute inset-0 bg-bg-overlay/80 backdrop-blur-sm flex items-center justify-center z-10 p-6"
    >
      <div className="bg-bg-header border border-border-subtle rounded-xl shadow-ghost-lg w-full max-w-md">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">{template.name}</h3>
            <p className="text-[10px] text-text-placeholder">{template.description}</p>
          </div>
          <button onClick={onCancel} className="p-1 text-text-secondary hover:text-text-primary transition-colors">
            <X size={14} strokeWidth={1.75} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {template.variables.map((variable) => (
            <div key={variable.name}>
              <label className="block text-xs text-text-secondary mb-1">
                {variable.label}
                {variable.required && <span className="text-status-error ml-0.5">*</span>}
              </label>
              <textarea
                value={values[variable.name]}
                onChange={(e) => setValues((prev) => ({ ...prev, [variable.name]: e.target.value }))}
                placeholder={variable.placeholder}
                rows={2}
                className="w-full bg-bg-input border border-border-subtle rounded-md px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-placeholder focus:outline-none focus:border-border-focus transition-colors resize-none"
                required={variable.required}
              />
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-md bg-accent-primary text-bg-overlay text-xs font-medium hover:opacity-90 transition-opacity"
            >
              Use Template
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}

// Single template card
function TemplateCard({
  template,
  onSelect,
}: {
  template: PromptTemplate;
  onSelect: () => void;
}): JSX.Element {
  const CATEGORY_COLORS: Partial<Record<TemplateCategory, string>> = {
    coding: 'text-accent-purple',
    debugging: 'text-status-error',
    writing: 'text-accent-cyan',
    analysis: 'text-accent-blue',
    meeting: 'text-accent-primary',
    solve: 'text-accent-amber',
    research: 'text-status-success',
    custom: 'text-text-secondary',
  };

  return (
    <button
      onClick={onSelect}
      className="text-left w-full p-3 rounded-lg border border-border-subtle hover:border-border-active bg-surface-elevated hover:bg-bg-hover transition-all group"
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <h4 className="text-xs font-medium text-text-primary group-hover:text-accent-primary transition-colors line-clamp-1">
          {template.name}
        </h4>
        {!template.isBuiltIn && (
          <span className="text-[9px] bg-accent-primary/10 text-accent-primary px-1 py-0.5 rounded shrink-0">
            Custom
          </span>
        )}
      </div>
      <p className="text-[10px] text-text-secondary line-clamp-2 mb-2">{template.description}</p>
      <div className="flex items-center gap-1 flex-wrap">
        <span className={`text-[9px] font-medium ${CATEGORY_COLORS[template.category] ?? 'text-text-placeholder'}`}>
          {template.category}
        </span>
        {template.variables.length > 0 && (
          <span className="text-[9px] text-text-placeholder">· {template.variables.length} variable{template.variables.length !== 1 ? 's' : ''}</span>
        )}
      </div>
    </button>
  );
}

// Inline template editor for creating new templates
function TemplateEditor({
  onSave,
  onCancel,
}: {
  onSave: (template: PromptTemplate) => Promise<boolean>;
  onCancel: () => void;
}): JSX.Element {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TemplateCategory>('custom');
  const [prompt, setPrompt] = useState('');
  const [saving, setSaving] = useState(false);

  function extractVariables(text: string): PromptTemplate['variables'] {
    const matches = text.match(/\{\{(\w+)\}\}/g) || [];
    const unique = [...new Set(matches.map((m) => m.slice(2, -2)))];
    return unique.map((varName) => ({
      name: varName,
      label: varName.charAt(0).toUpperCase() + varName.slice(1).replace(/_/g, ' '),
      placeholder: `Enter ${varName}...`,
      required: true,
    }));
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!name.trim() || !prompt.trim()) return;
    setSaving(true);

    const template: PromptTemplate = {
      id: `custom-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      category,
      prompt: prompt.trim(),
      variables: extractVariables(prompt),
      isBuiltIn: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: 0,
      tags: [category],
    };

    const success = await onSave(template);
    setSaving(false);
    if (success) onCancel();
  };

  return (
    <motion.div
      variants={scaleIn}
      initial="hidden"
      animate="visible"
      exit="hidden"
      className="absolute inset-0 bg-bg-overlay/80 backdrop-blur-sm flex items-center justify-center z-10 p-4"
    >
      <div className="bg-bg-header border border-border-subtle rounded-xl shadow-ghost-lg w-full max-w-md max-h-[90%] overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
          <h3 className="text-sm font-semibold text-text-primary">New Template</h3>
          <button onClick={onCancel} className="p-1 text-text-secondary hover:text-text-primary transition-colors">
            <X size={14} strokeWidth={1.75} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="block text-xs text-text-secondary mb-1">Name <span className="text-status-error">*</span></label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My template"
              maxLength={60}
              required
              className="w-full bg-bg-input border border-border-subtle rounded-md px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-placeholder focus:outline-none focus:border-border-focus transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A short description of this template"
              maxLength={120}
              className="w-full bg-bg-input border border-border-subtle rounded-md px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-placeholder focus:outline-none focus:border-border-focus transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as TemplateCategory)}
              className="w-full bg-bg-input border border-border-subtle rounded-md px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:border-border-focus transition-colors"
            >
              {CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">
              Prompt <span className="text-status-error">*</span>
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={'Write your prompt here...\nUse {{variable}} for dynamic values.'}
              rows={5}
              required
              className="w-full bg-bg-input border border-border-subtle rounded-md px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-placeholder focus:outline-none focus:border-border-focus transition-colors resize-none"
            />
            <p className="text-[10px] text-text-placeholder mt-1">
              Use {'{{variableName}}'} for user-fillable variables
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim() || !prompt.trim()}
              className="px-4 py-1.5 rounded-md bg-accent-primary text-bg-overlay text-xs font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {saving ? 'Saving...' : 'Save Template'}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}

export default function TemplateLibrary({ isOpen, onClose, onApply }: TemplateLibraryProps): JSX.Element | null {
  const {
    filtered,
    isLoading,
    searchQuery,
    activeCategory,
    setSearchQuery,
    setActiveCategory,
    applyTemplate,
    saveTemplate,
  } = useTemplates();

  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  const handleSelect = useCallback((template: PromptTemplate) => {
    if (template.variables.length === 0) {
      onApply(applyTemplate(template, {}));
      onClose();
    } else {
      setSelectedTemplate(template);
    }
  }, [applyTemplate, onApply, onClose]);

  const handleVariableConfirm = useCallback(
    (vars: Record<string, string>) => {
      if (!selectedTemplate) return;
      onApply(applyTemplate(selectedTemplate, vars));
      setSelectedTemplate(null);
      onClose();
    },
    [selectedTemplate, applyTemplate, onApply, onClose]
  );

  if (!isOpen) return null;

  return (
    <motion.div
      key="template-library"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-bg-overlay/90 backdrop-blur-sm z-50 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border-subtle shrink-0">
        <FileText size={15} strokeWidth={1.75} className="text-accent-primary" />
        <h2 className="text-sm font-semibold text-text-primary flex-1">Template Library</h2>
        <button onClick={onClose} className="p-1 text-text-secondary hover:text-text-primary transition-colors">
          <X size={15} strokeWidth={1.75} />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-border-subtle shrink-0">
        <div className="relative">
          <Search size={12} strokeWidth={1.75} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-placeholder" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="w-full bg-bg-input border border-border-subtle rounded-md pl-7 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-placeholder focus:outline-none focus:border-border-focus transition-colors"
            autoFocus
          />
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex items-center gap-1 px-3 py-1.5 overflow-x-auto border-b border-border-subtle shrink-0 scrollbar-none">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium whitespace-nowrap transition-colors ${
              activeCategory === cat.id
                ? 'bg-accent-primary/10 text-accent-primary border border-accent-primary/20'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
            }`}
          >
            {cat.icon}
            {cat.label}
          </button>
        ))}
      </div>

      {/* Template grid — scrollable */}
      <div className="flex-1 overflow-y-auto p-3 relative">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 rounded-lg bg-surface-elevated animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <FileText size={28} strokeWidth={1.25} className="text-text-placeholder mb-2" />
            <p className="text-xs text-text-secondary">No templates found</p>
            <p className="text-[10px] text-text-placeholder mt-1">Try a different search or category</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {filtered.map((t) => (
              <TemplateCard key={t.id} template={t} onSelect={() => handleSelect(t)} />
            ))}
          </div>
        )}

        {/* Variable substitution overlay */}
        <AnimatePresence>
          {selectedTemplate && (
            <VariableDialog
              template={selectedTemplate}
              onConfirm={handleVariableConfirm}
              onCancel={() => setSelectedTemplate(null)}
            />
          )}
        </AnimatePresence>

        {/* Template editor overlay */}
        <AnimatePresence>
          {showEditor && (
            <TemplateEditor
              onSave={saveTemplate}
              onCancel={() => setShowEditor(false)}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-border-subtle shrink-0 flex items-center justify-between">
        <p className="text-[10px] text-text-placeholder">{filtered.length} template{filtered.length !== 1 ? 's' : ''}</p>
        <button
          className="flex items-center gap-1 text-[10px] text-accent-primary hover:opacity-80 transition-opacity"
          onClick={() => setShowEditor(true)}
        >
          <Plus size={11} strokeWidth={2} />
          New template
        </button>
      </div>
    </motion.div>
  );
}
