import { desktopCapturer, screen } from 'electron';
import { getOverlayWindow, showOverlay, hideOverlay } from './overlay';
import { getMonitorForOverlay } from './monitors';
import type { ScreenshotResult } from '@shared/types';

const CAPTURE_DELAY_MS = 100;
const MAX_WIDTH = 1920;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resizeIfNeeded(image: Electron.NativeImage): Electron.NativeImage {
  const size = image.getSize();
  if (size.width > MAX_WIDTH) {
    const ratio = MAX_WIDTH / size.width;
    return image.resize({
      width: MAX_WIDTH,
      height: Math.round(size.height * ratio),
    });
  }
  return image;
}

/**
 * Find the desktopCapturer source matching a specific display.
 * Falls back to first source if no match found.
 */
function findSourceForDisplay(
  sources: Electron.DesktopCapturerSource[],
  displayId: string,
): Electron.DesktopCapturerSource {
  const matched = sources.find((s) => s.display_id === displayId);
  return matched || sources[0];
}

/**
 * Capture a full screen screenshot.
 * @param monitorId - Optional display ID. Defaults to the monitor the overlay is on.
 */
export async function captureFullScreen(monitorId?: string): Promise<ScreenshotResult> {
  const overlayWindow = getOverlayWindow();
  const wasVisible = overlayWindow?.isVisible() ?? false;

  try {
    // Hide overlay before capture
    if (wasVisible) {
      hideOverlay();
      await sleep(CAPTURE_DELAY_MS);
    }

    // Determine target display
    let targetDisplay: Electron.Display;
    if (monitorId) {
      targetDisplay =
        screen.getAllDisplays().find((d) => d.id.toString() === monitorId) ||
        screen.getPrimaryDisplay();
    } else {
      targetDisplay = getMonitorForOverlay();
    }

    // Request thumbnail size matching target display (respect HiDPI scaleFactor)
    const thumbWidth = Math.round(targetDisplay.size.width * targetDisplay.scaleFactor);
    const thumbHeight = Math.round(targetDisplay.size.height * targetDisplay.scaleFactor);

    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: thumbWidth, height: thumbHeight },
    });

    if (sources.length === 0) {
      throw new Error('No screen sources available');
    }

    // Match source to target display
    const source = findSourceForDisplay(sources, targetDisplay.id.toString());
    let image = source.thumbnail;
    image = resizeIfNeeded(image);

    const base64 = image.toPNG().toString('base64');
    const size = image.getSize();

    return {
      base64,
      width: size.width,
      height: size.height,
      timestamp: Date.now(),
    };
  } finally {
    // Always restore overlay visibility
    if (wasVisible) {
      showOverlay();
    }
  }
}

/**
 * Capture a full screen screenshot WITHOUT hiding/showing the overlay.
 * Used by background tasks (code detection OCR) to avoid flickering.
 * The overlay area will appear blank (content protection), which is fine for OCR.
 */
export async function captureSilent(monitorId?: string): Promise<ScreenshotResult> {
  let targetDisplay: Electron.Display;
  if (monitorId) {
    targetDisplay =
      screen.getAllDisplays().find((d) => d.id.toString() === monitorId) ||
      screen.getPrimaryDisplay();
  } else {
    targetDisplay = getMonitorForOverlay();
  }

  const thumbWidth = Math.round(targetDisplay.size.width * targetDisplay.scaleFactor);
  const thumbHeight = Math.round(targetDisplay.size.height * targetDisplay.scaleFactor);

  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: thumbWidth, height: thumbHeight },
  });

  if (sources.length === 0) {
    throw new Error('No screen sources available');
  }

  const source = findSourceForDisplay(sources, targetDisplay.id.toString());
  let image = source.thumbnail;
  image = resizeIfNeeded(image);

  const base64 = image.toPNG().toString('base64');
  const size = image.getSize();

  return {
    base64,
    width: size.width,
    height: size.height,
    timestamp: Date.now(),
  };
}

/**
 * Capture full screen for use with the inline region selector (Phase 4).
 * Returns a full-resolution screenshot WITHOUT showing the overlay afterward,
 * so the renderer can display it for region selection. The caller is responsible
 * for showing the overlay again when done.
 */
export async function captureForSnip(): Promise<ScreenshotResult> {
  const overlayWindow = getOverlayWindow();
  const wasVisible = overlayWindow?.isVisible() ?? false;

  try {
    if (wasVisible) {
      hideOverlay();
      await sleep(CAPTURE_DELAY_MS);
    }

    const targetDisplay = getMonitorForOverlay();
    const thumbWidth = Math.round(targetDisplay.size.width * targetDisplay.scaleFactor);
    const thumbHeight = Math.round(targetDisplay.size.height * targetDisplay.scaleFactor);

    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: thumbWidth, height: thumbHeight },
    });

    if (sources.length === 0) throw new Error('No screen sources available');

    const source = findSourceForDisplay(sources, targetDisplay.id.toString());
    const image = source.thumbnail;
    const size = image.getSize();

    return {
      base64: image.toPNG().toString('base64'),
      width: size.width,
      height: size.height,
      timestamp: Date.now(),
    };
  } finally {
    // Always restore overlay so the renderer can show the InlineRegionSelector on top
    if (wasVisible) {
      showOverlay();
    }
  }
}

/**
 * Capture a region of a screen.
 * @param monitorId - Optional display ID. Defaults to the monitor the overlay is on.
 */
export async function captureRegion(
  x: number,
  y: number,
  width: number,
  height: number,
  monitorId?: string,
): Promise<ScreenshotResult> {
  const overlayWindow = getOverlayWindow();
  const wasVisible = overlayWindow?.isVisible() ?? false;

  try {
    // Hide overlay before capture
    if (wasVisible) {
      hideOverlay();
      await sleep(CAPTURE_DELAY_MS);
    }

    // Determine target display
    let targetDisplay: Electron.Display;
    if (monitorId) {
      targetDisplay =
        screen.getAllDisplays().find((d) => d.id.toString() === monitorId) ||
        screen.getPrimaryDisplay();
    } else {
      targetDisplay = getMonitorForOverlay();
    }

    const thumbWidth = Math.round(targetDisplay.size.width * targetDisplay.scaleFactor);
    const thumbHeight = Math.round(targetDisplay.size.height * targetDisplay.scaleFactor);

    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: thumbWidth, height: thumbHeight },
    });

    if (sources.length === 0) {
      throw new Error('No screen sources available');
    }

    const source = findSourceForDisplay(sources, targetDisplay.id.toString());
    let image = source.thumbnail;

    // Crop to the selected region
    image = image.crop({ x, y, width, height });
    image = resizeIfNeeded(image);

    const base64 = image.toPNG().toString('base64');
    const size = image.getSize();

    return {
      base64,
      width: size.width,
      height: size.height,
      timestamp: Date.now(),
    };
  } finally {
    if (wasVisible) {
      showOverlay();
    }
  }
}
