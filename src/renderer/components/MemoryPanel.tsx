/**
 * MemoryPanel — Phase 4 / Sprint 17
 *
 * Slide-in panel for browsing and managing memory facts.
 */

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, X, Search, Trash2, Plus } from 'lucide-react';
import { slideInRight } from './ui/animations';
import type { MemoryFact } from '@shared/types';

interface MemoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onAddFact?: (content: string) => void;
}

export default function MemoryPanel({ isOpen, onClose, onAddFact }: MemoryPanelProps): JSX.Element | null {
  const [facts, setFacts] = useState<MemoryFact[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [newFact, setNewFact] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const loadFacts = useCallback(async (p = 1) => {
    try {
      const result = await window.ghostAPI.memory.list(p);
      setFacts(result.facts);
      setTotal(result.total);
    } catch { /* ignore */ }
  }, []);

  const searchFacts = useCallback(async (q: string) => {
    if (!q.trim()) {
      loadFacts(1);
      return;
    }
    setIsSearching(true);
    try {
      const results = await window.ghostAPI.memory.search(q, 20);
      setFacts(results.map((r) => r.fact));
      setTotal(results.length);
    } finally {
      setIsSearching(false);
    }
  }, [loadFacts]);

  useEffect(() => {
    if (isOpen) {
      setPage(1);
      loadFacts(1);
    }
  }, [isOpen, loadFacts]);

  useEffect(() => {
    const delay = setTimeout(() => searchFacts(searchQuery), 300);
    return () => clearTimeout(delay);
  }, [searchQuery, searchFacts]);

  const handleDelete = useCallback(async (id: string) => {
    await window.ghostAPI.memory.delete(id);
    loadFacts(page);
  }, [page, loadFacts]);

  const handleAddFact = useCallback(async () => {
    if (!newFact.trim()) return;
    setIsAdding(true);
    try {
      await window.ghostAPI.memory.add(newFact.trim());
      setNewFact('');
      onAddFact?.(newFact.trim());
      loadFacts(1);
    } finally {
      setIsAdding(false);
    }
  }, [newFact, onAddFact, loadFacts]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="memory-panel"
          variants={slideInRight}
          initial="hidden"
          animate="visible"
          exit="hidden"
          className="absolute inset-y-0 right-0 w-72 bg-bg-header border-l border-border-subtle flex flex-col z-50 shadow-ghost-lg"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border-subtle shrink-0">
            <div className="flex items-center gap-2">
              <Brain size={14} strokeWidth={1.75} className="text-accent-primary" />
              <span className="text-xs font-medium text-text-primary">Memory</span>
              {total > 0 && (
                <span className="text-[10px] bg-accent-primary/10 text-accent-primary px-1.5 py-0.5 rounded-full">
                  {total}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-0.5 rounded hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors"
            >
              <X size={13} strokeWidth={1.75} />
            </button>
          </div>

          {/* Search */}
          <div className="px-2 py-2 border-b border-border-subtle shrink-0">
            <div className="relative">
              <Search size={11} strokeWidth={1.75} className="absolute left-2 top-1/2 -translate-y-1/2 text-text-placeholder" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search memory..."
                className="w-full bg-bg-input border border-border-subtle rounded pl-6 pr-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-placeholder focus:outline-none focus:border-border-focus transition-colors"
              />
            </div>
          </div>

          {/* Add new fact */}
          <div className="px-2 py-2 border-b border-border-subtle shrink-0">
            <div className="flex gap-1">
              <input
                type="text"
                value={newFact}
                onChange={(e) => setNewFact(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddFact()}
                placeholder="Add a fact..."
                className="flex-1 bg-bg-input border border-border-subtle rounded px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-placeholder focus:outline-none focus:border-border-focus transition-colors"
              />
              <button
                onClick={handleAddFact}
                disabled={!newFact.trim() || isAdding}
                className="p-1.5 rounded bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20 transition-colors disabled:opacity-50"
              >
                <Plus size={12} strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* Facts list */}
          <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1.5">
            {facts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <Brain size={24} strokeWidth={1.25} className="text-text-placeholder mb-2" />
                <p className="text-xs text-text-secondary">
                  {isSearching ? 'Searching...' : searchQuery ? 'No facts match' : 'No memories yet'}
                </p>
                {!searchQuery && (
                  <p className="text-[10px] text-text-placeholder mt-1">
                    Facts are added automatically during conversations
                  </p>
                )}
              </div>
            ) : (
              facts.map((fact) => (
                <div
                  key={fact.id}
                  className="group p-2.5 rounded-lg bg-surface-elevated border border-border-subtle hover:border-border-active/50 transition-colors"
                >
                  <p className="text-xs text-text-primary leading-relaxed">{fact.content}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] text-text-placeholder capitalize">{fact.source}</span>
                      <span className="text-[9px] text-text-placeholder">·</span>
                      <span className="text-[9px] text-text-placeholder">
                        {new Date(fact.extractedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDelete(fact.id)}
                      className="p-0.5 text-text-placeholder hover:text-status-error transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={10} strokeWidth={2} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {total > 20 && !searchQuery && (
            <div className="flex items-center justify-between px-3 py-2 border-t border-border-subtle shrink-0">
              <button
                onClick={() => { const p = Math.max(1, page - 1); setPage(p); loadFacts(p); }}
                disabled={page === 1}
                className="text-[10px] text-text-secondary hover:text-text-primary disabled:opacity-40 transition-colors"
              >
                ← Prev
              </button>
              <span className="text-[10px] text-text-placeholder">
                {page} / {Math.ceil(total / 20)}
              </span>
              <button
                onClick={() => { const p = page + 1; setPage(p); loadFacts(p); }}
                disabled={page >= Math.ceil(total / 20)}
                className="text-[10px] text-text-secondary hover:text-text-primary disabled:opacity-40 transition-colors"
              >
                Next →
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
