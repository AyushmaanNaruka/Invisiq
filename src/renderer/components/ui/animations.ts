// Centralized Framer Motion animation variants for InvisiQ
// ALL state transitions should use these variants for consistency.
// Import from here, never define inline variants in components.

import type { Variants, Transition } from 'framer-motion';

// ═══ Shared Transitions ═══

export const expoOut: Transition = { duration: 0.3, ease: [0.16, 1, 0.3, 1] };
export const expoIn: Transition = { duration: 0.2, ease: [0.4, 0, 1, 1] };
export const smooth: Transition = { duration: 0.2, ease: [0.4, 0, 0.2, 1] };
export const springy: Transition = { type: 'spring', stiffness: 400, damping: 30 };
export const springySlow: Transition = { type: 'spring', stiffness: 300, damping: 28 };

// ═══ Fade ═══

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: smooth },
  exit: { opacity: 0, transition: { duration: 0.15, ease: 'easeIn' } },
};

// ═══ Fade + Slide Up (chat messages, toasts, cards) ═══

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: expoOut },
  exit: { opacity: 0, y: -4, transition: { duration: 0.15, ease: 'easeIn' } },
};

// ═══ Fade + Slide Down (dropdowns) ═══

export const fadeInDown: Variants = {
  hidden: { opacity: 0, y: -6, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: expoOut },
  exit: { opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.12 } },
};

// ═══ Scale In (modals, popovers, notifications) ═══

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: expoOut },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.12, ease: 'easeIn' } },
};

// ═══ Scale In with spring (buttons feedback, badges) ═══

export const scaleInSpring: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: springy },
  exit: { opacity: 0, scale: 0.9, transition: { duration: 0.1 } },
};

// ═══ Slide In from Right (settings panel, history panel) ═══

export const slideInRight: Variants = {
  hidden: { x: '100%', opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
  exit: { x: '100%', opacity: 0, transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } },
};

// ═══ Slide In from Left (meeting panel) ═══

export const slideInLeft: Variants = {
  hidden: { x: '-100%', opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
  exit: { x: '-100%', opacity: 0, transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } },
};

// ═══ Toast Notifications ═══

export const toastSlide: Variants = {
  hidden: { opacity: 0, x: 24, scale: 0.94 },
  visible: { opacity: 1, x: 0, scale: 1, transition: { type: 'spring', stiffness: 500, damping: 35 } },
  exit: { opacity: 0, x: 24, scale: 0.92, transition: { duration: 0.15, ease: 'easeIn' } },
};

// ═══ Presence height (collapsible sections) ═══

export const collapseHeight: Variants = {
  hidden: { opacity: 0, height: 0, overflow: 'hidden' },
  visible: { opacity: 1, height: 'auto', overflow: 'visible', transition: expoOut },
  exit: { opacity: 0, height: 0, overflow: 'hidden', transition: { duration: 0.2, ease: 'easeIn' } },
};

// ═══ Academy chapter step (directional slide; pass `custom={dir}`) ═══

export const chapterStep: Variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 32 : -32 }),
  center: { opacity: 1, x: 0, transition: expoOut },
  exit: (dir: number) => ({
    opacity: 0,
    x: dir > 0 ? -32 : 32,
    transition: { duration: 0.18, ease: [0.4, 0, 1, 1] as const },
  }),
};

// ═══ Staggered list container ═══

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.05 },
  },
};

// ═══ Stagger child item ═══

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } },
};

// ═══ Chat message container (with stagger for initial load) ═══

export const messageContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
};

// ═══ Individual chat message ═══

export const messageVariant: Variants = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: expoOut },
};

// ═══ Button interactions ═══

export const buttonPress: Variants = {
  idle: { scale: 1 },
  hover: { scale: 1.03, transition: { type: 'spring', stiffness: 400, damping: 20 } },
  tap: { scale: 0.96, transition: { duration: 0.08 } },
};

// ═══ Icon swap (copy → check, etc.) ═══

export const iconSwap: Variants = {
  enter: { opacity: 0, scale: 0.7, rotate: -10 },
  center: { opacity: 1, scale: 1, rotate: 0, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, scale: 0.7, rotate: 10, transition: { duration: 0.1 } },
};

// ═══ Overlay window (show/hide) ═══

export const overlayWindow: Variants = {
  hidden: { opacity: 0, scale: 0.97, filter: 'blur(4px)', transition: { duration: 0.15, ease: 'easeIn' } },
  visible: { opacity: 1, scale: 1, filter: 'blur(0px)', transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } },
};

// ═══ Scan/pulse (code detection, live listening indicator) ═══

export const scanPulse: Variants = {
  idle: { opacity: 0.5, scale: 1 },
  active: {
    opacity: [0.5, 1, 0.5],
    scale: [1, 1.05, 1],
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
  },
};

// ═══ Thinking dots ═══

export const thinkingDot: Variants = {
  initial: { opacity: 0.3, y: 0 },
  animate: {
    opacity: [0.3, 1, 0.3],
    y: [0, -4, 0],
    transition: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' },
  },
};
