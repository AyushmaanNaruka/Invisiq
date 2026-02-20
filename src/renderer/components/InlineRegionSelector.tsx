import { useRef, useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { ScreenshotResult, RegionCropRequest } from '@shared/types';

interface SelectionRect {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface InlineRegionSelectorProps {
  screenshot: ScreenshotResult;
  onSelect: (crop: RegionCropRequest) => void;
  onCancel: () => void;
}

/**
 * Renders a full-window region selector overlay using the captured screenshot
 * as a background. The user drags to define the crop region.
 *
 * This is completely invisible to screen capture because it runs inside
 * the already content-protected overlay BrowserWindow.
 */
export default function InlineRegionSelector({
  screenshot,
  onSelect,
  onCancel,
}: InlineRegionSelectorProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const [selection, setSelection] = useState<SelectionRect | null>(null);
  const startPos = useRef({ x: 0, y: 0 });

  // Handle Escape to cancel
  useEffect(() => {
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onCancel]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    isDragging.current = true;
    startPos.current = { x: e.clientX, y: e.clientY };
    setSelection({
      startX: e.clientX,
      startY: e.clientY,
      endX: e.clientX,
      endY: e.clientY,
    });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    setSelection((prev) =>
      prev ? { ...prev, endX: e.clientX, endY: e.clientY } : null
    );
  }, []);

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging.current || !selection) return;
      isDragging.current = false;

      const x = Math.min(selection.startX, selection.endX);
      const y = Math.min(selection.startY, selection.endY);
      const width = Math.abs(selection.endX - selection.startX);
      const height = Math.abs(selection.endY - selection.startY);

      // Ignore tiny selections (accidental click)
      if (width < 10 || height < 10) {
        setSelection(null);
        return;
      }

      const dpr = window.devicePixelRatio || 1;
      onSelect({
        screenshotBase64: screenshot.base64,
        x,
        y,
        width,
        height,
        devicePixelRatio: dpr,
      });
    },
    [selection, screenshot.base64, onSelect]
  );

  // Compute the visible selection rectangle
  const selRect = selection
    ? {
        left: Math.min(selection.startX, selection.endX),
        top: Math.min(selection.startY, selection.endY),
        width: Math.abs(selection.endX - selection.startX),
        height: Math.abs(selection.endY - selection.startY),
      }
    : null;

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[100] select-none"
      style={{
        cursor: 'crosshair',
        backgroundImage: `url(data:image/png;base64,${screenshot.base64})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Dimmed overlay to indicate "select mode" */}
      <div className="absolute inset-0 bg-bg-overlay/40 pointer-events-none" />

      {/* Instruction */}
      {!selection && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-bg-header/90 border border-border-subtle rounded-lg text-xs text-text-secondary backdrop-blur-sm pointer-events-none">
          Drag to select region &bull; Esc to cancel
        </div>
      )}

      {/* Selection rectangle */}
      {selRect && selRect.width > 4 && selRect.height > 4 && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: selRect.left,
            top: selRect.top,
            width: selRect.width,
            height: selRect.height,
          }}
        >
          {/* Clear window (shows original screenshot through dim) */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(data:image/png;base64,${screenshot.base64})`,
              backgroundSize: `${window.innerWidth}px ${window.innerHeight}px`,
              backgroundPosition: `-${selRect.left}px -${selRect.top}px`,
            }}
          />
          {/* Border */}
          <div className="absolute inset-0 border-2 border-dashed border-accent-primary shadow-glow-teal" />
          {/* Dimension label */}
          <div className="absolute -top-6 left-0 px-1.5 py-0.5 bg-accent-primary/90 text-bg-overlay rounded text-[10px] font-mono">
            {selRect.width} × {selRect.height}
          </div>
        </div>
      )}
    </motion.div>
  );
}
