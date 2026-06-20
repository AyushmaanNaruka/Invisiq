import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { expoOut } from '../../ui/animations';

interface ChapterHeadingProps {
  icon?: LucideIcon;
  eyebrow?: string;
  title: string;
  subtitle?: string;
}

/**
 * Consistent chapter title block used across every academy chapter. Keeps the
 * eyebrow → title → subtitle rhythm identical so the flow feels like one product,
 * not a pile of screens.
 */
export default function ChapterHeading({
  icon: Icon,
  eyebrow,
  title,
  subtitle,
}: ChapterHeadingProps): JSX.Element {
  return (
    <div>
      {(eyebrow || Icon) && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={expoOut}
          className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-primary"
        >
          {Icon && <Icon size={13} strokeWidth={2.1} />}
          {eyebrow && <span>{eyebrow}</span>}
        </motion.div>
      )}
      <motion.h2
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...expoOut, delay: 0.04 }}
        className="text-2xl font-semibold tracking-tight text-text-primary"
      >
        {title}
      </motion.h2>
      {subtitle && (
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...expoOut, delay: 0.09 }}
          className="mt-1.5 max-w-xl text-sm leading-relaxed text-text-secondary"
        >
          {subtitle}
        </motion.p>
      )}
    </div>
  );
}
