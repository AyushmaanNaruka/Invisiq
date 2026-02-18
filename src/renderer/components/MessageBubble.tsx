import { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Copy, Check, AlertCircle } from 'lucide-react';
import CodeBlock from './CodeBlock';
import type { ChatMessage } from '@shared/types';

interface MessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
}

export default function MessageBubble({ message, isStreaming }: MessageBubbleProps): JSX.Element {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (): Promise<void> => {
    try {
      await window.ghostAPI.clipboard.copy(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  // Error messages
  if (message.role === 'error') {
    return (
      <div className="mx-3 my-2 animate-fadeIn">
        <div className="px-3 py-2 rounded-lg bg-status-error/15 border border-status-error/30">
          <div className="flex items-start gap-2">
            <AlertCircle size={14} className="text-status-error mt-0.5 shrink-0" />
            <p className="text-sm text-status-error">{message.content}</p>
          </div>
        </div>
      </div>
    );
  }

  // User messages
  if (message.role === 'user') {
    return (
      <div className="mx-3 my-2 flex justify-end animate-fadeIn">
        <div className="max-w-[85%]">
          {/* Screenshot thumbnail */}
          {message.images && message.images.length > 0 && (
            <div className="flex justify-end mb-1">
              {message.images.map((img, i) => (
                <img
                  key={i}
                  src={`data:${img.mimeType};base64,${img.data}`}
                  alt="Screenshot"
                  className="max-w-[120px] max-h-[80px] rounded border border-border-subtle object-cover"
                />
              ))}
            </div>
          )}
          <div className="px-3 py-2 rounded-lg bg-bubble-user text-text-primary text-sm whitespace-pre-wrap">
            {message.content}
          </div>
        </div>
      </div>
    );
  }

  // Assistant messages
  return (
    <div className="mx-3 my-2 animate-fadeIn">
      <div className="max-w-[95%]">
        <div className="px-3 py-2 rounded-lg bg-bubble-ai text-text-primary text-sm">
          <ReactMarkdown
            components={{
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
            }}
          >
            {message.content}
          </ReactMarkdown>

          {/* Streaming cursor */}
          {isStreaming && (
            <span className="inline-block w-2 h-4 bg-text-primary animate-blinkCursor ml-0.5" />
          )}
        </div>

        {/* Actions bar (only when not streaming and has content) */}
        {!isStreaming && message.content && (
          <div className="flex items-center gap-2 mt-1 px-1">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-[10px] text-text-secondary hover:text-text-primary transition-colors"
            >
              {copied ? (
                <>
                  <Check size={10} className="text-status-success" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={10} />
                  Copy
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
    </div>
  );
}
