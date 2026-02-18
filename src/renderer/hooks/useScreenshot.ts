import { useState, useCallback } from 'react';
import type { ImageAttachment, ScreenshotResult } from '@shared/types';

const MAX_SCREENSHOTS = 3;

interface UseScreenshotReturn {
  pendingScreenshots: ImageAttachment[];
  isCapturing: boolean;
  captureFull: () => Promise<void>;
  captureRegion: () => Promise<void>;
  clearScreenshot: (index: number) => void;
  clearAllScreenshots: () => void;
}

export function useScreenshot(): UseScreenshotReturn {
  const [pendingScreenshots, setPendingScreenshots] = useState<ImageAttachment[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);

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

  const captureRegion = useCallback(async () => {
    setIsCapturing(true);
    try {
      const result = await window.ghostAPI.screenshot.captureRegion();
      processResult(result);
    } catch (err) {
      console.error('Region screenshot failed:', err);
    } finally {
      setIsCapturing(false);
    }
  }, [processResult]);

  const clearScreenshot = useCallback((index: number) => {
    setPendingScreenshots((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearAllScreenshots = useCallback(() => {
    setPendingScreenshots([]);
  }, []);

  return {
    pendingScreenshots,
    isCapturing,
    captureFull,
    captureRegion,
    clearScreenshot,
    clearAllScreenshots,
  };
}
