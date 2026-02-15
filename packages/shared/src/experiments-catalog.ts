/**
 * experiments-catalog.ts — Typed catalog of named A/B experiments for Hemisphere.
 */

import type { Experiment } from './experiments.js';

// ─── Experiment 1: Hemisphere Sequence ────────────────────────────────────────

/**
 * Exp-001: Compares RH-LH-RH ordering against LH-only baseline for retention.
 *
 * Hypothesis: Right-hemisphere priming before and after left-hemisphere
 * consolidation improves 7-day retention by activating associative networks.
 */
export const EXPERIMENT_1: Experiment = {
  id: 'exp-001-hemisphere-sequence',
  name: 'Hemisphere Sequence (RH-LH-RH vs LH-only)',
  description:
    'Tests whether an RH-LH-RH sequence produces better 7-day retention compared to an LH-only baseline.',
  variants: [
    { id: 'rh-lh-rh', name: 'RH-LH-RH sequence', weight: 0.5 },
    { id: 'lh-only',  name: 'LH-only baseline',   weight: 0.5 },
  ],
  trafficFraction: 1.0,
  status: 'active',
};

// ─── Catalog ──────────────────────────────────────────────────────────────────

export const EXPERIMENTS = {
  HEMISPHERE_SEQUENCE: EXPERIMENT_1,
} as const;
