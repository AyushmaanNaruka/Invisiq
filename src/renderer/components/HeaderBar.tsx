import { GripVertical, Settings, X, Clock, Plus, MousePointer, MousePointerBan } from 'lucide-react';
import ModeSelector from './ModeSelector';
import ModelSelector from './ModelSelector';
import OpacityControl from './OpacityControl';
import { GhostTooltip } from './ui/GhostTooltip';
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
  isPassthrough?: boolean;
  onTogglePassthrough?: () => void;
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
  isPassthrough = false,
  onTogglePassthrough,
}: HeaderBarProps): JSX.Element {
  return (
    <div
      className="h-8 bg-bg-header flex items-center px-2 shrink-0 border-b border-border-subtle"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Drag grip */}
      <div className="text-text-placeholder mr-1">
        <GripVertical size={14} strokeWidth={1.75} />
      </div>

      {/* History + New Chat buttons */}
      <div className="flex items-center gap-0.5 no-drag mr-1">
        <GhostTooltip content="History" placement="bottom">
          <button
            onClick={onOpenHistory}
            className="p-1 rounded hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors"
          >
            <Clock size={13} strokeWidth={1.75} />
          </button>
        </GhostTooltip>
        <GhostTooltip content="New chat" placement="bottom">
          <button
            onClick={onNewConversation}
            className="p-1 rounded hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors"
          >
            <Plus size={13} strokeWidth={1.75} />
          </button>
        </GhostTooltip>
      </div>

      {/* Separator */}
      <div className="w-px h-4 bg-border-subtle mx-1" />

      {/* Mode selector */}
      <ModeSelector
        activeMode={activeMode}
        customModes={customModes}
        compact={compact}
        onModeChange={onModeChange}
        onCreateMode={onCreateMode}
        onEditMode={onEditMode}
      />

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

        {onTogglePassthrough && (
          <GhostTooltip
            content={isPassthrough ? 'Click-through ON (Ctrl+Shift+P to toggle)' : 'Click-through mode (Ctrl+Shift+P)'}
            placement="bottom"
          >
            <button
              onClick={onTogglePassthrough}
              className={`p-1 rounded transition-colors ${
                isPassthrough
                  ? 'text-accent-primary bg-accent-primary/10 hover:bg-accent-primary/20'
                  : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
              }`}
            >
              {isPassthrough ? (
                <MousePointerBan size={14} strokeWidth={1.75} />
              ) : (
                <MousePointer size={14} strokeWidth={1.75} />
              )}
            </button>
          </GhostTooltip>
        )}

        <GhostTooltip content="Settings" placement="bottom">
          <button
            onClick={onOpenSettings}
            className="p-1 rounded hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors"
          >
            <Settings size={14} strokeWidth={1.75} />
          </button>
        </GhostTooltip>

        <GhostTooltip content="Quit InvisiQ (Esc hides)" placement="bottom">
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-bg-hover text-text-secondary hover:text-status-error transition-colors"
          >
            <X size={14} strokeWidth={1.75} />
          </button>
        </GhostTooltip>
      </div>
    </div>
  );
}
