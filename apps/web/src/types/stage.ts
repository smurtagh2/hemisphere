/**
 * Stage Type Definitions
 *
 * Type definitions for the three learning stages and related concepts.
 */

/**
 * The three learning stages in the Hemisphere methodology
 */
export type LearningStage = 'encounter' | 'analysis' | 'return';

/**
 * Theme mode (light/dark)
 */
export type ThemeMode = 'light' | 'dark';

/**
 * Stage transition states
 */
export type StageTransition =
  | 'encounter-to-analysis'
  | 'analysis-to-return'
  | 'return-to-encounter'
  | null;

/**
 * Stage metadata
 */
export interface StageMetadata {
  stage: LearningStage;
  displayName: string;
  description: string;
  icon: string;
  color: string;
}

/**
 * Stage configuration
 */
export const STAGE_CONFIG: Record<LearningStage, StageMetadata> = {
  encounter: {
    stage: 'encounter',
    displayName: 'Encounter',
    description: 'Warm, organic, expansive - the right hemisphere engages with the whole',
    icon: '👁️',
    color: '#E8913A',
  },
  analysis: {
    stage: 'analysis',
    displayName: 'Analysis',
    description: 'Cool, precise, structured - the left hemisphere analyzes and categorizes',
    icon: '🔬',
    color: '#4A9EDE',
  },
  return: {
    stage: 'return',
    displayName: 'Return',
    description: 'Deep, reflective, integrative - return to the whole with new understanding',
    icon: '🌅',
    color: '#D4724A',
  },
};

/**
 * Stage duration in milliseconds
 */
export const STAGE_TRANSITION_DURATION = 1500;

/**
 * Get stage metadata
 */
export function getStageMetadata(stage: LearningStage): StageMetadata {
  return STAGE_CONFIG[stage];
}

/**
 * Get next stage in the learning loop
 */
export function getNextStage(currentStage: LearningStage): LearningStage {
  const stages: LearningStage[] = ['encounter', 'analysis', 'return'];
  const currentIndex = stages.indexOf(currentStage);
  const nextIndex = (currentIndex + 1) % stages.length;
  return stages[nextIndex];
}

/**
 * Get previous stage in the learning loop
 */
export function getPreviousStage(currentStage: LearningStage): LearningStage {
  const stages: LearningStage[] = ['encounter', 'analysis', 'return'];
  const currentIndex = stages.indexOf(currentStage);
  const previousIndex = (currentIndex - 1 + stages.length) % stages.length;
  return stages[previousIndex];
}

/**
 * Check if a stage is right-hemisphere dominant
 */
export function isRightHemisphereStage(stage: LearningStage): boolean {
  return stage === 'encounter' || stage === 'return';
}

/**
 * Check if a stage is left-hemisphere dominant
 */
export function isLeftHemisphereStage(stage: LearningStage): boolean {
  return stage === 'analysis';
}
