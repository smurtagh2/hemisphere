'use client';
import { motion } from 'framer-motion';
import { cardVariants, stageTransitions } from '@/lib/motion';

interface MotionCardProps {
  stage: 'encounter' | 'analysis' | 'return';
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

export function MotionCard({ stage, children, style, className }: MotionCardProps) {
  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      transition={stageTransitions[stage]}
      style={style}
      className={className}
    >
      {children}
    </motion.div>
  );
}
