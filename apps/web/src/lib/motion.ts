import type { Variants, Transition } from 'framer-motion';

/** Per-stage spring/ease configurations */
export const stageTransitions: Record<'encounter' | 'analysis' | 'return', Transition> = {
  encounter: { type: 'spring', stiffness: 120, damping: 20, mass: 1.2 },
  analysis:  { type: 'tween', duration: 0.22, ease: [0.4, 0, 0.2, 1] },
  return:    { type: 'spring', stiffness: 80, damping: 25, mass: 1.5 },
};

/** Page-level enter/exit variants (used by screen components) */
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -8 },
};

/** Card reveal — used by item cards across all stages */
export const cardVariants: Variants = {
  hidden:  { opacity: 0, scale: 0.96, y: 8 },
  visible: { opacity: 1, scale: 1,    y: 0 },
};

/** Stagger container — wraps lists of cards */
export const staggerContainer: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

/** Encounter-specific: organic floating pulse for the hook screen */
export const floatVariants: Variants = {
  rest:   { y: 0 },
  float:  { y: [-4, 4, -4], transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' } },
};

/** Analysis-specific: precise slide-in from left for structured lists */
export const slideInLeft: Variants = {
  hidden:  { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
};

/** Return-specific: gentle fade-up for reflection prompts */
export const fadeUpSlow: Variants = {
  hidden:  { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};
