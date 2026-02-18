import { useEffect, useRef, useCallback, memo } from 'react';
import MessageBubble from './MessageBubble';
import type { ChatMessage } from '@shared/types';

interface ChatPanelProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingMessageId: string | null;
}

const MemoizedMessageBubble = memo(MessageBubble);

export default function ChatPanel({ messages, isStreaming, streamingMessageId }: ChatPanelProps): JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isUserScrolledUp = useRef(false);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current && !isUserScrolledUp.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  // Auto-scroll on new messages and during streaming
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    isUserScrolledUp.current = scrollHeight - scrollTop - clientHeight > 50;
  }, []);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-bg-chat">
        <div className="text-center px-6">
          <div className="text-4xl mb-3">👻</div>
          <h1 className="text-text-primary text-lg font-semibold mb-2">GhostAI</h1>
          <p className="text-text-secondary text-xs mb-4">
            Your invisible AI assistant
          </p>
          <div className="space-y-1.5 text-text-placeholder text-xs">
            <p>Ctrl+Shift+G &mdash; Toggle overlay</p>
            <p>Ctrl+Shift+S &mdash; Capture screen</p>
            <p>Ctrl+Shift+R &mdash; Capture region</p>
            <p>Escape &mdash; Hide overlay</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto bg-bg-chat py-2"
    >
      {messages.map((msg) => (
        <MemoizedMessageBubble
          key={msg.id}
          message={msg}
          isStreaming={isStreaming && msg.id === streamingMessageId}
        />
      ))}

      {/* Streaming indicator (pulsing dots) */}
      {isStreaming && messages[messages.length - 1]?.role === 'user' && (
        <div className="mx-3 my-2">
          <div className="inline-flex gap-1 px-3 py-2 rounded-lg bg-bubble-ai">
            <div className="w-1.5 h-1.5 rounded-full bg-text-secondary animate-pulsingDot" />
            <div className="w-1.5 h-1.5 rounded-full bg-text-secondary animate-pulsingDot" style={{ animationDelay: '200ms' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-text-secondary animate-pulsingDot" style={{ animationDelay: '400ms' }} />
          </div>
        </div>
      )}
    </div>
  );
}
