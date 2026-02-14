/**
 * Encounter Stage Screens
 *
 * Exports all four Encounter stage screens and the EncounterSession
 * orchestrator that sequences them.
 *
 * Stage character: warm amber palette, serif typography, slow organic motion.
 * All screens require a parent element (or the body) to carry
 * data-stage="encounter" — each component sets this on its own root div.
 */

export { HookScreen } from './HookScreen';
export type { HookScreenProps } from './HookScreen';

export { NarrativeScreen } from './NarrativeScreen';
export type { NarrativeScreenProps, NarrativeSection } from './NarrativeScreen';

export { SpatialOverviewScreen } from './SpatialOverviewScreen';
export type { SpatialOverviewScreenProps, ConceptNode } from './SpatialOverviewScreen';

export { EmotionalAnchorScreen } from './EmotionalAnchorScreen';
export type { EmotionalAnchorScreenProps } from './EmotionalAnchorScreen';

export { EncounterSession } from './EncounterSession';
export type { EncounterSessionProps } from './EncounterSession';
