/**
 * Screen Components Index
 *
 * Stage-level screen orchestrators and progress components for each phase
 * of the Hemisphere learning loop.
 */

// Encounter stage screens (RH-Primary — warm, narrative, expansive)
export {
  HookScreen,
  NarrativeScreen,
  SpatialOverviewScreen,
  EmotionalAnchorScreen,
  EncounterSession,
} from './encounter';
export type {
  HookScreenProps,
  NarrativeScreenProps,
  NarrativeSection,
  SpatialOverviewScreenProps,
  ConceptNode,
  EmotionalAnchorScreenProps,
  EncounterSessionProps,
} from './encounter';

// Analysis stage screens (LH-Primary — structured, precise, active)
export {
  AnalysisSession,
  AnalysisProgress,
} from './analysis';
export type {
  AnalysisSessionProps,
  AnalysisProgressProps,
  AnalysisContentItem,
  ActiveRecallContent,
  MCQContent,
  CategorizationContent,
  SequencingContent,
} from './analysis';

// Return stage screens (RH-Primary, Enriched — deep, reflective, contemplative)
export {
  ReconnectionScreen,
  TransferChallengeScreen,
  ReflectionScreen,
  ReturnSession,
} from './return';
export type {
  ReconnectionScreenProps,
  ReconnectionResult,
  ReconnectionTelemetryEvent,
  TransferChallengeScreenProps,
  TransferChallengeResult,
  TransferTelemetryEvent,
  TransferSelfRating,
  ReflectionScreenProps,
  ReflectionResult,
  ReflectionTelemetryEvent,
  ReturnSessionProps,
  ReturnSessionResult,
  ReturnSessionTelemetryEvent,
  ReconnectionScreenData,
  TransferChallengeScreenData,
  ReflectionScreenData,
} from './return';
