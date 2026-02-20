import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { LoaderCircle } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

interface GhostButtonProps extends Omit<HTMLMotionProps<'button'>, 'size'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  children?: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-accent-primary text-bg-overlay hover:bg-accent-primary/90 border border-transparent shadow-ghost-sm',
  secondary:
    'bg-surface-elevated text-text-primary hover:bg-bg-hover border border-border-subtle',
  ghost:
    'bg-transparent text-text-secondary hover:bg-bg-hover hover:text-text-primary border border-transparent',
  danger:
    'bg-status-error/10 text-status-error hover:bg-status-error/20 border border-status-error/30',
};

const sizeClasses: Record<ButtonSize, string> = {
  xs: 'h-5 px-2 text-xs gap-1 rounded-sm',
  sm: 'h-6 px-2 text-sm gap-1.5 rounded-sm',
  md: 'h-8 px-3 text-sm gap-2 rounded-md',
  lg: 'h-9 px-4 text-md gap-2 rounded-md',
};

const iconOnlySizeClasses: Record<ButtonSize, string> = {
  xs: 'h-5 w-5 rounded-sm',
  sm: 'h-6 w-6 rounded-sm',
  md: 'h-8 w-8 rounded-md',
  lg: 'h-9 w-9 rounded-md',
};

export const GhostButton = React.forwardRef<HTMLButtonElement, GhostButtonProps>(
  (
    {
      variant = 'ghost',
      size = 'md',
      icon,
      iconPosition = 'left',
      loading = false,
      children,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const isIconOnly = icon && !children;
    const sizeClass = isIconOnly ? iconOnlySizeClasses[size] : sizeClasses[size];
    const isDisabled = disabled || loading;

    return (
      <motion.button
        ref={ref}
        whileHover={!isDisabled ? { scale: 1.02 } : {}}
        whileTap={!isDisabled ? { scale: 0.96 } : {}}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        disabled={isDisabled}
        className={[
          'inline-flex items-center justify-center font-medium',
          'transition-colors duration-fast',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-1 focus-visible:ring-offset-bg-overlay',
          'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
          'select-none no-drag',
          variantClasses[variant],
          sizeClass,
          className,
        ].join(' ')}
        {...props}
      >
        {loading ? (
          <LoaderCircle size={14} className="animate-spin" strokeWidth={1.75} />
        ) : (
          <>
            {icon && iconPosition === 'left' && (
              <span className="flex-shrink-0">{icon}</span>
            )}
            {children}
            {icon && iconPosition === 'right' && (
              <span className="flex-shrink-0">{icon}</span>
            )}
          </>
        )}
      </motion.button>
    );
  }
);

GhostButton.displayName = 'GhostButton';
