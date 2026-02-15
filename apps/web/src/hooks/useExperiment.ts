'use client';

import { useMemo } from 'react';
import { assignVariant } from '@hemisphere/shared';
import { EXPERIMENTS } from '@hemisphere/shared/experiments-catalog';
import type { Experiment } from '@hemisphere/shared';

/**
 * Returns the variant id assigned to the current user for the given experiment,
 * or null if the user falls outside the traffic fraction or the experiment is unknown.
 *
 * The userId is persisted in localStorage under 'hemisphere_user_id'.
 */
export function useExperiment(experimentId: string): string | null {
  return useMemo(() => {
    const experiment = Object.values(EXPERIMENTS).find(
      (exp: Experiment) => exp.id === experimentId
    );
    if (!experiment) return null;

    let userId = localStorage.getItem('hemisphere_user_id');
    if (!userId) {
      userId = crypto.randomUUID();
      localStorage.setItem('hemisphere_user_id', userId);
    }

    return assignVariant(userId, experiment)?.id ?? null;
  }, [experimentId]);
}
