import { describe, expect, it } from 'vitest';
import {
  computeZombieScore,
  isZombieItem,
  selectRemediationType,
} from '../zombie-detection';

describe('zombie detection', () => {
  it('computes weighted zombie score', () => {
    const score = computeZombieScore({
      lhRhDivergence: true,
      formatDependence: true,
      speedWithoutDepth: false,
      stalledDifficulty: false,
    });

    expect(score).toBeCloseTo(0.7, 5);
    expect(isZombieItem({
      lhRhDivergence: true,
      formatDependence: true,
      speedWithoutDepth: false,
      stalledDifficulty: false,
    })).toBe(true);
  });

  it('stays below threshold for weak signal combinations', () => {
    const signals = {
      lhRhDivergence: false,
      formatDependence: false,
      speedWithoutDepth: true,
      stalledDifficulty: true,
    };

    expect(computeZombieScore(signals)).toBeCloseTo(0.3, 5);
    expect(isZombieItem(signals)).toBe(false);
  });

  it('selects remediation priority by strongest diagnostic signal', () => {
    expect(selectRemediationType({
      lhRhDivergence: false,
      formatDependence: true,
      speedWithoutDepth: true,
      stalledDifficulty: true,
    })).toBe('format_shift');

    expect(selectRemediationType({
      lhRhDivergence: true,
      formatDependence: false,
      speedWithoutDepth: true,
      stalledDifficulty: true,
    })).toBe('elaboration');
  });
});
