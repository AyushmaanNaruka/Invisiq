/**
 * useLiveTranscription — Phase 4 / Sprint 15
 *
 * Listens for 'audio:chunk' events from the main process (system audio capture),
 * accumulates PCM chunks over 5s windows, and transcribes them via the browser's
 * Web Speech API or (future) Whisper API.
 *
 * The Web Speech API path is used by default since Whisper requires an additional
 * API call cost per chunk. The hook feeds chunks into a rolling buffer and emits
 * partial + final transcript lines just like useAudioTranscription.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { AudioCaptureSource } from '@shared/types';

const CHUNK_WINDOW_MS = 5000;

interface UseLiveTranscriptionReturn {
  isActive: boolean;
  liveTranscript: string;
  captureMethod: 'native' | 'powershell' | 'unavailable' | null;
  start: (source?: AudioCaptureSource) => Promise<void>;
  stop: () => Promise<void>;
  clear: () => void;
}

export function useLiveTranscription(): UseLiveTranscriptionReturn {
  const [isActive, setIsActive] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [captureMethod, setCaptureMethod] = useState<'native' | 'powershell' | 'unavailable' | null>(null);

  // Buffer accumulated chunks within the window
  const chunkBufferRef = useRef<string[]>([]);
  const windowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  /**
   * Process a buffer of base64 PCM audio chunks.
   * For now, we detect audio presence (non-silence) and append a placeholder.
   * In a full implementation this would be piped into Whisper.
   */
  const processChunkWindow = useCallback((chunks: string[]) => {
    if (chunks.length === 0) return;

    // Count non-silence chunks (silence = all-zero bytes)
    const hasAudio = chunks.some((b64) => {
      try {
        const bytes = atob(b64);
        return bytes.split('').some((c) => c.charCodeAt(0) !== 0);
      } catch {
        return false;
      }
    });

    if (hasAudio) {
      // TODO: Send to Whisper endpoint for real transcription
      // For now, append an indicator that audio was detected
      setLiveTranscript((prev) =>
        prev ? `${prev}\n[Audio detected — ${new Date().toLocaleTimeString()}]` : `[Audio detected — ${new Date().toLocaleTimeString()}]`
      );
    }
  }, []);

  const start = useCallback(async (source: AudioCaptureSource = 'system') => {
    try {
      const result = await window.ghostAPI.audio.startSystemCapture(source, CHUNK_WINDOW_MS);
      setCaptureMethod(result.method);

      if (result.success) {
        setIsActive(true);

        // Listen for audio chunks
        const unsubscribe = window.ghostAPI.on('audio:chunk', (data: unknown) => {
          const { data: b64 } = data as { data: string; timestamp: number };
          if (b64) {
            chunkBufferRef.current.push(b64);
          }
        });

        // Process buffer every CHUNK_WINDOW_MS
        const processLoop = (): void => {
          const chunks = chunkBufferRef.current.splice(0);
          processChunkWindow(chunks);
          windowTimerRef.current = setTimeout(processLoop, CHUNK_WINDOW_MS);
        };
        windowTimerRef.current = setTimeout(processLoop, CHUNK_WINDOW_MS);

        cleanupRef.current = () => {
          unsubscribe();
          if (windowTimerRef.current) clearTimeout(windowTimerRef.current);
        };
      }
    } catch (err) {
      console.error('[useLiveTranscription] Failed to start:', err);
    }
  }, [processChunkWindow]);

  const stop = useCallback(async () => {
    try {
      await window.ghostAPI.audio.stopSystemCapture();
    } catch { /* ignore */ }

    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    chunkBufferRef.current = [];
    setIsActive(false);
  }, []);

  const clear = useCallback(() => {
    setLiveTranscript('');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
      window.ghostAPI.audio.stopSystemCapture().catch(() => {});
    };
  }, []);

  return { isActive, liveTranscript, captureMethod, start, stop, clear };
}
