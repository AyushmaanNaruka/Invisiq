import React, { forwardRef } from 'react';
import { X } from 'lucide-react';

interface GhostInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  icon?: React.ReactNode;
  onClear?: () => void;
  size?: 'sm' | 'md';
  error?: string;
}

export const GhostInput = forwardRef<HTMLInputElement, GhostInputProps>(
  ({ icon, onClear, size = 'md', error, className = '', value, ...props }, ref) => {
    const hasValue = value !== undefined && value !== '';

    return (
      <div className="relative flex flex-col gap-1">
        <div className="relative flex items-center">
          {icon && (
            <span className="absolute left-2.5 text-text-placeholder flex-shrink-0 pointer-events-none">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            value={value}
            className={[
              'w-full bg-bg-input text-text-primary placeholder-text-placeholder',
              'border border-border-subtle rounded-md',
              'transition-all duration-fast',
              'focus:outline-none focus:border-border-focus focus:shadow-glow-teal/30',
              error ? 'border-status-error focus:border-status-error focus:shadow-none' : '',
              icon ? 'pl-8' : 'pl-3',
              onClear && hasValue ? 'pr-8' : 'pr-3',
              size === 'sm' ? 'h-7 text-sm' : 'h-8 text-sm',
              'no-drag',
              className,
            ].join(' ')}
            {...props}
          />
          {onClear && hasValue && (
            <button
              type="button"
              onClick={onClear}
              className="absolute right-2 text-text-placeholder hover:text-text-secondary transition-colors p-0.5 rounded-sm"
            >
              <X size={12} strokeWidth={1.75} />
            </button>
          )}
        </div>
        {error && (
          <p className="text-xs text-status-error">{error}</p>
        )}
      </div>
    );
  }
);

GhostInput.displayName = 'GhostInput';
