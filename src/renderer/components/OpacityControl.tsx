import { useState } from 'react';
import { Circle } from 'lucide-react';
import { GhostTooltip } from './ui/GhostTooltip';

interface OpacityControlProps {
  opacity: number;
  onOpacityChange: (opacity: number) => void;
}

export default function OpacityControl({ opacity, onOpacityChange }: OpacityControlProps): JSX.Element {
  const [showSlider, setShowSlider] = useState(false);

  return (
    <div className="relative no-drag" onMouseLeave={() => setShowSlider(false)}>
      <GhostTooltip content={`Opacity: ${Math.round(opacity * 100)}%`} placement="bottom" disabled={showSlider}>
        <button
          onClick={() => setShowSlider(!showSlider)}
          onMouseEnter={() => setShowSlider(true)}
          className="p-1 rounded hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors"
        >
          <Circle size={14} />
        </button>
      </GhostTooltip>

      {showSlider && (
        <div className="absolute top-full right-0 pt-1 z-50 w-36">
        <div className="p-2 bg-bg-overlay border border-border-subtle rounded-md shadow-dropdown">
          <div className="flex items-center justify-between mb-1">
            <span className="text-text-secondary text-[10px]">Opacity</span>
            <span className="text-text-primary text-[10px]">{Math.round(opacity * 100)}%</span>
          </div>
          <input
            type="range"
            min="10"
            max="100"
            value={Math.round(opacity * 100)}
            onChange={(e) => onOpacityChange(parseInt(e.target.value) / 100)}
            className="w-full h-1 accent-accent-primary cursor-pointer"
          />
        </div>
        </div>
      )}
    </div>
  );
}
