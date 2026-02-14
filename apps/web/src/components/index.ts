/**
 * Components Index
 *
 * Centralized exports for all Hemisphere components.
 * Sub-packages (ui, interactions) each have their own index.
 */

// Stage transition overlay
export { StageTransition } from './StageTransition';
export type { StageTransitionProps } from './StageTransition';

// Stage example / demo helpers
export {
  StageExample,
  StageCard,
  StageButton,
  StageInput,
  StageProgress,
  StageComparison,
} from './StageExample';

// UI primitives
export * from './ui';

// Interaction components
export * from './interactions';
