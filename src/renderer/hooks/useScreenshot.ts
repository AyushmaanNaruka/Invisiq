import { useState, useCallback } from 'react';
import type { ImageAttachment, ScreenshotResult, RegionCropRequest } from '@shared/types';

const MAX_SCREENSHOTS = 3;

interface UseScreenshotReturn {
  pendingScreenshots: ImageAttachment[];
  isCapturing: boolean;
  /** Non-null while the inline region selector is open */
  snipScreenshot: ScreenshotResult | null;
  captureFull: () => Promise<void>;
  /** Captures a full-screen snapshot and opens the InlineRegionSelector */
  captureRegion: () => Promise<void>;
  /** Called by InlineRegionSelector on mouseup — crops and adds to pending */
  confirmRegion: (crop: RegionCropRequest) => Promise<void>;
  /** Called by InlineRegionSelector on Escape / cancel */
  cancelSnip: () => void;
  clearScreenshot: (index: number) => void;
  clearAllScreenshots: () => void;
}

export function useScreenshot(): UseScreenshotReturn {
  const [pendingScreenshots, setPendingScreenshots] = useState<ImageAttachment[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [snipScreenshot, setSnipScreenshot] = useState<ScreenshotResult | null>(null);

  const processResult = useCallback((result: ScreenshotResult | null) => {
    if (!result) return;
    setPendingScreenshots((prev) => {
      if (prev.length >= MAX_SCREENSHOTS) return prev;
      return [
        ...prev,
        {
          data: result.base64,
          mimeType: 'image/png',
          width: result.width,
          height: result.height,
        },
      ];
    });
  }, []);

  const captureFull = useCallback(async () => {
    setIsCapturing(true);
    try {
      const result = await window.ghostAPI.screenshot.captureFull();
      processResult(result);
    } catch (err) {
      console.error('Full screenshot failed:', err);
    } finally {
      setIsCapturing(false);
    }
  }, [processResult]);

  /** Phase 4: inline snipping — capture background then open InlineRegionSelector */
  const captureRegion = useCallback(async () => {
    setIsCapturing(true);
    try {
      const result = await window.ghostAPI.screenshot.captureForSnip();
      setSnipScreenshot(result);
    } catch (err) {
      console.error('Snip capture failed:', err);
    } finally {
      setIsCapturing(false);
    }
  }, []);

  /** Phase 4: crop + finalize — called by InlineRegionSelector onSelect */
  const confirmRegion = useCallback(
    async (crop: RegionCropRequest) => {
      setSnipScreenshot(null);
      try {
        const result = await window.ghostAPI.screenshot.cropRegion(crop);
        processResult(result);
      } catch (err) {
        console.error('Region crop failed:', err);
      }
    },
    [processResult]
  );

  const cancelSnip = useCallback(() => {
    setSnipScreenshot(null);
  }, []);

  const clearScreenshot = useCallback((index: number) => {
    setPendingScreenshots((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearAllScreenshots = useCallback(() => {
    setPendingScreenshots([]);
  }, []);

  return {
    pendingScreenshots,
    isCapturing,
    snipScreenshot,
    captureFull,
    captureRegion,
    confirmRegion,
    cancelSnip,
    clearScreenshot,
    clearAllScreenshots,
  };
}
