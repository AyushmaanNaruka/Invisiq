import { useState, useCallback, useRef, useEffect } from 'react';
import { SpeechService } from '../services/speech';
import type { SpeechEngine } from '@shared/types';

interface UseAudioTranscriptionReturn {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  isAvailable: boolean;
  error: string | null;
  startListening: (engine: SpeechEngine, language: string) => void;
  stopListening: () => void;
  clearTranscript: () => void;
}

export function useAudioTranscription(): UseAudioTranscriptionReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);

  // Lazy-load SpeechService
  const serviceRef = useRef<SpeechService | null>(null);

  const getService = useCallback(() => {
    if (!serviceRef.current) {
      serviceRef.current = new SpeechService();
    }
    return serviceRef.current;
  }, []);

  // Check actual availability on mount
  useEffect(() => {
    const webSpeechExists = SpeechService.isWebSpeechAvailable();
    console.log('[AudioHook] Web Speech API available:', webSpeechExists);

    if (webSpeechExists) {
      // Web Speech API exists (may still fail at runtime with 'network' error,
      // but SpeechService handles that with auto-fallback to Whisper)
      setIsAvailable(true);
      return;
    }
    // Whisper fallback: available if user has an OpenAI key
    window.ghostAPI.store.getApiKey('openai').then(({ key }) => {
      console.log('[AudioHook] Whisper available (OpenAI key):', !!key);
      setIsAvailable(!!key);
    }).catch(() => setIsAvailable(false));
  }, []);

  const startListening = useCallback(
    async (engine: SpeechEngine, language: string) => {
      setError(null);
      setInterimTranscript('');

      try {
        const service = getService();

        // If browser engine requested but unavailable, fall back to whisper
        let effectiveEngine = engine;
        if (engine === 'browser' && !SpeechService.isWebSpeechAvailable()) {
          console.log('[AudioHook] Browser speech unavailable, using Whisper');
          effectiveEngine = 'whisper';
        }
        console.log('[AudioHook] Starting with engine:', effectiveEngine);

        await service.start(
          { engine: effectiveEngine, language, continuous: true },
          (text: string, isFinal: boolean) => {
            console.log('[AudioHook] onResult:', isFinal ? 'FINAL' : 'interim', `"${text.substring(0, 60)}"`);
            if (isFinal) {
              setTranscript((prev) => {
                const updated = prev ? `${prev} ${text}` : text;
                console.log('[AudioHook] transcript updated, length:', updated.length);
                return updated;
              });
              setInterimTranscript('');
            } else {
              setInterimTranscript(text);
            }
          },
          (errMsg: string) => {
            console.warn('[AudioHook] Speech error:', errMsg);
            setError(errMsg);
            setIsListening(false);
          }
        );

        setIsListening(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start listening');
      }
    },
    [getService]
  );

  const stopListening = useCallback(() => {
    const service = serviceRef.current;
    if (service) {
      service.stop();
    }
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    isAvailable,
    error,
    startListening,
    stopListening,
    clearTranscript,
  };
}
