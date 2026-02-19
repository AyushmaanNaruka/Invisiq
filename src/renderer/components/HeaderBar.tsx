import { GripVertical, Settings, X, Clock, Plus } from 'lucide-react';
import ModeSelector from './ModeSelector';
import ModelSelector from './ModelSelector';
import OpacityControl from './OpacityControl';
import type { ProviderID, CustomMode } from '@shared/types';

interface HeaderBarProps {
  activeMode: string;
  activeModel: string;
  opacity: number;
  availableProviders: Set<ProviderID>;
  customModes: CustomMode[];
  compact?: boolean;
  onModeChange: (modeId: string) => void;
  onModelChange: (modelId: string) => void;
  onOpacityChange: (opacity: number) => void;
  onOpenSettings: () => void;
  onOpenHistory: () => void;
  onNewConversation: () => void;
  onCreateMode: () => void;
  onEditMode: (mode: CustomMode) => void;
  onClose: () => void;
}

export default function HeaderBar({
  activeMode,
  activeModel,
  opacity,
  availableProviders,
  customModes,
  compact = false,
  onModeChange,
  onModelChange,
  onOpacityChange,
  onOpenSettings,
  onOpenHistory,
  onNewConversation,
  onCreateMode,
  onEditMode,
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

      {/* History + New Chat buttons */}
      <div className="flex items-center gap-0.5 no-drag mr-1">
        <button
          onClick={onOpenHistory}
          className="p-1 rounded hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors"
          title="Conversation history"
        >
          <Clock size={13} />
        </button>
        <button
          onClick={onNewConversation}
          className="p-1 rounded hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors"
          title="New conversation"
        >
          <Plus size={13} />
        </button>
      </div>

      {/* Separator */}
      <div className="w-px h-4 bg-border-subtle mx-1" />

      {/* Mode selector */}
      <ModeSelector activeMode={activeMode} customModes={customModes} compact={compact} onModeChange={onModeChange} onCreateMode={onCreateMode} onEditMode={onEditMode} />

      {/* Separator */}
      <div className="w-px h-4 bg-border-subtle mx-1" />

      {/* Model selector */}
      <ModelSelector
        activeModel={activeModel}
        onModelChange={onModelChange}
        availableProviders={availableProviders}
        onOpenSettings={onOpenSettings}
        compact={compact}
      />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right controls */}
      <div className="flex items-center gap-0.5 no-drag">
        {!compact && <OpacityControl opacity={opacity} onOpacityChange={onOpacityChange} />}

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
