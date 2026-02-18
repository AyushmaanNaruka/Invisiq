import { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, Mic, X } from 'lucide-react';

interface TranscriptPanelProps {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  onClear: () => void;
}

export default function TranscriptPanel({
  isListening,
  transcript,
  interimTranscript,
  onClear,
}: TranscriptPanelProps): JSX.Element | null {
  const [collapsed, setCollapsed] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Elapsed recording timer
  useEffect(() => {
    if (isListening) {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isListening]);

  const formatTime = (secs: number): string => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`;
  };

  // Only show when listening or there is transcript content
  if (!isListening && !transcript) return null;

  return (
    <div className="border-t border-border-subtle bg-bg-overlay px-3 py-1.5 shrink-0">
      {/* Header row */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <Mic size={12} className={isListening ? 'text-status-error' : 'text-text-secondary'} />
          <span className="text-text-secondary text-[10px] font-medium uppercase tracking-wider">
            Transcript
          </span>
          {isListening && (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-status-error animate-pulse" />
              <span className="text-[10px] text-text-placeholder font-mono">
                {formatTime(elapsed)}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          {transcript && (
            <button
              onClick={onClear}
              className="p-0.5 rounded hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors"
              title="Clear transcript"
            >
              <X size={10} />
            </button>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-0.5 rounded hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors"
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
          </button>
        </div>
      </div>

      {/* Content */}
      {!collapsed && (
        <div className="max-h-[80px] overflow-y-auto text-xs leading-relaxed">
          {transcript && (
            <span className="text-text-primary">{transcript}</span>
          )}
          {interimTranscript && (
            <span className="text-text-placeholder italic">
              {transcript ? ' ' : ''}{interimTranscript}
            </span>
          )}
          {!transcript && !interimTranscript && isListening && (
            <span className="text-text-placeholder italic flex items-center gap-1.5">
              <span>Recording</span>
              <span className="inline-flex gap-0.5">
                <span className="w-1 h-1 rounded-full bg-text-placeholder animate-pulsingDot" />
                <span className="w-1 h-1 rounded-full bg-text-placeholder animate-pulsingDot" style={{ animationDelay: '200ms' }} />
                <span className="w-1 h-1 rounded-full bg-text-placeholder animate-pulsingDot" style={{ animationDelay: '400ms' }} />
              </span>
              <span className="text-text-placeholder/60 text-[10px]">Transcript appears when you stop</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
