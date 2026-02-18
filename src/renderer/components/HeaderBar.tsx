import { GripVertical, Settings, X } from 'lucide-react';
import ModeSelector from './ModeSelector';
import ModelSelector from './ModelSelector';
import OpacityControl from './OpacityControl';
import type { ProviderID } from '@shared/types';

interface HeaderBarProps {
  activeMode: string;
  activeModel: string;
  opacity: number;
  availableProviders: Set<ProviderID>;
  onModeChange: (modeId: string) => void;
  onModelChange: (modelId: string) => void;
  onOpacityChange: (opacity: number) => void;
  onOpenSettings: () => void;
  onClose: () => void;
}

export default function HeaderBar({
  activeMode,
  activeModel,
  opacity,
  availableProviders,
  onModeChange,
  onModelChange,
  onOpacityChange,
  onOpenSettings,
  onClose,
}: HeaderBarProps): JSX.Element {
  return (
    <div
      className="h-8 bg-bg-header flex items-center px-2 shrink-0 border-b border-border-subtle"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Drag grip */}
      <div className="text-text-placeholder mr-1">
        <GripVertical size={14} />
      </div>

      {/* Mode selector */}
      <ModeSelector activeMode={activeMode} onModeChange={onModeChange} />

      {/* Separator */}
      <div className="w-px h-4 bg-border-subtle mx-1" />

      {/* Model selector */}
      <ModelSelector
        activeModel={activeModel}
        onModelChange={onModelChange}
        availableProviders={availableProviders}
        onOpenSettings={onOpenSettings}
      />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right controls */}
      <div className="flex items-center gap-0.5 no-drag">
        <OpacityControl opacity={opacity} onOpacityChange={onOpacityChange} />

        <button
          onClick={onOpenSettings}
          className="p-1 rounded hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors"
          title="Settings"
        >
          <Settings size={14} />
        </button>

        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors"
          title="Hide (Escape)"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
