import React from 'react';

interface GhostDividerProps {
  label?: string;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export const GhostDivider: React.FC<GhostDividerProps> = ({
  label,
  orientation = 'horizontal',
  className = '',
}) => {
  if (orientation === 'vertical') {
    return (
      <div
        className={['w-px self-stretch bg-border-subtle opacity-60', className].join(' ')}
      />
    );
  }

  if (label) {
    return (
      <div className={['flex items-center gap-2 my-1', className].join(' ')}>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent to-border-subtle" />
        <span className="text-xs text-text-placeholder px-1 flex-shrink-0">{label}</span>
        <div className="flex-1 h-px bg-gradient-to-l from-transparent to-border-subtle" />
      </div>
    );
  }

  return (
    <div
      className={['h-px bg-border-subtle opacity-60 my-1', className].join(' ')}
    />
  );
};
