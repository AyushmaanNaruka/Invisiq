import { Volume2, Radio } from 'lucide-react';
import type { AppSettings, SpeechEngine, AudioCaptureSource } from '@shared/types';

interface SettingsAudioProps {
  settings: AppSettings['audio'];
  meetingSettings: AppSettings['meeting'];
  onUpdate: (key: string, value: unknown) => Promise<void>;
}

const LANGUAGES = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'es-ES', label: 'Spanish' },
  { value: 'fr-FR', label: 'French' },
  { value: 'de-DE', label: 'German' },
  { value: 'it-IT', label: 'Italian' },
  { value: 'pt-BR', label: 'Portuguese (BR)' },
  { value: 'zh-CN', label: 'Chinese (Simplified)' },
  { value: 'ja-JP', label: 'Japanese' },
  { value: 'ko-KR', label: 'Korean' },
  { value: 'hi-IN', label: 'Hindi' },
  { value: 'ar-SA', label: 'Arabic' },
];

const ENGINES: { value: SpeechEngine; label: string; description: string }[] = [
  { value: 'browser', label: 'Web Speech API', description: 'Free — auto-falls back to Whisper if unavailable' },
  { value: 'whisper', label: 'OpenAI Whisper', description: 'Paid — requires OpenAI API key, higher accuracy' },
];

const AUDIO_SOURCES: { value: AudioCaptureSource; label: string; description: string }[] = [
  { value: 'system', label: 'System Audio', description: 'Capture what the computer plays (WASAPI loopback)' },
  { value: 'microphone', label: 'Microphone', description: 'Capture microphone input only' },
  { value: 'both', label: 'Both', description: 'Capture system audio and microphone combined' },
];

export default function SettingsAudio({
  settings,
  meetingSettings,
  onUpdate,
}: SettingsAudioProps): JSX.Element {
  return (
    <div className="space-y-5">
      {/* Info banner */}
      <div className="flex items-start gap-2 p-2.5 rounded-md bg-accent-primary/10 border border-accent-primary/20">
        <Volume2 size={14} className="text-accent-primary shrink-0 mt-0.5" />
        <p className="text-text-secondary text-[10px] leading-relaxed">
          Voice input transcribes your speech to text. In Meeting mode, transcripts can be automatically included with AI queries.
        </p>
      </div>

      {/* Speech Engine */}
      <div>
        <label className="block text-text-secondary text-xs mb-1.5">Speech Engine (Microphone)</label>
        <div className="space-y-2">
          {ENGINES.map((engine) => (
            <label
              key={engine.value}
              className={`flex items-start gap-2 cursor-pointer p-2 rounded-md border transition-colors ${
                settings.engine === engine.value
                  ? 'border-accent-primary bg-accent-primary/5'
                  : 'border-border-subtle hover:border-border-focus'
              }`}
            >
              <input
                type="radio"
                name="speech-engine"
                value={engine.value}
                checked={settings.engine === engine.value}
                onChange={() => onUpdate('audio.engine', engine.value)}
                className="mt-0.5 accent-[#14B8A6]"
              />
              <div>
                <span className="text-text-primary text-xs block">{engine.label}</span>
                <span className="text-text-placeholder text-[10px]">{engine.description}</span>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Language */}
      <div>
        <label className="block text-text-secondary text-xs mb-1.5">Language</label>
        <select
          value={settings.language}
          onChange={(e) => onUpdate('audio.language', e.target.value)}
          className="w-full bg-bg-input border border-border-subtle rounded-md px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-border-focus transition-colors"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.value} value={lang.value}>
              {lang.label}
            </option>
          ))}
        </select>
      </div>

      {/* Auto-include transcript */}
      <label className="flex items-center justify-between cursor-pointer">
        <div>
          <span className="text-text-primary text-xs block">Auto-include Transcript</span>
          <span className="text-text-placeholder text-[10px]">
            Prepend meeting transcript to AI queries in Meeting mode
          </span>
        </div>
        <input
          type="checkbox"
          checked={settings.autoIncludeTranscript}
          onChange={(e) => onUpdate('audio.autoIncludeTranscript', e.target.checked)}
          className="rounded accent-[#14B8A6]"
        />
      </label>

      {/* ── Meeting / System Audio ─────────────── */}
      <div className="pt-1 border-t border-border-subtle">
        <div className="flex items-center gap-1.5 mb-3">
          <Radio size={13} strokeWidth={1.75} className="text-accent-primary" />
          <span className="text-xs font-medium text-text-primary">Meeting Mode</span>
        </div>

        {/* System audio source */}
        <div className="mb-3">
          <label className="block text-text-secondary text-xs mb-1.5">Audio Source</label>
          <div className="space-y-1.5">
            {AUDIO_SOURCES.map((src) => (
              <label
                key={src.value}
                className={`flex items-start gap-2 cursor-pointer p-2 rounded-md border transition-colors ${
                  meetingSettings.audioSource === src.value
                    ? 'border-accent-primary bg-accent-primary/5'
                    : 'border-border-subtle hover:border-border-focus'
                }`}
              >
                <input
                  type="radio"
                  name="audio-source"
                  value={src.value}
                  checked={meetingSettings.audioSource === src.value}
                  onChange={() => onUpdate('meeting.audioSource', src.value)}
                  className="mt-0.5 accent-[#14B8A6]"
                />
                <div>
                  <span className="text-text-primary text-xs block">{src.label}</span>
                  <span className="text-text-placeholder text-[10px]">{src.description}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Auto-suggest */}
        <label className="flex items-center justify-between cursor-pointer mb-3">
          <div>
            <span className="text-text-primary text-xs block">Auto-suggest Answers</span>
            <span className="text-text-placeholder text-[10px]">
              AI generates answer suggestions when a question is detected
            </span>
          </div>
          <input
            type="checkbox"
            checked={meetingSettings.autoSuggestEnabled}
            onChange={(e) => onUpdate('meeting.autoSuggestEnabled', e.target.checked)}
            className="rounded accent-[#14B8A6]"
          />
        </label>

        {/* Live transcription */}
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <span className="text-text-primary text-xs block">Live Transcription</span>
            <span className="text-text-placeholder text-[10px]">
              Show real-time transcript in Meeting panel
            </span>
          </div>
          <input
            type="checkbox"
            checked={meetingSettings.liveTranscriptionEnabled}
            onChange={(e) => onUpdate('meeting.liveTranscriptionEnabled', e.target.checked)}
            className="rounded accent-[#14B8A6]"
          />
        </label>
      </div>
    </div>
  );
}
