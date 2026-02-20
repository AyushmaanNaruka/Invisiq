import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Ghost } from 'lucide-react';
import MessageBubble from './MessageBubble';
import { fadeInUp } from './ui/animations';
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
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current && !isUserScrolledUp.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    isUserScrolledUp.current = scrollHeight - scrollTop - clientHeight > 50;
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (messages.length === 0) return;

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(0, (prev === -1 ? messages.length - 1 : prev - 1)));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((prev) => (prev >= messages.length - 1 ? -1 : prev + 1));
      } else if (e.key === 'Escape') {
        setFocusedIndex(-1);
      }
    },
    [messages.length]
  );

  useEffect(() => {
    if (focusedIndex >= 0 && scrollRef.current) {
      const children = scrollRef.current.children;
      if (children[focusedIndex]) {
        children[focusedIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [focusedIndex]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-bg-chat">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="text-center px-6"
        >
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 rounded-xl bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center">
              <Ghost size={24} strokeWidth={1.75} className="text-accent-primary" />
            </div>
          </div>
          <h1 className="text-text-primary text-lg font-semibold mb-1.5">GhostAI</h1>
          <p className="text-text-secondary text-xs mb-4">
            Your invisible AI assistant
          </p>
          <div className="space-y-1.5 text-text-placeholder text-xs">
            <p>Ctrl+Shift+G &mdash; Toggle overlay</p>
            <p>Ctrl+Shift+S &mdash; Capture screen</p>
            <p>Ctrl+Shift+R &mdash; Capture region</p>
            <p>Escape &mdash; Hide overlay</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      className="flex-1 overflow-y-auto bg-bg-chat py-2 focus:outline-none"
    >
      <AnimatePresence initial={false}>
        {messages.map((msg, index) => (
          <div
            key={msg.id}
            className={focusedIndex === index ? 'ring-1 ring-accent-primary/40 rounded-lg mx-1' : ''}
          >
            <MemoizedMessageBubble
              message={msg}
              isStreaming={isStreaming && msg.id === streamingMessageId}
            />
          </div>
        ))}
      </AnimatePresence>

      {/* Streaming thinking dots (while waiting for first token) */}
      <AnimatePresence>
        {isStreaming && messages[messages.length - 1]?.role === 'user' && (
          <motion.div
            key="thinking"
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="mx-3 my-2"
          >
            <div className="inline-flex gap-1 px-3 py-2 rounded-lg bg-bubble-ai border border-border-subtle/50">
              {[0, 200, 400].map((delay) => (
                <div
                  key={delay}
                  className="w-1.5 h-1.5 rounded-full bg-text-secondary animate-pulsingDot"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
