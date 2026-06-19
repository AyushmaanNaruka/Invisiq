/**
 * CodeDetectionCard — Phase 4 / Sprint 15
 *
 * Dismissible notification card shown when a coding platform is detected on
 * screen. A passive heads-up only — InvisiQ has a single universal mode, so
 * there is no mode to switch to; the model already adapts to code on screen.
 */

import { motion } from 'framer-motion';
import { Code, X } from 'lucide-react';
import { scaleIn } from './ui/animations';
import type { CodeDetectionResult, CodePlatform } from '@shared/types';

const PLATFORM_LABELS: Record<CodePlatform, string> = {
  leetcode: 'LeetCode',
  hackerrank: 'HackerRank',
  codeforces: 'Codeforces',
  codesignal: 'CodeSignal',
  algoexpert: 'AlgoExpert',
  pramp: 'Pramp',
  coderbyte: 'Coderbyte',
  'generic-ide': 'Code Editor',
  unknown: 'Unknown',
};

const PLATFORM_COLORS: Partial<Record<CodePlatform, string>> = {
  leetcode: 'text-accent-amber border-accent-amber/30 bg-accent-amber/5',
  hackerrank: 'text-status-success border-status-success/30 bg-status-success/5',
  codeforces: 'text-accent-blue border-accent-blue/30 bg-accent-blue/5',
  codesignal: 'text-accent-purple border-accent-purple/30 bg-accent-purple/5',
  algoexpert: 'text-accent-cyan border-accent-cyan/30 bg-accent-cyan/5',
  'generic-ide': 'text-text-secondary border-border-subtle bg-surface-elevated',
};

interface CodeDetectionCardProps {
  detection: CodeDetectionResult;
  onDismiss: () => void;
}

export default function CodeDetectionCard({
  detection,
  onDismiss,
}: CodeDetectionCardProps): JSX.Element {
  const label = PLATFORM_LABELS[detection.platform] ?? 'Coding Platform';
  const colorClass = PLATFORM_COLORS[detection.platform] ?? PLATFORM_COLORS['generic-ide']!;

  return (
    <motion.div
      key="code-detection"
      variants={scaleIn}
      initial="hidden"
      animate="visible"
      exit="hidden"
      className={`mx-2 mb-1 rounded-lg border px-3 py-2 flex items-center gap-2 ${colorClass}`}
    >
      <Code size={14} strokeWidth={1.75} className="shrink-0" />

      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">
          {label} detected
          {detection.language && (
            <span className="font-normal text-text-secondary ml-1">· {detection.language}</span>
          )}
        </p>
      </div>

      <button
        onClick={onDismiss}
        className="p-0.5 hover:opacity-60 transition-opacity shrink-0"
      >
        <X size={12} strokeWidth={2} />
      </button>
    </motion.div>
  );
}
