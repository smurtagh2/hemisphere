import { describe, expect, it } from 'vitest';
import { DEFAULT_FSRS_WEIGHTS } from '../fsrs';
import { optimizeLearnerFsrsParameters } from '../fsrs-optimization';

describe('optimizeLearnerFsrsParameters', () => {
  it('returns bounded values for a high-lapse learner', () => {
    const result = optimizeLearnerFsrsParameters({
      totalReviews: 200,
      totalLapses: 70,
      averageRetrievability: 0.62,
      averageStability: 3.2,
      averageDifficulty: 6.8,
    });

    expect(result.targetRetention).toBeGreaterThanOrEqual(0.82);
    expect(result.targetRetention).toBeLessThanOrEqual(0.95);
    expect(result.adjustmentScore).toBeGreaterThan(0);
    expect(result.optimizedWeights).toHaveLength(DEFAULT_FSRS_WEIGHTS.w.length);
    expect(result.optimizedWeights[11]).toBeGreaterThan(DEFAULT_FSRS_WEIGHTS.w[11]);
    expect(result.optimizedWeights[16]).toBeLessThan(DEFAULT_FSRS_WEIGHTS.w[16]);
  });

  it('relaxes scheduling for a low-lapse, high-retrievability learner', () => {
    const result = optimizeLearnerFsrsParameters({
      totalReviews: 220,
      totalLapses: 8,
      averageRetrievability: 0.93,
      averageStability: 18,
      averageDifficulty: 4.5,
    });

    expect(result.adjustmentScore).toBeLessThan(0);
    expect(result.targetRetention).toBeLessThan(0.9);
    expect(result.optimizedWeights[8]).toBeGreaterThan(DEFAULT_FSRS_WEIGHTS.w[8]);
    expect(result.optimizedWeights[16]).toBeGreaterThan(DEFAULT_FSRS_WEIGHTS.w[16]);
  });

  it('keeps output finite and in range for edge-case inputs', () => {
    const result = optimizeLearnerFsrsParameters({
      totalReviews: 0,
      totalLapses: 0,
      averageRetrievability: 2,
      averageStability: 0,
      averageDifficulty: 20,
    });

    expect(Number.isFinite(result.targetRetention)).toBe(true);
    expect(result.targetRetention).toBeGreaterThanOrEqual(0.82);
    expect(result.targetRetention).toBeLessThanOrEqual(0.95);
    expect(result.optimizedWeights.every((weight) => Number.isFinite(weight))).toBe(true);
  });
});
