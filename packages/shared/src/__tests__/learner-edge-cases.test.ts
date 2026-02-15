import { describe, it, expect } from 'vitest';
import {
  detectZombieItems,
  planRemediation,
  detectLearnerProtocol,
  type ZombieDetectionInput,
  type ZombieItem,
  type LearnerProtocolInput,
} from '../learner-edge-cases';
import type { FsrsCard } from '../fsrs';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCard(overrides: Partial<FsrsCard> = {}): FsrsCard {
  return {
    state: 'review',
    retrievability: 0.8,
    stability: 10,
    difficulty: 5,
    lastReview: new Date('2026-01-01'),
    scheduledDays: 10,
    elapsedDays: 0,
    reps: 5,
    lapses: 0,
    ...overrides,
  };
}

const NOW = new Date('2026-02-15T12:00:00Z');

// ---------------------------------------------------------------------------
// detectZombieItems
// ---------------------------------------------------------------------------

describe('detectZombieItems', () => {
  it('returns empty arrays when no items qualify', () => {
    const result = detectZombieItems({
      memoryStates: new Map(),
      consecutiveAgainCounts: new Map(),
      items: [{ itemId: 'a', kcId: 'kc1' }],
      now: NOW,
    });
    expect(result.zombies).toHaveLength(0);
    expect(result.atRisk).toHaveLength(0);
  });

  it('classifies items with ≥3 failures and low retrievability as zombies', () => {
    // stability=1, lastReview 45 days ago → computed R ≈ 0.29 (well below 0.4 threshold)
    const input: ZombieDetectionInput = {
      memoryStates: new Map([
        ['a', makeCard({ stability: 1, lastReview: new Date('2026-01-01') })],
      ]),
      consecutiveAgainCounts: new Map([['a', 4]]),
      items: [{ itemId: 'a', kcId: 'kc1' }],
      now: NOW,
    };

    const { zombies, atRisk } = detectZombieItems(input);
    expect(zombies).toHaveLength(1);
    expect(zombies[0].itemId).toBe('a');
    expect(zombies[0].consecutiveFailures).toBe(4);
    expect(atRisk).toHaveLength(0);
  });

  it('classifies items with ≥2 failures but high retrievability as at-risk, not zombies', () => {
    const input: ZombieDetectionInput = {
      memoryStates: new Map([
        ['b', makeCard({ retrievability: 0.75 })],
      ]),
      consecutiveAgainCounts: new Map([['b', 2]]),
      items: [{ itemId: 'b', kcId: 'kc2' }],
      now: NOW,
    };

    const { zombies, atRisk } = detectZombieItems(input);
    expect(zombies).toHaveLength(0);
    expect(atRisk).toHaveLength(1);
    expect(atRisk[0].itemId).toBe('b');
  });

  it('ignores items with fewer than 2 consecutive failures', () => {
    const input: ZombieDetectionInput = {
      memoryStates: new Map([['c', makeCard({ retrievability: 0.1 })]]),
      consecutiveAgainCounts: new Map([['c', 1]]),
      items: [{ itemId: 'c', kcId: 'kc3' }],
      now: NOW,
    };

    const { zombies, atRisk } = detectZombieItems(input);
    expect(zombies).toHaveLength(0);
    expect(atRisk).toHaveLength(0);
  });

  it('handles items with 3 failures but retrievability above zombie threshold as at-risk', () => {
    const input: ZombieDetectionInput = {
      memoryStates: new Map([
        ['d', makeCard({ retrievability: 0.6 })],
      ]),
      consecutiveAgainCounts: new Map([['d', 3]]),
      items: [{ itemId: 'd', kcId: 'kc4' }],
      now: NOW,
    };

    const { zombies, atRisk } = detectZombieItems(input);
    expect(zombies).toHaveLength(0);
    expect(atRisk).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// planRemediation
// ---------------------------------------------------------------------------

describe('planRemediation', () => {
  function makeZombie(overrides: Partial<ZombieItem> = {}): ZombieItem {
    return {
      itemId: 'item1',
      kcId: 'kc1',
      consecutiveFailures: 3,
      avgRetrievability: 0.2,
      lastSeen: NOW,
      ...overrides,
    };
  }

  it('retires items with 7+ failures', () => {
    const plan = planRemediation(makeZombie({ consecutiveFailures: 7 }), 7);
    expect(plan.strategy).toBe('retire');
  });

  it('retires items with 8+ failures', () => {
    const plan = planRemediation(makeZombie({ consecutiveFailures: 8 }), 8);
    expect(plan.strategy).toBe('retire');
  });

  it('restructures items with 5-6 failures', () => {
    expect(planRemediation(makeZombie(), 5).strategy).toBe('restructure');
    expect(planRemediation(makeZombie(), 6).strategy).toBe('restructure');
  });

  it('rests items with 3-4 failures and very low retrievability', () => {
    const plan = planRemediation(makeZombie({ avgRetrievability: 0.1 }), 3);
    expect(plan.strategy).toBe('rest');
    expect(plan.restDays).toBe(7);
  });

  it('simplifies items with 3-4 failures and moderate retrievability', () => {
    const plan = planRemediation(makeZombie({ avgRetrievability: 0.35 }), 3);
    expect(plan.strategy).toBe('simplify');
  });

  it('includes itemId in the plan', () => {
    const plan = planRemediation(makeZombie({ itemId: 'abc' }), 3);
    expect(plan.itemId).toBe('abc');
  });
});

// ---------------------------------------------------------------------------
// detectLearnerProtocol
// ---------------------------------------------------------------------------

describe('detectLearnerProtocol', () => {
  const baseInput: LearnerProtocolInput = {
    memoryStates: new Map([['item1', makeCard()]]),
    allItemIds: ['item1'],
    sessionCount: 10,
    recentAverageScore: 0.7,
    recentItemsPerSession: 10,
    now: NOW,
  };

  it('detects cold_start when session count is below threshold', () => {
    const result = detectLearnerProtocol({ ...baseInput, sessionCount: 2 });
    expect(result.protocol).toBe('cold_start');
    expect(result.coldStartItemBudget).toBe(3);
  });

  it('detects cold_start when all items are unseen', () => {
    const result = detectLearnerProtocol({
      ...baseInput,
      sessionCount: 5,
      memoryStates: new Map([['item1', makeCard({ state: 'new' })]]),
    });
    expect(result.protocol).toBe('cold_start');
  });

  it('detects stuck learner when score and items/session are both low', () => {
    const result = detectLearnerProtocol({
      ...baseInput,
      recentAverageScore: 0.4,
      recentItemsPerSession: 4,
    });
    expect(result.protocol).toBe('stuck');
    expect(result.stuckBackoffDays).toBe(3);
  });

  it('does not flag stuck when only score is low', () => {
    const result = detectLearnerProtocol({
      ...baseInput,
      recentAverageScore: 0.4,
      recentItemsPerSession: 12,
    });
    expect(result.protocol).toBe('normal');
  });

  it('detects bored learner when score and items/session are both high', () => {
    const result = detectLearnerProtocol({
      ...baseInput,
      recentAverageScore: 0.9,
      recentItemsPerSession: 20,
    });
    expect(result.protocol).toBe('bored');
    expect(result.boredShouldInjectChallenge).toBe(true);
  });

  it('returns normal for average learners', () => {
    const result = detectLearnerProtocol(baseInput);
    expect(result.protocol).toBe('normal');
  });

  it('returns normal when recent scores are null (insufficient history)', () => {
    const result = detectLearnerProtocol({
      ...baseInput,
      recentAverageScore: null,
      recentItemsPerSession: null,
    });
    expect(result.protocol).toBe('normal');
  });
});
