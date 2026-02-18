import { useState, useCallback, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import type { CustomMode } from '@shared/types';

interface CustomModeEditorProps {
  mode?: CustomMode;
  isOpen: boolean;
  onSave: (mode: CustomMode) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

const COLOR_PRESETS = [
  '#E74C3C', '#E67E22', '#F1C40F', '#2ECC71',
  '#3498DB', '#9B59B6', '#ECF0F1', '#95A5A6',
];

export default function CustomModeEditor({
  mode,
  isOpen,
  onSave,
  onDelete,
  onClose,
}: CustomModeEditorProps): JSX.Element | null {
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLOR_PRESETS[4]);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Pre-fill when editing
  useEffect(() => {
    if (mode) {
      setName(mode.name);
      setColor(mode.color);
      setSystemPrompt(mode.systemPrompt);
    } else {
      setName('');
      setColor(COLOR_PRESETS[4]);
      setSystemPrompt('');
    }
    setError(null);
    setConfirmDelete(false);
  }, [mode, isOpen]);

  const handleSave = useCallback(() => {
    // Validation
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Mode name is required');
      return;
    }
    if (trimmedName.length > 30) {
      setError('Mode name must be 30 characters or less');
      return;
    }
    if (systemPrompt.length < 10) {
      setError('System prompt must be at least 10 characters');
      return;
    }
    if (systemPrompt.length > 2000) {
      setError('System prompt must be 2000 characters or less');
      return;
    }

    const savedMode: CustomMode = {
      id: mode?.id || uuidv4(),
      name: trimmedName,
      color,
      systemPrompt,
      isBuiltIn: false as const,
      createdAt: mode?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(savedMode);
  }, [name, color, systemPrompt, mode, onSave]);

  const handleDelete = useCallback(() => {
    if (!mode || !onDelete) return;
    if (confirmDelete) {
      onDelete(mode.id);
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  }, [mode, onDelete, confirmDelete]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative w-[300px] bg-bg-overlay border border-border-subtle rounded-lg shadow-overlay"
        style={{ animation: 'fadeIn 200ms ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
          <span className="text-text-primary text-sm font-semibold">
            {mode ? 'Edit Custom Mode' : 'Create Custom Mode'}
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-text-secondary text-xs mb-1">Mode Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={30}
              placeholder="e.g., Research, Writing..."
              className="w-full bg-bg-input border border-border-subtle rounded-md px-3 py-1.5 text-sm text-text-primary placeholder:text-text-placeholder focus:outline-none focus:border-border-focus transition-colors"
            />
            <span className="text-text-placeholder text-[10px] mt-0.5 block text-right">
              {name.length}/30
            </span>
          </div>

          {/* Color */}
          <div>
            <label className="block text-text-secondary text-xs mb-1.5">Color</label>
            <div className="flex items-center gap-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full transition-all ${
                    color === c ? 'ring-2 ring-accent-primary ring-offset-2 ring-offset-bg-overlay scale-110' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* System Prompt */}
          <div>
            <label className="block text-text-secondary text-xs mb-1">System Prompt</label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              maxLength={2000}
              rows={6}
              placeholder="Describe how the AI should behave in this mode..."
              className="w-full bg-bg-input border border-border-subtle rounded-md px-3 py-2 text-xs text-text-primary placeholder:text-text-placeholder focus:outline-none focus:border-border-focus transition-colors resize-none"
            />
            <span className="text-text-placeholder text-[10px] mt-0.5 block text-right">
              {systemPrompt.length}/2000
            </span>
          </div>

          {/* Error */}
          {error && (
            <p className="text-status-error text-xs">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border-subtle">
          <div>
            {mode && onDelete && (
              <button
                onClick={handleDelete}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                  confirmDelete
                    ? 'bg-status-error/20 text-status-error'
                    : 'text-text-secondary hover:text-status-error hover:bg-bg-hover'
                }`}
              >
                <Trash2 size={12} />
                {confirmDelete ? 'Confirm delete' : 'Delete'}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded text-xs text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1.5 rounded text-xs font-medium bg-accent-primary text-white hover:bg-accent-primary/80 transition-colors"
            >
              {mode ? 'Save Changes' : 'Create Mode'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
