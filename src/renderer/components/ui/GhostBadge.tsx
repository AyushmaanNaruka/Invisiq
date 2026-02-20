import React from 'react';

export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'primary';

interface GhostBadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-status-success/15 text-status-success border-status-success/25',
  warning: 'bg-status-warning/15 text-status-warning border-status-warning/25',
  error:   'bg-status-error/15 text-status-error border-status-error/25',
  info:    'bg-accent-blue/15 text-accent-blue border-accent-blue/25',
  neutral: 'bg-surface-elevated text-text-secondary border-border-subtle',
  primary: 'bg-accent-primary/15 text-accent-primary border-accent-primary/25',
};

const dotClasses: Record<BadgeVariant, string> = {
  success: 'bg-status-success',
  warning: 'bg-status-warning',
  error:   'bg-status-error',
  info:    'bg-accent-blue',
  neutral: 'bg-text-secondary',
  primary: 'bg-accent-primary',
};

export const GhostBadge: React.FC<GhostBadgeProps> = ({
  variant = 'neutral',
  children,
  dot = false,
  className = '',
}) => {
  return (
    <span
      className={[
        'inline-flex items-center gap-1 px-1.5 py-0.5',
        'text-xs font-medium rounded-sm border',
        variantClasses[variant],
        className,
      ].join(' ')}
    >
      {dot && (
        <span
          className={['w-1.5 h-1.5 rounded-full flex-shrink-0', dotClasses[variant]].join(' ')}
        />
      )}
      {children}
    </span>
  );
};
