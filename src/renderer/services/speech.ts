import type { SpeechEngine } from '@shared/types';

// ══════════════════════════════════════
//  TYPES
// ══════════════════════════════════════

interface SpeechConfig {
  engine: SpeechEngine;
  language: string;
  continuous?: boolean;
}

type OnResult = (text: string, isFinal: boolean) => void;
type OnError = (error: string) => void;

// User-friendly error messages
const FRIENDLY_ERRORS: Record<string, string> = {
  'network': 'Speech service unavailable — trying Whisper fallback...',
  'not-allowed': 'Microphone permission denied. Check browser/OS permissions.',
  'audio-capture': 'No microphone detected. Check your audio devices.',
  'service-not-allowed': 'Speech service blocked by browser policy.',
};

// Errors that should trigger automatic Whisper fallback
const FALLBACK_ERRORS = ['network', 'not-allowed', 'service-not-allowed'];

// ══════════════════════════════════════
//  SPEECH SERVICE
// ══════════════════════════════════════

export class SpeechService {
  private recognition: SpeechRecognition | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private isActive = false;
  private restartCount = 0;
  private maxRestarts = 5;
  private onResult: OnResult | null = null;
  private onError: OnError | null = null;
  private currentConfig: SpeechConfig | null = null;
  private triedWhisperFallback = false;

  static isWebSpeechAvailable(): boolean {
    return !!(
      window.SpeechRecognition ||
      window.webkitSpeechRecognition
    );
  }

  async start(config: SpeechConfig, onResult: OnResult, onError: OnError): Promise<void> {
    this.stop();
    this.onResult = onResult;
    this.onError = onError;
    this.isActive = true;
    this.restartCount = 0;
    this.currentConfig = config;
    this.triedWhisperFallback = false;

    console.log('[Speech] Starting with engine:', config.engine, 'language:', config.language);

    if (config.engine === 'browser') {
      this.startBrowserSpeech(config);
    } else {
      await this.startWhisperCapture(config);
    }
  }

  stop(): void {
    this.isActive = false;
    this.restartCount = this.maxRestarts; // Prevent restarts

    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch { /* ignore */ }
      this.recognition = null;
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        // This triggers ondataavailable (final chunk) then onstop asynchronously.
        // Do NOT clear audioChunks here — onstop needs all accumulated chunks
        // to build a valid WebM file (first chunk contains the EBML header).
        this.mediaRecorder.stop();
      } catch { /* ignore */ }
    } else {
      // No active recording — safe to clear
      this.audioChunks = [];
    }
    this.mediaRecorder = null;
    console.log('[Speech] Stopped');
  }

  isListening(): boolean {
    return this.isActive;
  }

  // ── Browser Web Speech API ─────────────────────────────

  private startBrowserSpeech(config: SpeechConfig): void {
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      console.warn('[Speech] Web Speech API not available');
      this.onError?.('Web Speech API is not available in this browser');
      return;
    }

    const recognition = new SpeechRecognitionClass();
    recognition.lang = config.language;
    recognition.continuous = config.continuous !== false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent): void => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      if (finalTranscript) {
        console.log('[Speech] Final transcript:', finalTranscript.substring(0, 50));
        this.onResult?.(finalTranscript, true);
      } else if (interimTranscript) {
        this.onResult?.(interimTranscript, false);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent): void => {
      if (event.error === 'aborted' || event.error === 'no-speech') return;

      console.warn('[Speech] Browser speech error:', event.error);

      // Auto-fallback to Whisper on critical errors
      if (FALLBACK_ERRORS.includes(event.error) && !this.triedWhisperFallback) {
        this.triedWhisperFallback = true;
        console.log('[Speech] Auto-falling back to Whisper...');

        // CRITICAL: Prevent onend from restarting browser recognition
        this.restartCount = this.maxRestarts;

        // Clean up browser recognition
        try { this.recognition?.abort(); } catch { /* ignore */ }
        this.recognition = null;

        // Attempt Whisper fallback
        const fallbackConfig = this.currentConfig || config;
        this.startWhisperCapture({ ...fallbackConfig, engine: 'whisper' }).catch((err) => {
          console.error('[Speech] Whisper fallback failed:', err);
          this.onError?.(`Whisper fallback failed: ${err instanceof Error ? err.message : String(err)}`);
        });
        return;
      }

      // If we already fell back to Whisper, ignore further browser errors silently
      if (this.triedWhisperFallback) {
        console.log('[Speech] Ignoring browser error (already using Whisper):', event.error);
        return;
      }

      // Show user-friendly error
      const friendlyMsg = FRIENDLY_ERRORS[event.error] || `Speech error: ${event.error}`;
      this.onError?.(friendlyMsg);
    };

    recognition.onend = (): void => {
      // Don't restart if we fell back to Whisper
      if (this.triedWhisperFallback) {
        console.log('[Speech] Browser recognition ended (Whisper fallback active, not restarting)');
        return;
      }

      if (this.isActive && this.restartCount < this.maxRestarts) {
        this.restartCount++;
        const delay = Math.min(1000 * Math.pow(2, this.restartCount - 1), 8000);
        console.log(`[Speech] Recognition ended, restarting in ${delay}ms (attempt ${this.restartCount})`);
        setTimeout(() => {
          if (this.isActive && !this.triedWhisperFallback) {
            try {
              recognition.start();
            } catch (err) {
              console.error('[Speech] Failed to restart browser recognition:', err);
            }
          }
        }, delay);
      } else {
        console.log('[Speech] Browser recognition ended (restarts exhausted or inactive)');
      }
    };

    this.recognition = recognition;

    try {
      recognition.start();
      console.log('[Speech] Browser speech recognition started');
    } catch (err) {
      console.error('[Speech] Failed to start browser recognition:', err);
      this.onError?.(err instanceof Error ? err.message : 'Failed to start speech recognition');
    }
  }

  // ── Whisper API via MediaRecorder ──────────────────────

  private async startWhisperCapture(config: SpeechConfig): Promise<void> {
    try {
      console.log('[Speech] Starting Whisper capture...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('[Speech] Whisper: microphone access granted, tracks:', stream.getAudioTracks().length);
      this.audioChunks = [];

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      console.log('[Speech] Whisper: using mimeType:', mimeType);

      const recorder = new MediaRecorder(stream, { mimeType });

      recorder.ondataavailable = (e: BlobEvent): void => {
        console.log('[Speech] Whisper: chunk received, size:', e.data.size);
        if (e.data.size > 0) {
          this.audioChunks.push(e.data);
        }
      };

      recorder.onstop = async (): Promise<void> => {
        console.log('[Speech] Whisper: recorder stopped, chunks:', this.audioChunks.length);
        stream.getTracks().forEach((t) => t.stop());

        if (this.audioChunks.length === 0) {
          console.warn('[Speech] Whisper: no audio chunks captured');
          return;
        }

        const blob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.audioChunks = [];
        console.log('[Speech] Whisper: combined blob, size:', blob.size);

        await this.transcribeWithWhisper(blob, config.language);
      };

      recorder.onerror = (e: Event): void => {
        console.error('[Speech] Whisper: MediaRecorder error:', e);
      };

      this.mediaRecorder = recorder;
      // Emit chunks every 5 seconds for interim processing
      recorder.start(5000);
      console.log('[Speech] Whisper MediaRecorder started, state:', recorder.state);
    } catch (err) {
      console.error('[Speech] Failed to start Whisper capture:', err);
      this.onError?.(err instanceof Error ? err.message : 'Failed to access microphone');
    }
  }

  private async transcribeWithWhisper(audioBlob: Blob, language: string): Promise<void> {
    try {
      console.log('[Speech] Whisper transcribe: blob size:', audioBlob.size, 'type:', audioBlob.type);

      // Minimum audio size check — very short/empty recordings won't transcribe
      if (audioBlob.size < 1000) {
        console.warn('[Speech] Whisper: audio blob too small, skipping:', audioBlob.size);
        return;
      }

      // Get OpenAI API key from store
      const { key } = await window.ghostAPI.store.getApiKey('openai');
      if (!key) {
        console.error('[Speech] Whisper: no OpenAI API key found');
        this.onError?.('OpenAI API key required for Whisper transcription. Set it in Settings > API Keys.');
        return;
      }
      console.log('[Speech] Whisper: API key found, length:', key.length, 'prefix:', key.substring(0, 7));

      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');
      formData.append('model', 'whisper-1');
      formData.append('language', language.split('-')[0]); // 'en-US' -> 'en'
      formData.append('response_format', 'text');

      console.log('[Speech] Whisper: calling OpenAI API (language:', language.split('-')[0], ')...');
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
        },
        body: formData,
      });

      if (!response.ok) {
        // Log the full error response body for diagnosis
        const errorBody = await response.text();
        console.error('[Speech] Whisper API error:', response.status, response.statusText);
        console.error('[Speech] Whisper API error body:', errorBody);
        this.onError?.(`Whisper API error ${response.status}: ${errorBody.substring(0, 200)}`);
        return;
      }

      const text = await response.text();
      console.log('[Speech] Whisper raw response length:', text.length);
      if (text.trim()) {
        console.log('[Speech] Whisper result:', text.trim().substring(0, 80));
        this.onResult?.(text.trim(), true);
      } else {
        console.log('[Speech] Whisper: empty transcription result (silence?)');
      }
    } catch (err) {
      console.error('[Speech] Whisper transcription failed:', err);
      this.onError?.(err instanceof Error ? err.message : 'Whisper transcription failed');
    }
  }
}
