'use client';

import { motion } from 'framer-motion';
import { type ReactNode } from 'react';

interface StaggerItemProps {
  children: ReactNode;
  className?: string;
}

// Note: `filter: blur()` was intentionally removed — it forces a paint pass
// per frame (CSS filters are NOT GPU-composited like transform/opacity).
// On grids of 8+ cards this caused jank on integrated GPUs. The remaining
// transform + opacity animation is fully GPU-composited.
const itemVariants = {
  hidden: {
    opacity: 0,
    y: 30,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring' as const,
      damping: 20,
      stiffness: 100,
    },
  },
};

export function StaggerItem({
  children,
  className,
}: StaggerItemProps) {
  return (
    <motion.div
      variants={itemVariants}
      className={className}
    >
      {children}
    </motion.div>
  );
}
