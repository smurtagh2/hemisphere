'use client';
import { assignVariant, type Experiment, type ExperimentVariant } from '@hemisphere/shared';

/** Returns the assigned variant for the given experiment, or null if not in experiment */
export function useExperiment(userId: string | null, experiment: Experiment): ExperimentVariant | null {
  if (!userId) return null;
  return assignVariant(userId, experiment);
}
