'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { pageVariants, stageTransitions } from '@/lib/motion';

interface MotionPageProps {
  stage: 'encounter' | 'analysis' | 'return';
  children: React.ReactNode;
  pageKey: string;
}

export function MotionPage({ stage, children, pageKey }: MotionPageProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pageKey}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={stageTransitions[stage]}
        style={{ width: '100%', height: '100%' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
