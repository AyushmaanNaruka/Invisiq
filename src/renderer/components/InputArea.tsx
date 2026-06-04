import { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react';
import { Camera, Send, Square, X, Mic, MicOff, Keyboard, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useToast } from './Toast';
import { GhostTooltip } from './ui/GhostTooltip';
import { useCapture } from '../hooks/useCapture';
import type { ImageAttachment, CaptureKeyKind } from '@shared/types';

const MAX_SCREENSHOTS = 3;

interface InputAreaProps {
  isStreaming: boolean;
  pendingScreenshots: ImageAttachment[];
  onSend: (text: string) => void;
  onStop: () => void;
  onCaptureScreen: () => void;
  onClearScreenshot: (index: number) => void;
  inputRef?: React.RefObject<HTMLTextAreaElement>;
  // Audio props (lifted from useAudioTranscription hook)
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  micAvailable: boolean;
  micError: string | null;
  onToggleMic: () => void;
  // Template injection (external text to fill into the input)
  injectedText?: string | null;
  onInjectedTextConsumed?: () => void;
}

export default function InputArea({
  isStreaming,
  pendingScreenshots,
  onSend,
  onStop,
  onCaptureScreen,
  onClearScreenshot,
  inputRef: externalInputRef,
  isListening,
  transcript,
  interimTranscript,
  micAvailable,
  micError,
  onToggleMic,
  injectedText,
  onInjectedTextConsumed,
}: InputAreaProps): JSX.Element {
  // Cursor-aware input model: in stealth capture the textarea never holds real
  // OS focus, so the DOM caret is meaningless — we are the source of truth for
  // both the value and the caret position.
  // Single source of truth: value + caret held together so updates stay pure
  // (no nested setState). In stealth capture the textarea never holds real OS
  // focus, so the DOM caret is meaningless — this model drives everything.
  const [model, setModel] = useState<{ value: string; caret: number }>({ value: '', caret: 0 });
  const text = model.value;
  const caret = model.caret;
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = externalInputRef || internalRef;
  const { showToast } = useToast();

  // ── Central text editing (used by both normal typing and capture keys) ──
  const setValue = useCallback((value: string, nextCaret?: number) => {
    setModel({ value, caret: Math.max(0, Math.min(nextCaret ?? value.length, value.length)) });
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 100) + 'px';
  }, [text, textareaRef]);

  // Append NEW transcript text to the input (caret jumps to end).
  const consumedLenRef = useRef(0);
  useEffect(() => {
    if (transcript.length > consumedLenRef.current) {
      const newText = transcript.substring(consumedLenRef.current).trim();
      if (newText) {
        setModel((prev) => {
          const merged = prev.value ? `${prev.value} ${newText}` : newText;
          return { value: merged, caret: merged.length };
        });
      }
      consumedLenRef.current = transcript.length;
    } else if (transcript.length < consumedLenRef.current) {
      consumedLenRef.current = transcript.length;
    }
  }, [transcript]);

  // Show mic errors via toast
  useEffect(() => {
    if (micError) showToast('error', `Mic: ${micError}`);
  }, [micError, showToast]);

  // Consume injected text from templates
  useEffect(() => {
    if (injectedText) {
      setValue(injectedText);
      onInjectedTextConsumed?.();
      textareaRef.current?.focus();
    }
  }, [injectedText, onInjectedTextConsumed, textareaRef, setValue]);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed && pendingScreenshots.length === 0) return;
    if (isStreaming) return;
    if (isListening) onToggleMic();
    onSend(trimmed);
    setValue('', 0);
  }, [text, pendingScreenshots, isStreaming, isListening, onToggleMic, onSend, setValue]);

  // ── Stealth capture (keystrokes forwarded from the suppressing helper hook) ──
  // Apply each key against the PREVIOUS model state at the tracked caret — never
  // reading the DOM caret (the element has no OS focus in stealth).
  const handleSendRef = useRef(handleSend);
  useEffect(() => {
    handleSendRef.current = handleSend;
  }, [handleSend]);

  const onCaptureKey = useCallback((kind: CaptureKeyKind, char?: string) => {
    if (kind === 'enter') {
      handleSendRef.current();
      return;
    }
    // Pure reducer over the combined {value, caret} model — no nested setState.
    setModel((prev) => {
      const value = prev.value;
      const pos = Math.max(0, Math.min(prev.caret, value.length));
      switch (kind) {
        case 'char':
          if (!char) return prev;
          return { value: value.slice(0, pos) + char + value.slice(pos), caret: pos + char.length };
        case 'backspace':
          return pos > 0 ? { value: value.slice(0, pos - 1) + value.slice(pos), caret: pos - 1 } : prev;
        case 'delete':
          return { value: value.slice(0, pos) + value.slice(pos + 1), caret: pos };
        case 'left':
          return { value, caret: Math.max(0, pos - 1) };
        case 'right':
          return { value, caret: Math.min(value.length, pos + 1) };
        case 'home':
          return { value, caret: 0 };
        case 'end':
          return { value, caret: value.length };
        default:
          return prev;
      }
    });
  }, []);

  const capture = useCapture(onCaptureKey);

  // Keep the DOM selection in sync with our model caret so that, when a caret is
  // rendered, it sits in the right place after each programmatic edit.
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (el && document.activeElement === el) {
      try {
        el.setSelectionRange(caret, caret);
      } catch {
        /* selection not supported in this state */
      }
    }
  }, [caret, text, textareaRef]);

  // When capture activates (e.g. via the focus-input hotkey), DOM-focus the
  // textarea. This does NOT activate the OS window (it stays WS_EX_NOACTIVATE) —
  // it only encourages caret rendering and routes normal typing here too.
  useEffect(() => {
    if (capture.active) textareaRef.current?.focus();
  }, [capture.active, textareaRef]);

  // Warn once when capture degrades to the leaky uiohook tier.
  const warnedTierRef = useRef<string>('');
  useEffect(() => {
    if (capture.tier === 'uiohook' && warnedTierRef.current !== 'uiohook') {
      warnedTierRef.current = 'uiohook';
      showToast(
        'info',
        'Stealth helper unavailable — using fallback capture. Click an inert area of the focused app first to avoid key leaks.'
      );
    } else if (capture.tier !== 'uiohook') {
      warnedTierRef.current = capture.tier;
    }
  }, [capture.tier, showToast]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleToggleCapture = useCallback(async () => {
    await capture.toggle();
  }, [capture]);

  const hasScreenshots = pendingScreenshots.length > 0;
  const atMaxScreenshots = pendingScreenshots.length >= MAX_SCREENSHOTS;

  return (
    <div className="border-t border-border-subtle bg-bg-overlay px-3 py-2 shrink-0">
      {/* Proctor confirmation badge — confirmation only, never a trigger. */}
      {capture.proctor.detected && (
        <div className="mb-2 flex items-center gap-1.5 text-xs text-accent-primary">
          <ShieldCheck size={12} />
          <span>Monitored app detected — you're invisible</span>
        </div>
      )}

      {/* Screenshot previews */}
      {hasScreenshots && (
        <div className="mb-2 flex items-start gap-2">
          {pendingScreenshots.map((screenshot, index) => (
            <div key={index} className="relative">
              <img
                src={`data:${screenshot.mimeType};base64,${screenshot.data}`}
                alt={`Screenshot ${index + 1}`}
                className="w-16 h-12 rounded border border-border-subtle object-cover"
              />
              <button
                onClick={() => onClearScreenshot(index)}
                className="absolute -top-1 -right-1 w-4 h-4 bg-status-error rounded-full flex items-center justify-center"
              >
                <X size={8} className="text-white" />
              </button>
            </div>
          ))}
          <span className="text-text-secondary text-xs mt-1">
            {pendingScreenshots.length}/{MAX_SCREENSHOTS}
          </span>
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2">
        {/* Screenshot button */}
        <GhostTooltip
          content={atMaxScreenshots ? `Max ${MAX_SCREENSHOTS} screenshots` : 'Capture screen (Ctrl+Alt+S)'}
          placement="top"
        >
          <button
            onClick={onCaptureScreen}
            disabled={isStreaming || atMaxScreenshots}
            className="p-1.5 rounded hover:bg-bg-hover text-text-secondary hover:text-text-primary disabled:opacity-50 transition-colors shrink-0 mb-0.5"
          >
            <Camera size={16} />
          </button>
        </GhostTooltip>

        {/* Mic button */}
        {micAvailable && (
          <GhostTooltip content={isListening ? 'Stop listening' : 'Start voice input'} placement="top">
            <button
              onClick={onToggleMic}
              disabled={isStreaming}
              className={`p-1.5 rounded transition-colors shrink-0 mb-0.5 ${
                isListening
                  ? 'bg-status-error/20 text-status-error'
                  : 'hover:bg-bg-hover text-text-secondary hover:text-text-primary disabled:opacity-50'
              }`}
              style={isListening ? { animation: 'micPulse 1.5s ease-in-out infinite' } : undefined}
            >
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          </GhostTooltip>
        )}

        {/* Stealth capture toggle */}
        <GhostTooltip
          content={
            capture.active
              ? `Stealth typing ON (${capture.tier}) — Ctrl+Shift+I to stop`
              : 'Start stealth typing (Ctrl+Shift+I) — type without focus'
          }
          placement="top"
        >
          <button
            onClick={handleToggleCapture}
            className={`p-1.5 rounded transition-colors shrink-0 mb-0.5 ${
              capture.active
                ? capture.degraded
                  ? 'bg-status-error/20 text-status-error'
                  : 'bg-accent-primary/20 text-accent-primary'
                : 'hover:bg-bg-hover text-text-secondary hover:text-text-primary'
            }`}
            style={capture.active && !capture.degraded ? { animation: 'micPulse 1.5s ease-in-out infinite' } : undefined}
          >
            {capture.degraded ? <AlertTriangle size={16} /> : <Keyboard size={16} />}
          </button>
        </GhostTooltip>

        {/* Text input */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setValue(e.target.value, e.target.selectionStart ?? e.target.value.length)}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (!capture.active) void capture.enter(); }}
          placeholder={
            capture.active
              ? 'Stealth typing — type anywhere…'
              : isListening && interimTranscript
              ? interimTranscript
              : hasScreenshots
              ? 'Ask about these screenshots...'
              : 'Ask anything...'
          }
          rows={1}
          className={`flex-1 bg-bg-input border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-placeholder resize-none focus:outline-none transition-colors ${
            capture.active
              ? capture.degraded
                ? 'border-status-error ring-1 ring-status-error/40'
                : 'border-accent-primary ring-1 ring-accent-primary/40'
              : 'border-border-subtle focus:border-border-focus'
          }`}
          style={{ minHeight: '36px', maxHeight: '100px' }}
        />

        {/* Send / Stop button */}
        {isStreaming ? (
          <GhostTooltip content="Stop generation" placement="top">
            <button
              onClick={onStop}
              className="p-1.5 rounded bg-status-error hover:bg-status-error/80 text-white transition-colors shrink-0 mb-0.5"
            >
              <Square size={16} />
            </button>
          </GhostTooltip>
        ) : (
          <GhostTooltip content="Send (Enter)" placement="top">
            <button
              onClick={handleSend}
              disabled={!text.trim() && !hasScreenshots}
              className="p-1.5 rounded bg-accent-primary hover:bg-accent-primary/80 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0 mb-0.5"
            >
              <Send size={16} />
            </button>
          </GhostTooltip>
        )}
      </div>
    </div>
  );
}
