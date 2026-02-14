/**
 * Interaction Components Index
 *
 * Analysis-stage interaction components used during the focused, analytical
 * phase of the Hemisphere learning loop.
 */

export { ActiveRecall } from './ActiveRecall';
export type {
  ActiveRecallProps,
  ActiveRecallRating,
  ActiveRecallEventName,
  ActiveRecallTelemetryEvent,
  ActiveRecallResponsePayload,
  ActiveRecallRatingPayload,
  ActiveRecallTimePayload,
} from './ActiveRecall';

// MCQ — Multiple Choice Question with distractor feedback
export { MCQ } from './MCQ';
export type { MCQProps, MCQOption, MCQResult, MCQTelemetryEvent } from './MCQ';

// Sequencing — arrange items in the correct order
export { Sequencing } from './Sequencing';
export type {
  SequencingProps,
  SequencingItem,
  SequencingPosition,
  SequencingResult,
  SequencingTelemetryEvent,
} from './Sequencing';

// Categorization — click-to-assign item sorting into named categories
export { Categorization } from './Categorization';
export type {
  CategorizationProps,
  CategorizationItem,
  CategorizationCategory,
  CategorizationResult,
  CategorizationTelemetryEvent,
} from './Categorization';
