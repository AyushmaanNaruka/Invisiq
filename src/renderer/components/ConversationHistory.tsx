import { useState, useCallback } from 'react';
import { X, Search, Trash2, Download, MessageSquare } from 'lucide-react';
import { GhostTooltip } from './ui/GhostTooltip';
import type { ConversationMeta } from '@shared/types';

// ══════════════════════════════════════
//  TYPES
// ══════════════════════════════════════

interface ConversationHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  activeConversationId: string | null;
  conversations: ConversationMeta[];
  isLoading: boolean;
  searchQuery: string;
  compact?: boolean;
  onSearchChange: (query: string) => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onExportConversation: (id: string) => void;
  onDeleteAll: () => void;
}

// ══════════════════════════════════════
//  RELATIVE TIME HELPER
// ══════════════════════════════════════

function relativeTime(isoDate: string): string {
  const now = Date.now();
  const date = new Date(isoDate).getTime();
  const diffMs = now - date;

  if (diffMs < 0) return 'just now';

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return 'just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;

  const dateObj = new Date(isoDate);
  const month = dateObj.toLocaleString('default', { month: 'short' });
  const day = dateObj.getDate();
  const year = dateObj.getFullYear();
  const currentYear = new Date().getFullYear();
  return year === currentYear ? `${month} ${day}` : `${month} ${day}, ${year}`;
}

// ══════════════════════════════════════
//  COMPONENT
// ══════════════════════════════════════

export default function ConversationHistory({
  isOpen,
  onClose,
  activeConversationId,
  conversations,
  isLoading,
  searchQuery,
  compact = false,
  onSearchChange,
  onSelectConversation,
  onDeleteConversation,
  onExportConversation,
  onDeleteAll,
}: ConversationHistoryProps): JSX.Element | null {
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const handleDeleteAll = useCallback(() => {
    if (confirmDeleteAll) {
      onDeleteAll();
      setConfirmDeleteAll(false);
    } else {
      setConfirmDeleteAll(true);
      // Auto-reset confirmation after 3 seconds
      setTimeout(() => setConfirmDeleteAll(false), 3000);
    }
  }, [confirmDeleteAll, onDeleteAll]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex">
      {/* History panel */}
      <div
        className={`${compact ? 'w-full' : 'w-[280px]'} h-full bg-bg-overlay border-r border-border-subtle flex flex-col`}
        style={{ animation: 'slideInLeft 250ms ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle shrink-0">
          <span className="text-text-primary text-md font-semibold">History</span>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-border-subtle shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-placeholder" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search conversations..."
              className="w-full bg-bg-input border border-border-subtle rounded-md pl-8 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-placeholder focus:outline-none focus:border-border-focus transition-colors"
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && conversations.length === 0 && (
            <div className="p-3 space-y-1">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="px-3 py-2.5 border-b border-border-subtle/50 animate-pulse">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-text-placeholder/30" />
                    <div className="h-3 bg-text-placeholder/20 rounded w-3/4" />
                  </div>
                  <div className="ml-3 mb-1.5">
                    <div className="h-2.5 bg-text-placeholder/15 rounded w-full" />
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <div className="h-2 bg-text-placeholder/15 rounded w-12" />
                    <div className="h-2 bg-text-placeholder/15 rounded w-10" />
                    <div className="h-2 bg-text-placeholder/15 rounded w-8" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && conversations.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <MessageSquare size={28} className="text-text-placeholder mb-2" />
              <p className="text-text-secondary text-xs">
                {searchQuery ? `No matches for "${searchQuery}"` : 'No conversations yet. Start chatting!'}
              </p>
            </div>
          )}

          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => onSelectConversation(conv.id)}
              onMouseEnter={() => setHoveredId(conv.id)}
              onMouseLeave={() => setHoveredId(null)}
              className={`relative px-3 py-2.5 cursor-pointer border-b border-border-subtle/50 hover:bg-bg-hover transition-colors ${
                conv.id === activeConversationId
                  ? 'border-l-2 border-l-accent-primary bg-bg-hover/50'
                  : 'border-l-2 border-l-transparent'
              }`}
            >
              {/* Title */}
              <div className="flex items-center gap-1.5 mb-0.5 pr-12">
                <div
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: getModeColor(conv.mode) }}
                />
                <span className="text-text-primary text-xs font-medium truncate">
                  {conv.title || 'Untitled'}
                </span>
              </div>

              {/* Preview */}
              {conv.preview && (
                <p className="text-text-placeholder text-[10px] truncate mb-1 ml-3">
                  {conv.preview}
                </p>
              )}

              {/* Meta row */}
              <div className="flex items-center gap-2 ml-3 text-[10px] text-text-secondary">
                <span>{conv.model.split('-').slice(0, 2).join('-')}</span>
                <span>{relativeTime(conv.updatedAt)}</span>
                <span>{conv.messageCount} msgs</span>
              </div>

              {/* Hover action buttons */}
              {hoveredId === conv.id && (
                <div className="absolute right-2 top-2 flex items-center gap-0.5">
                  <GhostTooltip content="Export as Markdown" placement="bottom">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onExportConversation(conv.id);
                      }}
                      className="p-1 rounded hover:bg-bg-input text-text-secondary hover:text-text-primary transition-colors"
                    >
                      <Download size={12} />
                    </button>
                  </GhostTooltip>
                  <GhostTooltip content="Delete" placement="bottom">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteConversation(conv.id);
                      }}
                      className="p-1 rounded hover:bg-bg-input text-text-secondary hover:text-status-error transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </GhostTooltip>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer — Clear All */}
        {conversations.length > 0 && (
          <div className="px-3 py-2 border-t border-border-subtle shrink-0">
            <button
              onClick={handleDeleteAll}
              className={`w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs transition-colors ${
                confirmDeleteAll
                  ? 'bg-status-error/20 text-status-error border border-status-error/40'
                  : 'text-text-secondary hover:text-status-error hover:bg-bg-hover'
              }`}
            >
              <Trash2 size={12} />
              {confirmDeleteAll ? 'Click again to confirm' : 'Clear All History'}
            </button>
          </div>
        )}
      </div>

      {/* Backdrop */}
      <div className="flex-1" onClick={onClose} />
    </div>
  );
}

// ══════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════

const MODE_COLORS: Record<string, string> = {
  general: '#8B8B9E',
  coding: '#6C5CE7',
  meeting: '#2E75B6',
  solve: '#FDCB6E',
};

function getModeColor(mode: string): string {
  return MODE_COLORS[mode] || '#8B8B9E';
}
