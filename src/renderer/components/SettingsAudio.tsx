import { Volume2 } from 'lucide-react';
import type { AppSettings, SpeechEngine } from '@shared/types';

interface SettingsAudioProps {
  settings: AppSettings['audio'];
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

export default function SettingsAudio({
  settings,
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
        <label className="block text-text-secondary text-xs mb-1.5">Speech Engine</label>
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
                className="mt-0.5 accent-[#00B894]"
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
          className="rounded accent-[#00B894]"
        />
      </label>
    </div>
  );
}
