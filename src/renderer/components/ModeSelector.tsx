import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus, Pencil } from 'lucide-react';
import { BUILT_IN_MODES } from '@shared/constants';
import type { Mode, CustomMode } from '@shared/types';

interface ModeSelectorProps {
  activeMode: string;
  customModes: CustomMode[];
  onModeChange: (modeId: string) => void;
  onCreateMode: () => void;
  onEditMode: (mode: CustomMode) => void;
}

export default function ModeSelector({
  activeMode,
  customModes,
  onModeChange,
  onCreateMode,
  onEditMode,
}: ModeSelectorProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const allModes: Mode[] = [...BUILT_IN_MODES, ...customModes];
  const currentMode = allModes.find((m) => m.id === activeMode) || BUILT_IN_MODES[0];

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
        <div className="absolute top-full left-0 mt-1 w-44 bg-bg-overlay border border-border-subtle rounded-md shadow-dropdown z-50">
          {/* Built-in modes */}
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

          {/* Custom modes */}
          {customModes.length > 0 && (
            <>
              <div className="border-t border-border-subtle my-1" />
              <div className="px-3 py-1">
                <span className="text-[10px] text-text-placeholder uppercase tracking-wide">Custom</span>
              </div>
              {customModes.map((mode) => (
                <div key={mode.id} className="flex items-center group">
                  <button
                    onClick={() => {
                      onModeChange(mode.id);
                      setIsOpen(false);
                    }}
                    className={`flex-1 flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-bg-hover transition-colors ${
                      mode.id === activeMode ? 'text-text-primary' : 'text-text-secondary'
                    }`}
                  >
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: mode.color }} />
                    {mode.name}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditMode(mode);
                      setIsOpen(false);
                    }}
                    className="p-1.5 mr-1 rounded opacity-0 group-hover:opacity-100 hover:bg-bg-input text-text-secondary hover:text-text-primary transition-all"
                    title="Edit mode"
                  >
                    <Pencil size={10} />
                  </button>
                </div>
              ))}
            </>
          )}

          {/* Create new mode */}
          <div className="border-t border-border-subtle mt-1">
            <button
              onClick={() => {
                onCreateMode();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left text-accent-primary hover:bg-bg-hover transition-colors"
            >
              <Plus size={12} />
              Create Mode...
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
