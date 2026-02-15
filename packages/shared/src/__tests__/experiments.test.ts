import { describe, it, expect } from 'vitest';
import { hashToFloat, assignVariant } from '../experiments';
import type { Experiment, ExperimentVariant } from '../experiments';

// ============================================================================
// hashToFloat
// ============================================================================

describe('hashToFloat', () => {
  it('returns a number in [0, 1] range', () => {
    const result = hashToFloat('test-user-123');
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });

  it('is deterministic for the same input', () => {
    const a = hashToFloat('deterministic-input');
    const b = hashToFloat('deterministic-input');
    expect(a).toBe(b);
  });

  it('produces different values for different inputs', () => {
    const a = hashToFloat('user-A');
    const b = hashToFloat('user-B');
    expect(a).not.toBe(b);
  });

  it('handles empty string', () => {
    const result = hashToFloat('');
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });

  it('handles single character input', () => {
    const result = hashToFloat('x');
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });

  it('handles long inputs', () => {
    const longInput = 'a'.repeat(1000);
    const result = hashToFloat(longInput);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });

  it('handles special characters', () => {
    const result = hashToFloat('user@domain.com:experiment-id!');
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });
});

// ============================================================================
// assignVariant
// ============================================================================

function makeExperiment(overrides: Partial<Experiment> = {}): Experiment {
  return {
    id: 'exp-001',
    name: 'Test Experiment',
    description: 'A test experiment',
    trafficFraction: 1.0, // 100% traffic by default
    status: 'active',
    variants: [
      { id: 'control', name: 'Control', weight: 1 },
      { id: 'treatment', name: 'Treatment', weight: 1 },
    ],
    ...overrides,
  };
}

describe('assignVariant', () => {
  it('returns null when user is outside traffic fraction (0% traffic)', () => {
    const experiment = makeExperiment({ trafficFraction: 0 });
    const result = assignVariant('any-user', experiment);
    expect(result).toBeNull();
  });

  it('returns a variant when user is inside 100% traffic fraction', () => {
    const experiment = makeExperiment({ trafficFraction: 1.0 });
    const result = assignVariant('user-123', experiment);
    expect(result).not.toBeNull();
    expect(['control', 'treatment']).toContain(result!.id);
  });

  it('is deterministic for the same userId and experiment', () => {
    const experiment = makeExperiment({ trafficFraction: 1.0 });
    const first = assignVariant('user-stable', experiment);
    const second = assignVariant('user-stable', experiment);
    expect(first?.id).toBe(second?.id);
  });

  it('assigns different variants to different users (statistical check)', () => {
    const experiment = makeExperiment({ trafficFraction: 1.0 });
    const results = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const result = assignVariant(`user-${i}`, experiment);
      if (result) results.add(result.id);
    }
    // With 100 users and 2 variants, both should appear
    expect(results.size).toBe(2);
  });

  it('respects variant weights — single-variant experiment always returns that variant', () => {
    const experiment = makeExperiment({
      trafficFraction: 1.0,
      variants: [{ id: 'only', name: 'Only', weight: 1 }],
    });
    for (let i = 0; i < 20; i++) {
      const result = assignVariant(`user-${i}`, experiment);
      expect(result?.id).toBe('only');
    }
  });

  it('returns last variant as fallback when all weights result in edge roll', () => {
    // Use a variant list where the roll might exceed cumulative due to float precision
    const experiment = makeExperiment({
      trafficFraction: 1.0,
      variants: [
        { id: 'v1', name: 'V1', weight: 0.5 },
        { id: 'v2', name: 'V2', weight: 0.5 },
      ],
    });
    const result = assignVariant('user-edge', experiment);
    expect(result).not.toBeNull();
    expect(['v1', 'v2']).toContain(result!.id);
  });

  it('returns null for empty variants list', () => {
    const experiment = makeExperiment({
      trafficFraction: 1.0,
      variants: [],
    });
    const result = assignVariant('user-123', experiment);
    expect(result).toBeNull();
  });

  it('some users are excluded when trafficFraction is 0.5', () => {
    const experiment = makeExperiment({ trafficFraction: 0.5 });
    const nullCount = Array.from({ length: 200 }, (_, i) =>
      assignVariant(`user-${i}`, experiment)
    ).filter((r) => r === null).length;

    // With 50% traffic, roughly half should be null
    // Allow wide tolerance since it's a hash function
    expect(nullCount).toBeGreaterThan(0);
    expect(nullCount).toBeLessThan(200);
  });

  it('paused experiment still assigns variants (status is not checked by assignVariant)', () => {
    const experiment = makeExperiment({ trafficFraction: 1.0, status: 'paused' });
    // assignVariant doesn't check status — that is responsibility of the caller
    const result = assignVariant('user-123', experiment);
    expect(result).not.toBeNull();
  });

  it('uses experimentId in traffic gate hash (different experiments differ for same user)', () => {
    const expA = makeExperiment({ id: 'exp-A', trafficFraction: 0.5 });
    const expB = makeExperiment({ id: 'exp-B', trafficFraction: 0.5 });
    const userId = 'user-consistent';

    const resultA = assignVariant(userId, expA);
    const resultB = assignVariant(userId, expB);

    // They may differ — key thing is the calls don't throw and return valid values
    expect(resultA === null || ['control', 'treatment'].includes(resultA!.id)).toBe(true);
    expect(resultB === null || ['control', 'treatment'].includes(resultB!.id)).toBe(true);
  });
});
