/**
 * Additional coverage for zombie-detection.ts branches not reached by the primary test file.
 */
import { describe, expect, it } from 'vitest';
import { selectRemediationType, isZombieItem, computeZombieScore } from '../zombie-detection';

describe('selectRemediationType — uncovered branches', () => {
  it('returns novel_context when only speedWithoutDepth is active', () => {
    expect(
      selectRemediationType({
        lhRhDivergence: false,
        formatDependence: false,
        speedWithoutDepth: true,
        stalledDifficulty: false,
      })
    ).toBe('novel_context');
  });

  it('returns encoding_reset when no signals are active (fallback branch)', () => {
    expect(
      selectRemediationType({
        lhRhDivergence: false,
        formatDependence: false,
        speedWithoutDepth: false,
        stalledDifficulty: false,
      })
    ).toBe('encoding_reset');
  });

  it('returns encoding_reset when only stalledDifficulty is active', () => {
    expect(
      selectRemediationType({
        lhRhDivergence: false,
        formatDependence: false,
        speedWithoutDepth: false,
        stalledDifficulty: true,
      })
    ).toBe('encoding_reset');
  });
});

describe('isZombieItem — custom threshold', () => {
  it('accepts a custom threshold', () => {
    // score = 0.2 (speedWithoutDepth only)
    expect(
      isZombieItem(
        { lhRhDivergence: false, formatDependence: false, speedWithoutDepth: true, stalledDifficulty: false },
        0.15 // threshold below score
      )
    ).toBe(true);

    expect(
      isZombieItem(
        { lhRhDivergence: false, formatDependence: false, speedWithoutDepth: true, stalledDifficulty: false },
        0.25 // threshold above score
      )
    ).toBe(false);
  });
});

describe('computeZombieScore — exhaustive combinations', () => {
  it('returns 0 when all signals are false', () => {
    expect(
      computeZombieScore({
        lhRhDivergence: false,
        formatDependence: false,
        speedWithoutDepth: false,
        stalledDifficulty: false,
      })
    ).toBe(0);
  });

  it('returns 1.0 when all signals are true', () => {
    expect(
      computeZombieScore({
        lhRhDivergence: true,
        formatDependence: true,
        speedWithoutDepth: true,
        stalledDifficulty: true,
      })
    ).toBeCloseTo(1.0, 5);
  });

  it('returns 0.4 for lhRhDivergence alone', () => {
    expect(
      computeZombieScore({
        lhRhDivergence: true,
        formatDependence: false,
        speedWithoutDepth: false,
        stalledDifficulty: false,
      })
    ).toBeCloseTo(0.4, 5);
  });

  it('returns 0.1 for stalledDifficulty alone', () => {
    expect(
      computeZombieScore({
        lhRhDivergence: false,
        formatDependence: false,
        speedWithoutDepth: false,
        stalledDifficulty: true,
      })
    ).toBeCloseTo(0.1, 5);
  });
});
