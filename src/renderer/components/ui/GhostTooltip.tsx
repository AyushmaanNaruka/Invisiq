import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface TooltipPosition {
  top: number;
  left: number;
  placement: 'top' | 'bottom';
}

interface GhostTooltipProps {
  content: string;
  children: React.ReactElement;
  delay?: number;
  placement?: 'top' | 'bottom';
  disabled?: boolean;
}

export const GhostTooltip: React.FC<GhostTooltipProps> = ({
  content,
  children,
  delay = 400,
  placement = 'top',
  disabled = false,
}) => {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<TooltipPosition>({ top: 0, left: 0, placement });
  const triggerRef = useRef<HTMLElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const computePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const tooltipHeight = 28;
    const gap = 6;

    let top: number;
    let resolvedPlacement: 'top' | 'bottom' = placement;

    if (placement === 'top') {
      top = rect.top - tooltipHeight - gap;
      if (top < 4) {
        top = rect.bottom + gap;
        resolvedPlacement = 'bottom';
      }
    } else {
      top = rect.bottom + gap;
      if (top + tooltipHeight > window.innerHeight - 4) {
        top = rect.top - tooltipHeight - gap;
        resolvedPlacement = 'top';
      }
    }

    setPosition({
      top,
      left: rect.left + rect.width / 2,
      placement: resolvedPlacement,
    });
  }, [placement]);

  const show = useCallback(() => {
    if (disabled) return;
    timerRef.current = setTimeout(() => {
      computePosition();
      setVisible(true);
    }, delay);
  }, [disabled, delay, computePosition]);

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  }, []);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const child = React.cloneElement(children, {
    ref: (el: HTMLElement | null) => {
      triggerRef.current = el;
      const childRef = (children as unknown as { ref?: React.Ref<HTMLElement> }).ref;
      if (typeof childRef === 'function') childRef(el);
      else if (childRef && 'current' in childRef) (childRef as React.MutableRefObject<HTMLElement | null>).current = el;
    },
    onMouseEnter: (e: React.MouseEvent) => {
      show();
      children.props.onMouseEnter?.(e);
    },
    onMouseLeave: (e: React.MouseEvent) => {
      hide();
      children.props.onMouseLeave?.(e);
    },
    onFocus: (e: React.FocusEvent) => {
      show();
      children.props.onFocus?.(e);
    },
    onBlur: (e: React.FocusEvent) => {
      hide();
      children.props.onBlur?.(e);
    },
  });

  return (
    <>
      {child}
      {createPortal(
        <AnimatePresence>
          {visible && (
            <motion.div
              ref={tooltipRef}
              initial={{ opacity: 0, y: position.placement === 'top' ? 4 : -4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.1 } }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              style={{
                position: 'fixed',
                top: position.top,
                left: position.left,
                transform: 'translateX(-50%)',
                zIndex: 9999,
                pointerEvents: 'none',
              }}
              className="px-2 py-1 bg-bg-header border border-border-subtle rounded-md shadow-dropdown text-xs text-text-secondary whitespace-nowrap"
            >
              {content}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};
