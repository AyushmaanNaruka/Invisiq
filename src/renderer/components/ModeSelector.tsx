import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { BUILT_IN_MODES } from '@shared/constants';
import type { Mode } from '@shared/types';

interface ModeSelectorProps {
  activeMode: string;
  onModeChange: (modeId: string) => void;
}

export default function ModeSelector({ activeMode, onModeChange }: ModeSelectorProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const currentMode = BUILT_IN_MODES.find((m) => m.id === activeMode) || BUILT_IN_MODES[0];

  useEffect(() => {
    function handleClick(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative no-drag">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-bg-hover text-text-primary text-xs transition-colors"
      >
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: currentMode.color }} />
        <span>{currentMode.name}</span>
        <ChevronDown size={12} className="text-text-secondary" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-40 bg-bg-overlay border border-border-subtle rounded-md shadow-dropdown z-50">
          {BUILT_IN_MODES.map((mode: Mode) => (
            <button
              key={mode.id}
              onClick={() => {
                onModeChange(mode.id);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-bg-hover transition-colors ${
                mode.id === activeMode ? 'text-text-primary' : 'text-text-secondary'
              }`}
            >
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: mode.color }} />
              {mode.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
