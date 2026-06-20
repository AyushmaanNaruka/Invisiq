import type { ComponentType } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Sparkles, KeyRound, Shield, MessageSquare, Camera, Keyboard, EyeOff, LayoutGrid, Settings as SettingsIcon, Rocket } from 'lucide-react';

import ChWelcome from './chapters/ChWelcome';
import ChConnectAI from './chapters/ChConnectAI';
import ChInvisible from './chapters/ChInvisible';
import ChAskAnything from './chapters/ChAskAnything';
import ChSeeScreen from './chapters/ChSeeScreen';
import ChStealthTyping from './chapters/ChStealthTyping';
import ChControl from './chapters/ChControl';
import ChGallery from './chapters/ChGallery';
import ChSettingsTour from './chapters/ChSettingsTour';
import ChReady from './chapters/ChReady';

export type AcademyMode = 'first-run' | 'replay';
export type ChapterGroup = 'Setup' | 'The basics' | 'Going further' | 'Finish';

export interface ChapterDef {
  key: string;
  /** Short rail label. */
  label: string;
  icon: LucideIcon;
  group: ChapterGroup;
  Component: ComponentType;
  /** Hidden when the academy is replayed (functional setup steps). */
  firstRunOnly?: boolean;
}

/**
 * The ordered academy manifest. Setup steps (Connect AI) are firstRunOnly, so a
 * replay from Settings teaches the features without re-running setup. AcademyShell
 * filters by mode via {@link chaptersForMode}.
 */
export const CHAPTERS: ChapterDef[] = [
  { key: 'welcome', label: 'Welcome', icon: Sparkles, group: 'Setup', Component: ChWelcome },
  { key: 'connect', label: 'Connect AI', icon: KeyRound, group: 'Setup', Component: ChConnectAI, firstRunOnly: true },
  { key: 'invisible', label: 'Invisible', icon: Shield, group: 'Setup', Component: ChInvisible },
  { key: 'ask', label: 'Ask anything', icon: MessageSquare, group: 'The basics', Component: ChAskAnything },
  { key: 'see', label: 'See your screen', icon: Camera, group: 'The basics', Component: ChSeeScreen },
  { key: 'stealth-typing', label: 'Stealth typing', icon: Keyboard, group: 'The basics', Component: ChStealthTyping },
  { key: 'control', label: 'Stay in control', icon: EyeOff, group: 'The basics', Component: ChControl },
  { key: 'gallery', label: 'Power features', icon: LayoutGrid, group: 'Going further', Component: ChGallery },
  { key: 'settings', label: 'Settings', icon: SettingsIcon, group: 'Going further', Component: ChSettingsTour },
  { key: 'ready', label: 'Ready', icon: Rocket, group: 'Finish', Component: ChReady },
];

export function chaptersForMode(mode: AcademyMode): ChapterDef[] {
  return mode === 'replay' ? CHAPTERS.filter((c) => !c.firstRunOnly) : CHAPTERS;
}
