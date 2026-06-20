import { useRef, type ReactNode } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion';

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  /** Max tilt in degrees at the corners. */
  intensity?: number;
}

/**
 * A pointer-driven 3D-tilt wrapper for premium feel on the showcase gallery cards.
 * The card rotates toward the cursor with a soft spring and lifts a touch with a
 * teal glow. Reduced-motion users get a plain static card (no transform at all).
 */
export default function TiltCard({ children, className = '', intensity = 8 }: TiltCardProps): JSX.Element {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(py, [0, 1], [intensity, -intensity]), { stiffness: 220, damping: 18 });
  const rotateY = useSpring(useTransform(px, [0, 1], [-intensity, intensity]), { stiffness: 220, damping: 18 });

  const handleMove = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (reduce) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
  };

  const handleLeave = (): void => {
    px.set(0.5);
    py.set(0.5);
  };

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ rotateX, rotateY, transformPerspective: 700, transformStyle: 'preserve-3d' }}
      whileHover={{ scale: 1.02, transition: { type: 'spring', stiffness: 300, damping: 22 } }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
