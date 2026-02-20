import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

interface GhostCardProps extends HTMLMotionProps<'div'> {
  accent?: 'teal' | 'blue' | 'purple' | 'amber' | 'none';
  glass?: boolean;
  hoverable?: boolean;
  children: React.ReactNode;
  className?: string;
}

const accentClasses: Record<NonNullable<GhostCardProps['accent']>, string> = {
  teal:   'border-t-accent-primary',
  blue:   'border-t-accent-blue',
  purple: 'border-t-accent-purple',
  amber:  'border-t-accent-amber',
  none:   '',
};

export const GhostCard: React.FC<GhostCardProps> = ({
  accent = 'none',
  glass = false,
  hoverable = false,
  children,
  className = '',
  ...props
}) => {
  const hasAccent = accent !== 'none';

  return (
    <motion.div
      whileHover={hoverable ? { y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' } : {}}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={[
        'rounded-lg border',
        hasAccent ? 'border-t-2 ' + accentClasses[accent] : '',
        glass
          ? 'ghost-glass'
          : 'bg-surface-elevated border-border-subtle shadow-ghost-sm',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </motion.div>
  );
};
