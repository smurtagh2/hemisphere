/**
 * Return Stage Screen Components
 *
 * Three interaction screens that implement the Return stage of the Hemisphere
 * learning loop — the right-hemisphere integration phase. Deep, reflective,
 * contemplative. Learning is consolidated here.
 *
 * Sequence (orchestrated by ReturnSession):
 *   1. ReconnectionScreen      — bridge concept to prior knowledge
 *   2. TransferChallengeScreen — apply concept to a novel context
 *   3. ReflectionScreen        — open-ended epistemic self-assessment
 *
 * Design tokens: data-stage="return", coral/mauve palette, serif fonts,
 * slowest motion (500–1000 ms).
 */

// ReconnectionScreen
export { ReconnectionScreen } from './ReconnectionScreen';
export type {
  ReconnectionScreenProps,
  ReconnectionResult,
  ReconnectionTelemetryEvent,
} from './ReconnectionScreen';

// TransferChallengeScreen
export { TransferChallengeScreen } from './TransferChallengeScreen';
export type {
  TransferChallengeScreenProps,
  TransferChallengeResult,
  TransferTelemetryEvent,
  TransferSelfRating,
} from './TransferChallengeScreen';

// ReflectionScreen
export { ReflectionScreen } from './ReflectionScreen';
export type {
  ReflectionScreenProps,
  ReflectionResult,
  ReflectionTelemetryEvent,
} from './ReflectionScreen';

// ReturnSession — orchestrator
export { ReturnSession } from './ReturnSession';
export type {
  ReturnSessionProps,
  ReturnSessionResult,
  ReturnSessionTelemetryEvent,
  ReconnectionScreenData,
  TransferChallengeScreenData,
  ReflectionScreenData,
} from './ReturnSession';
