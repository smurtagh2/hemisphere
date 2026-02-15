export interface ZombieDetectionSignals {
  lhRhDivergence: boolean;
  formatDependence: boolean;
  speedWithoutDepth: boolean;
  stalledDifficulty: boolean;
}

export type RemediationType =
  | 'format_shift'
  | 'elaboration'
  | 'novel_context'
  | 'encoding_reset';

const SIGNAL_WEIGHTS = {
  lhRhDivergence: 0.4,
  formatDependence: 0.3,
  speedWithoutDepth: 0.2,
  stalledDifficulty: 0.1,
} as const;

export function computeZombieScore(signals: ZombieDetectionSignals): number {
  let score = 0;
  if (signals.lhRhDivergence) score += SIGNAL_WEIGHTS.lhRhDivergence;
  if (signals.formatDependence) score += SIGNAL_WEIGHTS.formatDependence;
  if (signals.speedWithoutDepth) score += SIGNAL_WEIGHTS.speedWithoutDepth;
  if (signals.stalledDifficulty) score += SIGNAL_WEIGHTS.stalledDifficulty;
  return score;
}

export function isZombieItem(signals: ZombieDetectionSignals, threshold: number = 0.5): boolean {
  return computeZombieScore(signals) >= threshold;
}

export function selectRemediationType(signals: ZombieDetectionSignals): RemediationType {
  if (signals.formatDependence) return 'format_shift';
  if (signals.lhRhDivergence) return 'elaboration';
  if (signals.speedWithoutDepth) return 'novel_context';
  return 'encoding_reset';
}
