import { useState, useRef, useCallback, useEffect, type RefObject } from 'react';
import { Camera, Send, Square, X, Mic, MicOff } from 'lucide-react';
import { useToast } from './Toast';
import type { ImageAttachment } from '@shared/types';

const MAX_SCREENSHOTS = 3;

interface InputAreaProps {
  isStreaming: boolean;
  pendingScreenshots: ImageAttachment[];
  onSend: (text: string) => void;
  onStop: () => void;
  onCaptureScreen: () => void;
  onClearScreenshot: (index: number) => void;
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
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
  const [text, setText] = useState('');
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = externalInputRef || internalRef;
  const { showToast } = useToast();

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 100) + 'px';
  }, [text, textareaRef]);

  // Append NEW transcript text to the input without clearing the shared transcript state.
  // We track how much of the transcript we've already consumed via a ref.
  const consumedLenRef = useRef(0);

  useEffect(() => {
    if (transcript.length > consumedLenRef.current) {
      const newText = transcript.substring(consumedLenRef.current).trim();
      if (newText) {
        console.log('[InputArea] Consuming new transcript chunk:', newText.substring(0, 40));
        setText((prev) => (prev ? `${prev} ${newText}` : newText));
      }
      consumedLenRef.current = transcript.length;
    } else if (transcript.length < consumedLenRef.current) {
      // Transcript was cleared externally (e.g. TranscriptPanel clear button)
      consumedLenRef.current = transcript.length;
    }
  }, [transcript]);

  // Show mic errors via toast
  useEffect(() => {
    if (micError) {
      showToast('error', `Mic: ${micError}`);
    }
  }, [micError, showToast]);

  // Consume injected text from templates
  useEffect(() => {
    if (injectedText) {
      setText(injectedText);
      onInjectedTextConsumed?.();
      textareaRef.current?.focus();
    }
  }, [injectedText, onInjectedTextConsumed, textareaRef]);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed && pendingScreenshots.length === 0) return;
    if (isStreaming) return;
    if (isListening) onToggleMic();
    onSend(trimmed);
    setText('');
  }, [text, pendingScreenshots, isStreaming, isListening, onToggleMic, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const hasScreenshots = pendingScreenshots.length > 0;
  const atMaxScreenshots = pendingScreenshots.length >= MAX_SCREENSHOTS;

  return (
    <div className="border-t border-border-subtle bg-bg-overlay px-3 py-2 shrink-0">
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
        <button
          onClick={onCaptureScreen}
          disabled={isStreaming || atMaxScreenshots}
          className="p-1.5 rounded hover:bg-bg-hover text-text-secondary hover:text-text-primary disabled:opacity-50 transition-colors shrink-0 mb-0.5"
          title={atMaxScreenshots ? `Max ${MAX_SCREENSHOTS} screenshots` : 'Capture screen (Ctrl+Alt+S)'}
        >
          <Camera size={16} />
        </button>

        {/* Mic button */}
        {micAvailable && (
          <button
            onClick={onToggleMic}
            disabled={isStreaming}
            className={`p-1.5 rounded transition-colors shrink-0 mb-0.5 ${
              isListening
                ? 'bg-status-error/20 text-status-error'
                : 'hover:bg-bg-hover text-text-secondary hover:text-text-primary disabled:opacity-50'
            }`}
            style={isListening ? { animation: 'micPulse 1.5s ease-in-out infinite' } : undefined}
            title={isListening ? 'Stop listening' : 'Start voice input'}
          >
            {isListening ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
        )}

        {/* Text input */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isListening && interimTranscript ? interimTranscript : hasScreenshots ? 'Ask about these screenshots...' : 'Ask anything...'}
          rows={1}
          className="flex-1 bg-bg-input border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-placeholder resize-none focus:outline-none focus:border-border-focus transition-colors"
          style={{ minHeight: '36px', maxHeight: '100px' }}
        />

        {/* Send / Stop button */}
        {isStreaming ? (
          <button
            onClick={onStop}
            className="p-1.5 rounded bg-status-error hover:bg-status-error/80 text-white transition-colors shrink-0 mb-0.5"
            title="Stop generation"
          >
            <Square size={16} />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!text.trim() && !hasScreenshots}
            className="p-1.5 rounded bg-accent-primary hover:bg-accent-primary/80 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0 mb-0.5"
            title="Send (Enter)"
          >
            <Send size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
