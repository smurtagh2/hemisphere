/**
 * Interaction Components Index
 *
 * Analysis-stage interaction components used during the focused, analytical
 * phase of the Hemisphere learning loop.
 *
 * Return-stage components (CreativeSynthesis, ConnectionMapping) are also
 * exported here for centralised access.
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

// Sequencing — arrange items in the correct order (click-to-reorder MVP)
export { Sequencing } from './Sequencing';
export type {
  SequencingProps,
  SequencingItem,
  SequencingPosition,
  SequencingResult,
  SequencingTelemetryEvent,
} from './Sequencing';

// SequencingDnD — drag-and-drop variant of Sequencing (@dnd-kit/sortable)
export { SequencingDnD } from './SequencingDnD';

// Categorization — click-to-assign item sorting into named categories
export { Categorization } from './Categorization';
export type {
  CategorizationProps,
  CategorizationItem,
  CategorizationCategory,
  CategorizationResult,
  CategorizationTelemetryEvent,
} from './Categorization';

// CategorizationDnD — drag-and-drop variant of Categorization (@dnd-kit/core)
export { CategorizationDnD } from './CategorizationDnD';

// CreativeSynthesis — Return-stage free-form creative reflection activity
export { CreativeSynthesis } from './CreativeSynthesis';
export type { CreativeSynthesisProps } from './CreativeSynthesis';

// ConnectionMapping — Return-stage prompted concept connection activity
export { ConnectionMapping } from './ConnectionMapping';
export type { ConnectionMappingProps } from './ConnectionMapping';
