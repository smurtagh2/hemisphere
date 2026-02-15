import { describe, it, expect } from 'vitest';
import { EXPERIMENT_1, EXPERIMENTS } from '../experiments-catalog.js';
import { assignVariant } from '../experiments.js';

describe('EXPERIMENT_1 shape', () => {
  it('has the correct id', () => {
    expect(EXPERIMENT_1.id).toBe('exp-001-hemisphere-sequence');
  });

  it('has exactly two variants', () => {
    expect(EXPERIMENT_1.variants).toHaveLength(2);
  });

  it('has variant ids rh-lh-rh and lh-only', () => {
    const ids = EXPERIMENT_1.variants.map((v) => v.id);
    expect(ids).toContain('rh-lh-rh');
    expect(ids).toContain('lh-only');
  });

  it('has trafficFraction of 1.0', () => {
    expect(EXPERIMENT_1.trafficFraction).toBe(1.0);
  });

  it('has status active', () => {
    expect(EXPERIMENT_1.status).toBe('active');
  });
});

describe('EXPERIMENTS catalog', () => {
  it('exposes HEMISPHERE_SEQUENCE pointing to EXPERIMENT_1', () => {
    expect(EXPERIMENTS.HEMISPHERE_SEQUENCE).toBe(EXPERIMENT_1);
  });
});

describe('assignVariant distribution for EXPERIMENT_1', () => {
  const USER_COUNT = 1000;
  const userIds = Array.from({ length: USER_COUNT }, (_, i) => `test-user-${i}-catalog`);

  it('assigns every user a variant (trafficFraction = 1.0)', () => {
    for (const userId of userIds) {
      expect(assignVariant(userId, EXPERIMENT_1)).not.toBeNull();
    }
  });

  it('distributes roughly 50/50 (within ±10%)', () => {
    const counts: Record<string, number> = { 'rh-lh-rh': 0, 'lh-only': 0 };
    for (const userId of userIds) {
      const v = assignVariant(userId, EXPERIMENT_1);
      if (v) counts[v.id] = (counts[v.id] ?? 0) + 1;
    }
    const frac = counts['rh-lh-rh'] / USER_COUNT;
    expect(frac).toBeGreaterThanOrEqual(0.4);
    expect(frac).toBeLessThanOrEqual(0.6);
  });

  it('assignments are deterministic', () => {
    for (const userId of userIds.slice(0, 50)) {
      expect(assignVariant(userId, EXPERIMENT_1)?.id).toBe(
        assignVariant(userId, EXPERIMENT_1)?.id
      );
    }
  });
});
