import { useState, useEffect, useRef } from 'react';
import { Copy, Check } from 'lucide-react';
import hljs from 'highlight.js';

interface CodeBlockProps {
  code: string;
  language?: string;
}

export default function CodeBlock({ code, language }: CodeBlockProps): JSX.Element {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (codeRef.current) {
      hljs.highlightElement(codeRef.current);
    }
  }, [code, language]);

  const handleCopy = async (): Promise<void> => {
    try {
      await window.ghostAPI.clipboard.copy(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      navigator.clipboard.writeText(code).catch(() => {});
    }
  };

  const displayLang = language || 'text';

  return (
    <div className="relative group rounded-md overflow-hidden my-2 bg-bg-code">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1 bg-bg-code border-b border-border-subtle">
        <span className="text-text-secondary text-[10px] font-mono uppercase">{displayLang}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
        >
          {copied ? (
            <>
              <Check size={10} className="text-status-success" />
              <span className="text-status-success">Copied!</span>
            </>
          ) : (
            <>
              <Copy size={10} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code */}
      <pre className="overflow-x-auto p-3 text-xs leading-5">
        <code
          ref={codeRef}
          className={language ? `language-${language}` : ''}
          style={{ background: 'transparent', color: 'var(--text-code)' }}
        >
          {code}
        </code>
      </pre>
    </div>
  );
}
