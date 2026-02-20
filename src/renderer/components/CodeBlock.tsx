import { useState, useMemo } from 'react';
import { Copy, Check, ClipboardPaste, LoaderCircle } from 'lucide-react';
import hljs from 'highlight.js';
import { useToast } from './Toast';

interface CodeBlockProps {
  code: string;
  language?: string;
}

export default function CodeBlock({ code, language }: CodeBlockProps): JSX.Element {
  const [copied, setCopied] = useState(false);
  const [pasting, setPasting] = useState(false);
  const { showToast } = useToast();

  // Use hljs.highlight() instead of hljs.highlightElement() to avoid
  // direct DOM mutation that fights React's reconciliation during streaming.
  const highlightedHtml = useMemo(() => {
    if (!language) return null;
    try {
      const result = hljs.highlight(code, { language, ignoreIllegals: true });
      return result.value;
    } catch {
      return null;
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

  const handlePaste = async (): Promise<void> => {
    if (pasting) return;
    setPasting(true);
    try {
      const result = await window.ghostAPI.clipboard.smartPaste(code);
      if (result.success) {
        showToast('success', 'Code pasted to active app');
      } else {
        showToast('error', result.error || 'Paste failed');
      }
    } catch {
      showToast('error', 'Paste failed');
    } finally {
      setPasting(false);
    }
  };

  const displayLang = language || 'text';

  return (
    <div className="relative group rounded-md overflow-hidden my-2 bg-bg-code">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1 bg-bg-code border-b border-border-subtle">
        <span className="text-text-secondary text-[10px] font-mono uppercase">{displayLang}</span>
        <div className="flex items-center gap-1">
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
          <button
            onClick={handlePaste}
            disabled={pasting}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-text-secondary hover:text-text-primary hover:bg-bg-hover disabled:opacity-50 transition-colors"
          >
            {pasting ? (
              <>
                <LoaderCircle size={10} className="animate-spin" />
                <span>Pasting...</span>
              </>
            ) : (
              <>
                <ClipboardPaste size={10} />
                <span>Paste</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code */}
      <pre className="overflow-x-auto p-3 text-xs leading-5">
        {highlightedHtml ? (
          <code
            className={`language-${language}`}
            style={{ background: 'transparent', color: 'var(--text-code)' }}
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          />
        ) : (
          <code
            style={{ background: 'transparent', color: 'var(--text-code)' }}
          >
            {code}
          </code>
        )}
      </pre>
    </div>
  );
}
