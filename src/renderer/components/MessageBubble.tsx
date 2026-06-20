import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import { Copy, Check, CircleAlert, ClipboardPaste, LoaderCircle } from 'lucide-react';
import CodeBlock from './CodeBlock';
import { useToast } from './Toast';
import { fadeInUp, iconSwap } from './ui/animations';
import type { ChatMessage } from '@shared/types';

interface MessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
}

type ContentSegment = { type: 'think' | 'answer'; text: string };

/**
 * Split assistant content into reasoning (<think>…</think>) and answer segments.
 * Reasoning models stream <think> blocks live; we render them dimmed. An unclosed
 * <think> (mid-stream) means everything after it is still-arriving reasoning.
 */
function parseThinkSegments(content: string): ContentSegment[] {
  const segments: ContentSegment[] = [];
  let remaining = content;
  while (remaining.length > 0) {
    const openIdx = remaining.indexOf('<think>');
    if (openIdx === -1) {
      segments.push({ type: 'answer', text: remaining });
      break;
    }
    if (openIdx > 0) segments.push({ type: 'answer', text: remaining.slice(0, openIdx) });
    remaining = remaining.slice(openIdx + '<think>'.length);
    const closeIdx = remaining.indexOf('</think>');
    if (closeIdx === -1) {
      segments.push({ type: 'think', text: remaining });
      break;
    }
    segments.push({ type: 'think', text: remaining.slice(0, closeIdx) });
    remaining = remaining.slice(closeIdx + '</think>'.length);
  }
  return segments.filter((s) => s.text.trim().length > 0);
}

export default function MessageBubble({ message, isStreaming }: MessageBubbleProps): JSX.Element {
  const [copied, setCopied] = useState(false);
  const [pasting, setPasting] = useState(false);
  const { showToast } = useToast();

  const handleCopy = async (): Promise<void> => {
    try {
      await window.ghostAPI.clipboard.copy(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('error', 'Copy failed');
    }
  };

  const handlePaste = async (): Promise<void> => {
    if (pasting) return;
    setPasting(true);
    try {
      const result = await window.ghostAPI.clipboard.smartPaste(message.content);
      if (result.success) {
        showToast('success', 'Pasted to active app');
      } else {
        showToast('error', result.error || 'Paste failed');
      }
    } catch {
      showToast('error', 'Paste failed');
    } finally {
      setPasting(false);
    }
  };

  // Stable components reference — prevents ReactMarkdown from
  // unmounting/remounting child components on every streaming token.
  // MUST be above all conditional returns to satisfy Rules of Hooks.
  const mdComponents = useMemo<Components>(
    () => ({
      code({ className, children, ...props }) {
        const match = /language-(\w+)/.exec(className || '');
        const codeStr = String(children).replace(/\n$/, '');
        if (match) {
          return <CodeBlock code={codeStr} language={match[1]} />;
        }
        return (
          <code
            className="bg-bg-code px-1 py-0.5 rounded text-xs font-mono text-text-code"
            {...props}
          >
            {children}
          </code>
        );
      },
      a({ href, children }) {
        return (
          <a
            href={href}
            className="text-accent-blue hover:underline"
            onClick={(e) => {
              e.preventDefault();
              if (href) window.open(href, '_blank');
            }}
          >
            {children}
          </a>
        );
      },
      p({ children }) {
        return <p className="mb-2 last:mb-0">{children}</p>;
      },
      ul({ children }) {
        return <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>;
      },
      ol({ children }) {
        return <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>;
      },
      h1({ children }) {
        return <h1 className="text-lg font-bold mb-2">{children}</h1>;
      },
      h2({ children }) {
        return <h2 className="text-md font-bold mb-2">{children}</h2>;
      },
      h3({ children }) {
        return <h3 className="text-sm font-bold mb-1">{children}</h3>;
      },
      blockquote({ children }) {
        return (
          <blockquote className="border-l-2 border-accent-primary pl-3 my-2 text-text-secondary">
            {children}
          </blockquote>
        );
      },
    }),
    []
  );

  // Split reasoning (<think>) from answer. Memoized so streaming tokens don't thrash.
  const segments = useMemo(() => parseThinkSegments(message.content), [message.content]);

  // Error messages
  if (message.role === 'error') {
    return (
      <motion.div
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        className="mx-3 my-2"
      >
        <div className="px-3 py-2 rounded-lg bg-status-error/15 border border-status-error/30">
          <div className="flex items-start gap-2">
            <CircleAlert size={14} strokeWidth={1.75} className="text-status-error mt-0.5 shrink-0" />
            <p className="text-sm text-status-error">{message.content}</p>
          </div>
        </div>
      </motion.div>
    );
  }

  // User messages
  if (message.role === 'user') {
    return (
      <motion.div
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        className="mx-3 my-2 flex justify-end"
      >
        <div className="max-w-[85%]">
          {/* Screenshot thumbnails */}
          {message.images && message.images.length > 0 && (
            <div className="flex justify-end gap-1 mb-1">
              {message.images.map((img, i) => (
                <img
                  key={i}
                  src={`data:${img.mimeType};base64,${img.data}`}
                  alt="Screenshot"
                  className="max-w-[120px] max-h-[80px] rounded-md border border-border-subtle object-cover"
                />
              ))}
            </div>
          )}
          <div className="px-3 py-2 rounded-lg bg-bubble-user text-text-primary text-sm whitespace-pre-wrap">
            {message.content}
          </div>
        </div>
      </motion.div>
    );
  }

  // Assistant messages
  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      className="mx-3 my-2"
    >
      <div className="max-w-[95%]">
        <div className="px-3 py-2 rounded-lg bg-bubble-ai border border-border-subtle/50 text-text-primary text-sm">
          {segments.map((seg, i) =>
            seg.type === 'think' ? (
              <div
                key={`think-${i}`}
                className="mb-2 px-2 py-1.5 rounded border-l-2 border-accent-primary/40 bg-bg-input/40 text-text-secondary text-xs italic max-h-40 overflow-y-auto whitespace-pre-wrap"
              >
                <span className="not-italic font-medium text-accent-primary/80">💭 Reasoning</span>
                {'\n'}
                {seg.text.trim()}
              </div>
            ) : (
              <ReactMarkdown key={`ans-${i}`} components={mdComponents}>
                {seg.text}
              </ReactMarkdown>
            )
          )}

          {/* Streaming cursor */}
          {isStreaming && <span className="streaming-cursor" />}
        </div>

        {/* Actions bar (only when not streaming and has content) */}
        {!isStreaming && message.content && (
          <div className="flex items-center gap-2 mt-1 px-1">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-[10px] text-text-secondary hover:text-text-primary transition-colors"
            >
              <AnimatePresence mode="wait" initial={false}>
                {copied ? (
                  <motion.span
                    key="check"
                    variants={iconSwap}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="flex items-center gap-1 text-status-success"
                  >
                    <Check size={10} strokeWidth={1.75} />
                    Copied!
                  </motion.span>
                ) : (
                  <motion.span
                    key="copy"
                    variants={iconSwap}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="flex items-center gap-1"
                  >
                    <Copy size={10} strokeWidth={1.75} />
                    Copy
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
            <button
              onClick={handlePaste}
              disabled={pasting}
              className="flex items-center gap-1 text-[10px] text-text-secondary hover:text-text-primary disabled:opacity-50 transition-colors"
            >
              {pasting ? (
                <>
                  <LoaderCircle size={10} strokeWidth={1.75} className="animate-spin" />
                  Pasting...
                </>
              ) : (
                <>
                  <ClipboardPaste size={10} strokeWidth={1.75} />
                  Paste
                </>
              )}
            </button>
            {message.usage && (
              <span className="text-[10px] text-text-placeholder">
                {message.usage.totalTokens} tokens
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
