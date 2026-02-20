/**
 * useMeetingAssistant — Phase 4 / Sprint 15
 *
 * Watches live transcript for interrogative patterns and optionally
 * auto-suggests AI answers after a configurable silence threshold.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { MeetingQuestion } from '@shared/types';

// Words that strongly indicate a question in conversation
const QUESTION_KEYWORDS = [
  'what', 'how', 'why', 'where', 'when', 'who', 'which',
  'could you', 'can you', 'would you', 'do you', 'did you',
  'have you', 'is there', 'are there', 'tell me', 'explain',
];

function isLikelyQuestion(text: string): boolean {
  const lower = text.toLowerCase().trim();
  if (lower.endsWith('?')) return true;
  return QUESTION_KEYWORDS.some((kw) => lower.includes(kw));
}

function extractQuestion(transcript: string): string | null {
  // Look at the last 2-3 sentences for a question
  const sentences = transcript.split(/[.!?\n]+/).map((s) => s.trim()).filter(Boolean);
  const recent = sentences.slice(-3);
  const question = recent.find(isLikelyQuestion);
  return question || null;
}

interface UseMeetingAssistantOptions {
  liveTranscript: string;
  silenceThresholdMs?: number;
  autoSuggestEnabled?: boolean;
  onAutoSuggest?: (question: MeetingQuestion) => void;
}

interface UseMeetingAssistantReturn {
  detectedQuestions: MeetingQuestion[];
  activeQuestion: MeetingQuestion | null;
  dismissQuestion: (id: string) => void;
  clearAll: () => void;
}

let questionCounter = 0;

export function useMeetingAssistant({
  liveTranscript,
  silenceThresholdMs = 3000,
  autoSuggestEnabled = false,
  onAutoSuggest,
}: UseMeetingAssistantOptions): UseMeetingAssistantReturn {
  const [detectedQuestions, setDetectedQuestions] = useState<MeetingQuestion[]>([]);
  const [activeQuestion, setActiveQuestion] = useState<MeetingQuestion | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTranscriptRef = useRef('');
  const seenQuestionsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!liveTranscript || liveTranscript === lastTranscriptRef.current) return;
    lastTranscriptRef.current = liveTranscript;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const question = extractQuestion(liveTranscript);
      if (!question || seenQuestionsRef.current.has(question)) return;

      seenQuestionsRef.current.add(question);
      const newQ: MeetingQuestion = {
        id: `q-${++questionCounter}`,
        text: question,
        suggestedAnswer: null,
        timestamp: new Date().toISOString(),
        confidence: question.endsWith('?') ? 0.9 : 0.7,
      };

      setDetectedQuestions((prev) => [newQ, ...prev].slice(0, 10));
      setActiveQuestion(newQ);

      if (autoSuggestEnabled && onAutoSuggest) {
        onAutoSuggest(newQ);
      }
    }, silenceThresholdMs);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [liveTranscript, silenceThresholdMs, autoSuggestEnabled, onAutoSuggest]);

  const dismissQuestion = useCallback((id: string) => {
    setDetectedQuestions((prev) => prev.filter((q) => q.id !== id));
    setActiveQuestion((prev) => (prev?.id === id ? null : prev));
  }, []);

  const clearAll = useCallback(() => {
    setDetectedQuestions([]);
    setActiveQuestion(null);
    seenQuestionsRef.current.clear();
  }, []);

  return { detectedQuestions, activeQuestion, dismissQuestion, clearAll };
}
