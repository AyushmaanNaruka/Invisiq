import { desktopCapturer, nativeImage, screen } from 'electron';
import { getOverlayWindow, showOverlay, hideOverlay } from './overlay';
import type { ScreenshotResult, MonitorInfo } from '@shared/types';

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

export async function captureFullScreen(): Promise<ScreenshotResult> {
  const overlayWindow = getOverlayWindow();
  const wasVisible = overlayWindow?.isVisible() ?? false;

  try {
    // Hide overlay before capture
    if (wasVisible) {
      hideOverlay();
      await sleep(CAPTURE_DELAY_MS);
    }

    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: screen.getPrimaryDisplay().workAreaSize,
    });

    if (sources.length === 0) {
      throw new Error('No screen sources available');
    }

    // Use primary display (first source)
    const source = sources[0];
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

export async function captureRegion(
  x: number,
  y: number,
  width: number,
  height: number
): Promise<ScreenshotResult> {
  const overlayWindow = getOverlayWindow();
  const wasVisible = overlayWindow?.isVisible() ?? false;

  try {
    // Hide overlay before capture
    if (wasVisible) {
      hideOverlay();
      await sleep(CAPTURE_DELAY_MS);
    }

    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: screen.getPrimaryDisplay().workAreaSize,
    });

    if (sources.length === 0) {
      throw new Error('No screen sources available');
    }

    const source = sources[0];
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

export function getAvailableMonitors(): MonitorInfo[] {
  const displays = screen.getAllDisplays();
  return displays.map((display) => ({
    id: display.id.toString(),
    name: `Display ${display.id}`,
    width: display.size.width,
    height: display.size.height,
    x: display.bounds.x,
    y: display.bounds.y,
    isPrimary: display.id === screen.getPrimaryDisplay().id,
  }));
}
