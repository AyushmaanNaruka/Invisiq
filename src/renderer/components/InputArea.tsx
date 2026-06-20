import { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react';
import { Camera, Send, Square, X, Mic, MicOff, Keyboard, ShieldCheck, AlertTriangle, ClipboardPaste, Copy, Trash2 } from 'lucide-react';
import { useToast } from './Toast';
import { GhostTooltip } from './ui/GhostTooltip';
import { useCapture } from '../hooks/useCapture';
import type { ImageAttachment, CaptureKeyKind } from '@shared/types';
import { CAPTURE_MOD_SHIFT, CAPTURE_MOD_CTRL } from '@shared/types';

const MAX_SCREENSHOTS = 3;

// ── Renderer-owned editing model for stealth capture ─────────────────────────
// value + caret (active end of the selection) + anchor (fixed end). There is a
// selection iff caret !== anchor. In stealth the textarea has no real OS focus,
// so this — not the DOM — is the source of truth for text, caret, and selection.
interface InputModel {
  value: string;
  caret: number;
  anchor: number;
}

const isWordChar = (c: string): boolean => /[\w]/.test(c);

/** Previous word boundary left of pos: skip trailing spaces, then the word. */
function wordLeft(v: string, pos: number): number {
  let i = pos;
  while (i > 0 && !isWordChar(v[i - 1])) i--;
  while (i > 0 && isWordChar(v[i - 1])) i--;
  return i;
}
/** Next word boundary right of pos: skip spaces, then the word. */
function wordRight(v: string, pos: number): number {
  let i = pos;
  const n = v.length;
  while (i < n && !isWordChar(v[i])) i++;
  while (i < n && isWordChar(v[i])) i++;
  return i;
}

/**
 * Pure reducer: apply one helper-forwarded key (with its modifier bits) against
 * the previous model. Shift extends the selection (anchor stays put); Ctrl moves
 * / deletes by word; an edit with a live selection replaces or removes it
 * (this is what makes range-select + Backspace a bulk delete).
 */
function applyCaptureKey(
  prev: InputModel,
  kind: CaptureKeyKind,
  char: string | undefined,
  mods: number
): InputModel {
  const shift = (mods & CAPTURE_MOD_SHIFT) !== 0;
  const ctrl = (mods & CAPTURE_MOD_CTRL) !== 0;
  const v = prev.value;
  const len = v.length;
  const clamp = (n: number): number => Math.max(0, Math.min(n, len));
  const caret = clamp(prev.caret);
  const anchor = clamp(prev.anchor);
  const lo = Math.min(caret, anchor);
  const hi = Math.max(caret, anchor);
  const hasSel = lo !== hi;
  // Move the active end; Shift keeps the anchor (extend), otherwise collapse.
  const move = (to: number): InputModel => {
    const c = clamp(to);
    return { value: v, caret: c, anchor: shift ? anchor : c };
  };

  switch (kind) {
    case 'char': {
      if (!char) return prev;
      const nv = v.slice(0, lo) + char + v.slice(hi);
      const c = lo + char.length;
      return { value: nv, caret: c, anchor: c };
    }
    case 'backspace': {
      if (hasSel) return { value: v.slice(0, lo) + v.slice(hi), caret: lo, anchor: lo };
      const start = ctrl ? wordLeft(v, caret) : Math.max(0, caret - 1);
      if (start === caret) return prev;
      return { value: v.slice(0, start) + v.slice(caret), caret: start, anchor: start };
    }
    case 'delete': {
      if (hasSel) return { value: v.slice(0, lo) + v.slice(hi), caret: lo, anchor: lo };
      const end = ctrl ? wordRight(v, caret) : Math.min(len, caret + 1);
      if (end === caret) return prev;
      return { value: v.slice(0, caret) + v.slice(end), caret, anchor: caret };
    }
    case 'left':
      if (hasSel && !shift && !ctrl) return move(lo); // collapse to left edge
      return move(ctrl ? wordLeft(v, caret) : caret - 1);
    case 'right':
      if (hasSel && !shift && !ctrl) return move(hi); // collapse to right edge
      return move(ctrl ? wordRight(v, caret) : caret + 1);
    case 'home':
      return move(0);
    case 'end':
      return move(len);
    default:
      return prev;
  }
}

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
  // Single source of truth: value + caret (active end) + anchor (fixed end of a
  // selection), held together so updates stay pure. In stealth capture the
  // textarea never holds real OS focus, so the DOM caret is meaningless — this
  // model drives everything, including selection (see applyCaptureKey).
  const [model, setModel] = useState<InputModel>({ value: '', caret: 0, anchor: 0 });
  const text = model.value;
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = externalInputRef || internalRef;
  const { showToast } = useToast();

  // ── Central text editing (used by both normal typing and capture keys) ──
  // Collapses any selection at the new caret (anchor === caret).
  const setValue = useCallback((value: string, nextCaret?: number) => {
    const c = Math.max(0, Math.min(nextCaret ?? value.length, value.length));
    setModel({ value, caret: c, anchor: c });
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
          return { value: merged, caret: merged.length, anchor: merged.length };
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

  const onCaptureKey = useCallback((kind: CaptureKeyKind, char?: string, mods = 0) => {
    if (kind === 'enter') {
      // Shift+Enter inserts a newline (replacing any selection); plain Enter sends.
      if (mods & CAPTURE_MOD_SHIFT) {
        setModel((prev) => applyCaptureKey(prev, 'char', '\n', 0));
      } else {
        handleSendRef.current();
      }
      return;
    }
    setModel((prev) => applyCaptureKey(prev, kind, char, mods));
  }, []);

  // ── Paste into the renderer-owned model ──
  // In stealth the overlay is never the foreground window, so neither a DOM paste
  // event nor a passed-through Ctrl+V ever reaches this textarea. We read the
  // clipboard through IPC and splice it in at the tracked caret ourselves. Driven
  // by both the Paste button (mouse — safe on a NOACTIVATE window) and a global
  // Ctrl+V that main forwards as 'capture:paste' while capture is active.
  const pasteFromClipboard = useCallback(async () => {
    try {
      const res = await window.ghostAPI.clipboard.read();
      const clip = res?.text;
      if (!clip) return;
      // Reuse the char reducer so the paste replaces any active selection.
      setModel((prev) => applyCaptureKey(prev, 'char', clip, 0));
    } catch {
      showToast('error', 'Could not read clipboard');
    }
  }, [showToast]);

  // Copy the current selection (or the whole input if nothing is selected) to the
  // clipboard. A mouse click on the overlay is safe — it never activates the
  // WS_EX_NOACTIVATE window — so this works even while Ctrl+C stays with the
  // foreground app (the copy-the-question-off-screen flow).
  const copyInput = useCallback(async () => {
    const lo = Math.min(model.caret, model.anchor);
    const hi = Math.max(model.caret, model.anchor);
    const toCopy = lo !== hi ? model.value.slice(lo, hi) : model.value;
    if (!toCopy) return;
    try {
      await window.ghostAPI.clipboard.copy(toCopy);
      showToast('success', lo !== hi ? 'Selection copied' : 'Copied');
    } catch {
      showToast('error', 'Copy failed');
    }
  }, [model, showToast]);

  // Bulk delete: wipe the whole field in one action.
  const clearInput = useCallback(() => {
    setModel({ value: '', caret: 0, anchor: 0 });
  }, []);

  const capture = useCapture(onCaptureKey, pasteFromClipboard);

  // Keep the DOM selection in sync with our model so the rendered caret AND the
  // highlighted selection match after every programmatic edit. Direction is set
  // so Shift-extending leftward shows the selection growing the right way.
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (el && document.activeElement === el) {
      try {
        const start = Math.min(model.caret, model.anchor);
        const end = Math.max(model.caret, model.anchor);
        el.setSelectionRange(start, end, model.caret < model.anchor ? 'backward' : 'forward');
      } catch {
        /* selection not supported in this state */
      }
    }
  }, [model, textareaRef]);

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

      {/* Armed banner — when stealth typing is ON, every keystroke is routed here
          (and withheld from the app you're looking at). This is easy to forget if
          your eyes are elsewhere, so make it loud + give the one-key way out. */}
      {capture.active && (
        <button
          type="button"
          onClick={() => void capture.exit()}
          className={`mb-2 flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
            capture.degraded
              ? 'bg-status-error/15 text-status-error hover:bg-status-error/25'
              : 'bg-accent-primary/15 text-accent-primary hover:bg-accent-primary/25'
          }`}
        >
          <span className="flex items-center gap-1.5">
            {capture.degraded ? <AlertTriangle size={12} /> : <Keyboard size={12} />}
            <span className="font-medium">
              Stealth typing is ON — keystrokes go to InvisiQ, not the app behind it
            </span>
          </span>
          <span className="shrink-0 opacity-80">Esc / click to release</span>
        </button>
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
          content={atMaxScreenshots ? `Max ${MAX_SCREENSHOTS} screenshots` : 'Capture screen (Ctrl+Shift+S)'}
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

        {/* Paste from clipboard — in stealth the window is never foreground, so
            browser-native Ctrl+V can't reach the input; this reads the clipboard
            via IPC and inserts at the caret. (Ctrl+V also works during capture.) */}
        <GhostTooltip content="Paste from clipboard (Ctrl+V while stealth typing)" placement="top">
          <button
            onMouseDown={(e) => e.preventDefault()} // keep textarea focus (caret stays live)
            onClick={() => void pasteFromClipboard()}
            disabled={isStreaming}
            className="p-1.5 rounded hover:bg-bg-hover text-text-secondary hover:text-text-primary disabled:opacity-50 transition-colors shrink-0 mb-0.5"
          >
            <ClipboardPaste size={16} />
          </button>
        </GhostTooltip>

        {/* Copy + Clear — only when there's text. Keyboard Ctrl+C/Ctrl+X stay with
            the foreground app (so you can copy a question off-screen); these give
            an in-overlay way to copy the draft or bulk-delete the whole field. */}
        {text.length > 0 && (
          <>
            <GhostTooltip content="Copy input (selection, else all)" placement="top">
              <button
                onMouseDown={(e) => e.preventDefault()} // keep textarea focus (caret stays live)
                onClick={() => void copyInput()}
                className="p-1.5 rounded hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors shrink-0 mb-0.5"
              >
                <Copy size={16} />
              </button>
            </GhostTooltip>
            <GhostTooltip content="Clear input" placement="top">
              <button
                onMouseDown={(e) => e.preventDefault()} // keep textarea focus (caret stays live)
                onClick={clearInput}
                disabled={isStreaming}
                className="p-1.5 rounded hover:bg-bg-hover text-text-secondary hover:text-status-error disabled:opacity-50 transition-colors shrink-0 mb-0.5"
              >
                <Trash2 size={16} />
              </button>
            </GhostTooltip>
          </>
        )}

        {/* Text input */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setValue(e.target.value, e.target.selectionStart ?? e.target.value.length)}
          onSelect={(e) => {
            // In focusable (non-stealth) mode the user can mouse/keyboard-select
            // natively; mirror that into our model so Copy/Clear act on it. In
            // stealth the helper drives selection and WE set the DOM range, so
            // skip to avoid a feedback loop.
            if (capture.active) return;
            const t = e.currentTarget;
            const s = t.selectionStart ?? 0;
            const en = t.selectionEnd ?? s;
            setModel((prev) => (prev.anchor === s && prev.caret === en ? prev : { value: prev.value, anchor: s, caret: en }));
          }}
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
