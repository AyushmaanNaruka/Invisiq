/**
 * MeetingPanel — Phase 4 / Sprint 15
 *
 * Slide-in side panel for meeting mode:
 * - Live system audio transcript
 * - Detected questions with optional AI suggestions
 * - Toggle system audio capture
 */

import { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, MicOff, Radio, X, MessageSquare, Trash2, ChevronRight
} from 'lucide-react';
import { slideInRight } from './ui/animations';
import type { MeetingQuestion } from '@shared/types';

interface MeetingPanelProps {
  isOpen: boolean;
  isSystemAudioActive: boolean;
  liveTranscript: string;
  detectedQuestions: MeetingQuestion[];
  captureMethod: 'native' | 'powershell' | 'unavailable' | null;
  onClose: () => void;
  onStartCapture: () => Promise<void>;
  onStopCapture: () => Promise<void>;
  onClearTranscript: () => void;
  onDismissQuestion: (id: string) => void;
  onUseQuestion: (text: string) => void;
}

export default function MeetingPanel({
  isOpen,
  isSystemAudioActive,
  liveTranscript,
  detectedQuestions,
  captureMethod,
  onClose,
  onStartCapture,
  onStopCapture,
  onClearTranscript,
  onDismissQuestion,
  onUseQuestion,
}: MeetingPanelProps): JSX.Element | null {
  const handleToggleAudio = useCallback(() => {
    if (isSystemAudioActive) {
      onStopCapture();
    } else {
      onStartCapture();
    }
  }, [isSystemAudioActive, onStartCapture, onStopCapture]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="meeting-panel"
          variants={slideInRight}
          initial="hidden"
          animate="visible"
          exit="hidden"
          className="absolute inset-y-0 right-0 w-72 bg-bg-header border-l border-border-subtle flex flex-col z-50 shadow-ghost-lg"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border-subtle shrink-0">
            <div className="flex items-center gap-2">
              <Radio size={14} strokeWidth={1.75} className="text-accent-primary" />
              <span className="text-xs font-medium text-text-primary">Meeting Assistant</span>
            </div>
            <button
              onClick={onClose}
              className="p-0.5 rounded hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors"
            >
              <X size={13} strokeWidth={1.75} />
            </button>
          </div>

          {/* System audio control */}
          <div className="px-3 py-2 border-b border-border-subtle shrink-0">
            <button
              onClick={handleToggleAudio}
              className={`w-full flex items-center justify-center gap-2 py-1.5 rounded text-xs font-medium transition-colors ${
                isSystemAudioActive
                  ? 'bg-status-error/10 text-status-error hover:bg-status-error/20 border border-status-error/20'
                  : 'bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20 border border-accent-primary/20'
              }`}
            >
              {isSystemAudioActive ? (
                <>
                  <MicOff size={13} strokeWidth={1.75} />
                  Stop Listening
                </>
              ) : (
                <>
                  <Mic size={13} strokeWidth={1.75} />
                  Start System Audio
                </>
              )}
            </button>
            {captureMethod && (
              <p className="text-center text-[10px] text-text-placeholder mt-1">
                Method: {captureMethod}
              </p>
            )}
          </div>

          {/* Detected questions */}
          {detectedQuestions.length > 0 && (
            <div className="shrink-0">
              <div className="px-3 py-1.5 flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-text-placeholder">
                  Detected Questions
                </span>
              </div>
              <div className="max-h-40 overflow-y-auto px-2 pb-1 space-y-1">
                {detectedQuestions.slice(0, 5).map((q) => (
                  <div
                    key={q.id}
                    className="bg-surface-elevated rounded p-2 border border-border-subtle group"
                  >
                    <p className="text-xs text-text-primary line-clamp-2 mb-1.5">{q.text}</p>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onUseQuestion(q.text)}
                        className="flex items-center gap-1 text-[10px] text-accent-primary hover:text-accent-primary/80 transition-colors"
                      >
                        <ChevronRight size={10} strokeWidth={2} />
                        Use as prompt
                      </button>
                      <div className="flex-1" />
                      <button
                        onClick={() => onDismissQuestion(q.id)}
                        className="p-0.5 text-text-placeholder hover:text-status-error transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <X size={10} strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Live transcript */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="px-3 py-1.5 flex items-center justify-between border-t border-border-subtle">
              <div className="flex items-center gap-1.5">
                <MessageSquare size={11} strokeWidth={1.75} className="text-text-placeholder" />
                <span className="text-[10px] uppercase tracking-wider text-text-placeholder">
                  Live Transcript
                </span>
              </div>
              {liveTranscript && (
                <button
                  onClick={onClearTranscript}
                  className="p-0.5 text-text-placeholder hover:text-status-error transition-colors"
                >
                  <Trash2 size={11} strokeWidth={1.75} />
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-3">
              {liveTranscript ? (
                <p className="text-xs text-text-secondary whitespace-pre-wrap leading-relaxed">
                  {liveTranscript}
                </p>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-[11px] text-text-placeholder text-center">
                    {isSystemAudioActive
                      ? 'Listening for audio...'
                      : 'Start system audio to see live transcript'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
