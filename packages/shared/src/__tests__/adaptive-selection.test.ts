/**
 * Adaptive Selection Tests
 *
 * Tests for rule-based adaptive topic/item selection at difficulty levels 1-2.
 *
 * Coverage:
 *   - Level 1: review priority over new items
 *   - Level 1: new-item gate (learning count < 3)
 *   - Level 1: session cap (max 5 items)
 *   - Level 1: no new items when learning queue is full
 *   - Level 1 → Level 2 promotion (avg retrievability > 0.7)
 *   - Level 2: 60/40 review/new mix
 *   - Level 2: max 5 new items per session
 *   - Scoring: overdue bonus, low-retrievability boost, new-item base score
 *   - Selection reason tagging
 *   - Empty input edge cases
 */

import { describe, it, expect } from 'vitest';
import {
  planAdaptiveSession,
  selectNextItems,
  type AdaptiveSessionItem,
  type AdaptiveSessionTopic,
  type AdaptiveSelectionInput,
  type TopicWithItems,
  type TopicItem,
} from '../adaptive-selection';
import { type FsrsCard } from '../fsrs';

// ============================================================================
// Helpers
// ============================================================================

const BASE_DATE = new Date('2025-01-15T00:00:00Z');

function daysAgo(days: number, from: Date = BASE_DATE): Date {
  return new Date(from.getTime() - days * 24 * 60 * 60 * 1000);
}

function makeItem(itemId: string, topicId = 'topic-1', kcId = `kc-${itemId}`): TopicItem {
  return { itemId, kcId, topicId };
}

function makeTopic(topicId: string, items: TopicItem[]): TopicWithItems {
  return { topicId, items };
}

function makeAdaptiveItem(
  itemId: string,
  topicId: string,
  opts: Partial<AdaptiveSessionItem> = {}
): AdaptiveSessionItem {
  return {
    itemId,
    kcId: opts.kcId ?? `kc-${itemId}`,
    topicId,
    stage: opts.stage ?? 'analysis',
    difficultyLevel: opts.difficultyLevel ?? 1,
    interleaveEligible: opts.interleaveEligible ?? true,
    isReviewable: opts.isReviewable ?? true,
    similarityTags: opts.similarityTags ?? [],
  };
}

function makeAdaptiveTopic(topicId: string, items: AdaptiveSessionItem[]): AdaptiveSessionTopic {
  return { topicId, items };
}

/** A never-reviewed card (state = 'new'). */
function newCard(): FsrsCard {
  return {
    stability: 0,
    difficulty: 0,
    retrievability: 1,
    state: 'new',
    lastReview: null,
    reviewCount: 0,
    lapseCount: 0,
  };
}

/** A card in 'learning' state with specified retrievability. */
function learningCard(retrievability: number, lastReviewDaysAgo = 1): FsrsCard {
  return {
    stability: 1,
    difficulty: 5,
    retrievability,
    state: 'learning',
    lastReview: daysAgo(lastReviewDaysAgo),
    reviewCount: 1,
    lapseCount: 0,
  };
}

/** A card in 'review' state with given stability, retrievability, and lastReview. */
function reviewCard(
  stability: number,
  retrievability: number,
  lastReviewDaysAgo: number
): FsrsCard {
  return {
    stability,
    difficulty: 5,
    retrievability,
    state: 'review',
    lastReview: daysAgo(lastReviewDaysAgo),
    reviewCount: 3,
    lapseCount: 0,
  };
}

function buildInput(overrides: Partial<AdaptiveSelectionInput> = {}): AdaptiveSelectionInput {
  return {
    userId: 'user-1',
    availableTopics: [],
    memoryStates: new Map(),
    currentLevel: 1,
    now: BASE_DATE,
    ...overrides,
  };
}

// ============================================================================
// Level 1 – Basic behaviour
// ============================================================================

describe('selectNextItems – Level 1', () => {
  it('returns an empty selection when there are no items', () => {
    const result = selectNextItems(buildInput({ currentLevel: 1 }));
    expect(result.selectedItems).toHaveLength(0);
    expect(result.nextLevel).toBe(1);
  });

  it('selects new items up to the learning-queue limit when no existing cards', () => {
    const items = ['a', 'b', 'c', 'd', 'e'].map((id) => makeItem(id));
    const input = buildInput({
      availableTopics: [makeTopic('topic-1', items)],
      memoryStates: new Map(), // all items are brand-new
    });

    const result = selectNextItems(input);

    // Learner has 0 items in learning, limit is 3, session cap is 5.
    // Should introduce min(3 - 0, 5 - 0) = 3 new items.
    expect(result.selectedItems).toHaveLength(3);
    expect(result.selectedItems.every((s) => s.reason === 'new_item')).toBe(true);
  });

  it('prioritises learning/review items over new items', () => {
    const learningItemId = 'existing-1';
    const reviewItemId = 'existing-2';
    const newItemId = 'new-1';

    const items = [
      makeItem(learningItemId),
      makeItem(reviewItemId),
      makeItem(newItemId),
    ];

    const memoryStates = new Map<string, FsrsCard>([
      [learningItemId, learningCard(0.8)],
      [reviewItemId, reviewCard(10, 0.8, 5)],
    ]);

    const result = selectNextItems(
      buildInput({
        availableTopics: [makeTopic('topic-1', items)],
        memoryStates,
      })
    );

    const ids = result.selectedItems.map((s) => s.itemId);
    // Both existing items should appear before any new item
    const existingIndices = [learningItemId, reviewItemId].map((id) => ids.indexOf(id));
    const newIndex = ids.indexOf(newItemId);
    expect(existingIndices[0]).toBeGreaterThanOrEqual(0);
    expect(existingIndices[1]).toBeGreaterThanOrEqual(0);
    // new item should come after both existing items (or at end)
    if (newIndex !== -1) {
      expect(newIndex).toBeGreaterThan(Math.max(...existingIndices));
    }
  });

  it('does not introduce new items when learning count reaches 3', () => {
    const learningIds = ['l1', 'l2', 'l3'];
    const newId = 'n1';
    const items = [...learningIds.map((id) => makeItem(id)), makeItem(newId)];

    const memoryStates = new Map<string, FsrsCard>(
      learningIds.map((id) => [id, learningCard(0.8)])
    );

    const result = selectNextItems(
      buildInput({
        availableTopics: [makeTopic('topic-1', items)],
        memoryStates,
      })
    );

    const ids = result.selectedItems.map((s) => s.itemId);
    expect(ids).not.toContain(newId);
    expect(result.rationale).toMatch(/No new items introduced/);
  });

  it('respects the session cap of 5 items', () => {
    // 4 review items + 5 new items available
    const reviewIds = ['r1', 'r2', 'r3', 'r4'];
    const newIds = ['n1', 'n2', 'n3', 'n4', 'n5'];
    const items = [
      ...reviewIds.map((id) => makeItem(id)),
      ...newIds.map((id) => makeItem(id)),
    ];

    const memoryStates = new Map<string, FsrsCard>(
      reviewIds.map((id) => [id, reviewCard(10, 0.85, 3)])
    );

    const result = selectNextItems(
      buildInput({
        availableTopics: [makeTopic('topic-1', items)],
        memoryStates,
      })
    );

    expect(result.selectedItems.length).toBeLessThanOrEqual(5);
  });

  it('introduces exactly (3 - currentLearning) new items when there is room', () => {
    const learningIds = ['l1']; // 1 in learning, room for 2 more
    const newIds = ['n1', 'n2', 'n3', 'n4'];
    const items = [
      ...learningIds.map((id) => makeItem(id)),
      ...newIds.map((id) => makeItem(id)),
    ];

    const memoryStates = new Map<string, FsrsCard>([[learningIds[0], learningCard(0.9)]]);

    const result = selectNextItems(
      buildInput({
        availableTopics: [makeTopic('topic-1', items)],
        memoryStates,
      })
    );

    const newSelected = result.selectedItems.filter((s) => s.reason === 'new_item');
    // min(3 - 1, 5 - 1) = 2 new items
    expect(newSelected).toHaveLength(2);
  });

  it('stays at level 1 when avg retrievability is below the threshold', () => {
    // Use stability=1 and lastReview=30 days ago so live retrievability is very low.
    // getCurrentRetrievability: (1 + 19/81 * 30/1)^(-0.5) ≈ 0.35 — well below 0.7.
    const items = ['r1', 'r2'].map((id) => makeItem(id));
    const memoryStates = new Map<string, FsrsCard>([
      ['r1', reviewCard(1, 0.4, 30)],
      ['r2', reviewCard(1, 0.4, 30)],
    ]);

    const result = selectNextItems(
      buildInput({
        availableTopics: [makeTopic('topic-1', items)],
        memoryStates,
      })
    );

    expect(result.nextLevel).toBe(1);
  });

  it('advances to level 2 when avg retrievability exceeds 0.7', () => {
    const items = ['r1', 'r2', 'r3'].map((id) => makeItem(id));
    // All items reviewed recently with high retrievability
    const memoryStates = new Map<string, FsrsCard>([
      ['r1', reviewCard(10, 0.95, 1)],
      ['r2', reviewCard(10, 0.92, 1)],
      ['r3', reviewCard(10, 0.88, 1)],
    ]);

    const result = selectNextItems(
      buildInput({
        availableTopics: [makeTopic('topic-1', items)],
        memoryStates,
      })
    );

    expect(result.nextLevel).toBe(2);
    expect(result.rationale).toMatch(/advancing to level 2/);
  });
});

// ============================================================================
// Level 1 – Scoring and reason tagging
// ============================================================================

describe('selectNextItems – Level 1 scoring', () => {
  it('assigns reason "struggling" to items with retrievability <= 0.5', () => {
    const items = [makeItem('s1')];
    const memoryStates = new Map<string, FsrsCard>([
      ['s1', reviewCard(2, 0.4, 10)],
    ]);

    const result = selectNextItems(
      buildInput({
        availableTopics: [makeTopic('topic-1', items)],
        memoryStates,
      })
    );

    const item = result.selectedItems.find((s) => s.itemId === 's1');
    expect(item?.reason).toBe('struggling');
  });

  it('assigns reason "new_item" to cards with state new', () => {
    const items = [makeItem('n1')];
    const memoryStates = new Map<string, FsrsCard>([['n1', newCard()]]);

    const result = selectNextItems(
      buildInput({
        availableTopics: [makeTopic('topic-1', items)],
        memoryStates,
      })
    );

    const item = result.selectedItems.find((s) => s.itemId === 'n1');
    expect(item?.reason).toBe('new_item');
  });

  it('assigns reason "new_item" to items with no memory state', () => {
    const items = [makeItem('x1')];
    // no entry in memoryStates map

    const result = selectNextItems(
      buildInput({
        availableTopics: [makeTopic('topic-1', items)],
        memoryStates: new Map(),
      })
    );

    const item = result.selectedItems.find((s) => s.itemId === 'x1');
    expect(item?.reason).toBe('new_item');
  });

  it('gives a higher score to the more overdue item', () => {
    // r1 reviewed 20 days ago with stability 5 (15 overdue days)
    // r2 reviewed 5 days ago with stability 3 (2 overdue days)
    const items = [makeItem('r1'), makeItem('r2')];
    const memoryStates = new Map<string, FsrsCard>([
      ['r1', reviewCard(5, 0.3, 20)],
      ['r2', reviewCard(3, 0.6, 5)],
    ]);

    const result = selectNextItems(
      buildInput({
        availableTopics: [makeTopic('topic-1', items)],
        memoryStates,
      })
    );

    const r1 = result.selectedItems.find((s) => s.itemId === 'r1')!;
    const r2 = result.selectedItems.find((s) => s.itemId === 'r2')!;
    expect(r1.priorityScore).toBeGreaterThan(r2.priorityScore);
  });

  it('new items have a base score of 1', () => {
    const items = [makeItem('n1')];

    const result = selectNextItems(
      buildInput({
        availableTopics: [makeTopic('topic-1', items)],
        memoryStates: new Map(),
      })
    );

    const item = result.selectedItems.find((s) => s.itemId === 'n1');
    expect(item?.priorityScore).toBe(1);
  });
});

// ============================================================================
// Level 2 – Basic behaviour
// ============================================================================

describe('selectNextItems – Level 2', () => {
  it('mixes reviews and new items at approximately 60/40', () => {
    // 5 new items and enough review items available
    const reviewIds = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8'];
    const newIds = ['n1', 'n2', 'n3', 'n4', 'n5'];
    const items = [
      ...reviewIds.map((id) => makeItem(id)),
      ...newIds.map((id) => makeItem(id)),
    ];

    const memoryStates = new Map<string, FsrsCard>(
      reviewIds.map((id) => [id, reviewCard(10, 0.85, 2)])
    );

    const result = selectNextItems(
      buildInput({
        availableTopics: [makeTopic('topic-1', items)],
        memoryStates,
        currentLevel: 2,
      })
    );

    const reviewSelected = result.selectedItems.filter(
      (s) => s.reason !== 'new_item'
    ).length;
    const newSelected = result.selectedItems.filter(
      (s) => s.reason === 'new_item'
    ).length;

    // With 5 new slots: reviewTarget = round(5 * 0.6 / 0.4) = 8
    // Available reviews: 8, so reviewsToTake = 8
    expect(newSelected).toBe(5);
    expect(reviewSelected).toBe(8);

    // Check rationale mentions level 2
    expect(result.rationale).toMatch(/Level 2/);
    expect(result.rationale).toMatch(/60%/);
  });

  it('caps new items at 5 even when more are available', () => {
    const newIds = ['n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7'];
    const items = newIds.map((id) => makeItem(id));

    const result = selectNextItems(
      buildInput({
        availableTopics: [makeTopic('topic-1', items)],
        memoryStates: new Map(),
        currentLevel: 2,
      })
    );

    const newSelected = result.selectedItems.filter((s) => s.reason === 'new_item');
    expect(newSelected.length).toBeLessThanOrEqual(5);
  });

  it('selects all available reviews when there are no new items', () => {
    const reviewIds = ['r1', 'r2', 'r3'];
    const items = reviewIds.map((id) => makeItem(id));
    const memoryStates = new Map<string, FsrsCard>(
      reviewIds.map((id) => [id, reviewCard(10, 0.85, 2)])
    );

    const result = selectNextItems(
      buildInput({
        availableTopics: [makeTopic('topic-1', items)],
        memoryStates,
        currentLevel: 2,
      })
    );

    // newSlots = 0, so reviewTarget = totalReviewAndLearning = 3
    expect(result.selectedItems).toHaveLength(3);
  });

  it('stays at level 2 when already at level 2 regardless of retrievability', () => {
    const items = [makeItem('r1')];
    const memoryStates = new Map<string, FsrsCard>([
      ['r1', reviewCard(10, 0.95, 1)],
    ]);

    const result = selectNextItems(
      buildInput({
        availableTopics: [makeTopic('topic-1', items)],
        memoryStates,
        currentLevel: 2,
      })
    );

    expect(result.nextLevel).toBe(2);
  });

  it('assigns reason "ready_to_advance" to high-retrievability review items', () => {
    const items = [makeItem('r1')];
    // Reviewed recently, high retrievability, not overdue
    const memoryStates = new Map<string, FsrsCard>([
      ['r1', reviewCard(30, 0.95, 1)],
    ]);

    const result = selectNextItems(
      buildInput({
        availableTopics: [makeTopic('topic-1', items)],
        memoryStates,
        currentLevel: 2,
      })
    );

    const item = result.selectedItems.find((s) => s.itemId === 'r1');
    expect(item?.reason).toBe('ready_to_advance');
  });
});

// ============================================================================
// Multi-topic input
// ============================================================================

describe('selectNextItems – multi-topic input', () => {
  it('aggregates items from all provided topics', () => {
    const topic1Items = [makeItem('a', 'topic-1'), makeItem('b', 'topic-1')];
    const topic2Items = [makeItem('c', 'topic-2'), makeItem('d', 'topic-2')];

    const result = selectNextItems(
      buildInput({
        availableTopics: [
          makeTopic('topic-1', topic1Items),
          makeTopic('topic-2', topic2Items),
        ],
        memoryStates: new Map(),
        currentLevel: 1,
      })
    );

    // 4 items total, 0 in learning → can introduce min(3, 5) = 3 new items
    expect(result.selectedItems).toHaveLength(3);
  });
});

// ============================================================================
// Edge cases
// ============================================================================

describe('selectNextItems – edge cases', () => {
  it('handles zero available topics gracefully', () => {
    const result = selectNextItems(buildInput({ availableTopics: [] }));
    expect(result.selectedItems).toHaveLength(0);
    expect(result.nextLevel).toBe(1);
  });

  it('handles a topic with zero items gracefully', () => {
    const result = selectNextItems(
      buildInput({
        availableTopics: [makeTopic('empty-topic', [])],
      })
    );
    expect(result.selectedItems).toHaveLength(0);
  });

  it('returns rationale string for every result', () => {
    const result = selectNextItems(buildInput());
    expect(typeof result.rationale).toBe('string');
    expect(result.rationale.length).toBeGreaterThan(0);
  });

  it('every selected item carries itemId, kcId, topicId, priorityScore, and reason', () => {
    const items = [makeItem('x1', 'topic-x', 'kc-x1')];
    const result = selectNextItems(
      buildInput({
        availableTopics: [makeTopic('topic-x', items)],
        memoryStates: new Map(),
      })
    );

    for (const si of result.selectedItems) {
      expect(si.itemId).toBeDefined();
      expect(si.kcId).toBeDefined();
      expect(si.topicId).toBeDefined();
      expect(typeof si.priorityScore).toBe('number');
      expect(['new_item', 'due_review', 'struggling', 'ready_to_advance']).toContain(si.reason);
    }
  });
});

// ============================================================================
// Full adaptive engine (levels 1-4, HBS, interleaving)
// ============================================================================

describe('planAdaptiveSession', () => {
  it('applies HBS-based stage balance for LH-leaning learners', () => {
    const topic = makeAdaptiveTopic('topic-1', [
      makeAdaptiveItem('a1', 'topic-1', { difficultyLevel: 1, similarityTags: ['core'] }),
    ]);

    const result = planAdaptiveSession({
      primaryTopicId: 'topic-1',
      availableTopics: [topic],
      memoryStates: new Map(),
      currentLevel: 1,
      sessionType: 'standard',
      hemisphereBalanceScore: -0.4,
      analysisItemBudget: 4,
      now: BASE_DATE,
    });

    expect(result.stageBalance).toEqual({ encounter: 0.3, analysis: 0.4, return: 0.3 });
  });

  it('keeps quick-loop fixed stage balance regardless of HBS', () => {
    const topic = makeAdaptiveTopic('topic-1', [
      makeAdaptiveItem('a1', 'topic-1', { difficultyLevel: 1 }),
    ]);

    const result = planAdaptiveSession({
      primaryTopicId: 'topic-1',
      availableTopics: [topic],
      memoryStates: new Map(),
      currentLevel: 2,
      sessionType: 'quick',
      hemisphereBalanceScore: 0.9,
      analysisItemBudget: 4,
      now: BASE_DATE,
    });

    expect(result.stageBalance).toEqual({ encounter: 0.1, analysis: 0.7, return: 0.2 });
  });

  it('filters out items above current difficulty level', () => {
    const topic = makeAdaptiveTopic('topic-1', [
      makeAdaptiveItem('l1', 'topic-1', { difficultyLevel: 1 }),
      makeAdaptiveItem('l3', 'topic-1', { difficultyLevel: 3 }),
    ]);

    const result = planAdaptiveSession({
      primaryTopicId: 'topic-1',
      availableTopics: [topic],
      memoryStates: new Map(),
      currentLevel: 1,
      sessionType: 'standard',
      hemisphereBalanceScore: 0,
      analysisItemBudget: 5,
      now: BASE_DATE,
    });

    const selectedIds = result.selectedItems.map((item) => item.itemId);
    expect(selectedIds).toContain('l1');
    expect(selectedIds).not.toContain('l3');
  });

  it('selects interleaved items from related topics at higher levels', () => {
    const primary = makeAdaptiveTopic('topic-1', [
      makeAdaptiveItem('p1', 'topic-1', {
        difficultyLevel: 3,
        similarityTags: ['photosynthesis', 'energy'],
      }),
      makeAdaptiveItem('p2', 'topic-1', {
        difficultyLevel: 3,
        similarityTags: ['photosynthesis', 'chloroplast'],
      }),
    ]);
    const related = makeAdaptiveTopic('topic-2', [
      makeAdaptiveItem('r1', 'topic-2', {
        difficultyLevel: 3,
        interleaveEligible: true,
        similarityTags: ['photosynthesis', 'energy'],
      }),
    ]);

    const memoryStates = new Map<string, FsrsCard>([
      ['p1', reviewCard(8, 0.82, 5)],
      ['p2', reviewCard(8, 0.84, 5)],
      ['r1', reviewCard(7, 0.78, 7)],
    ]);

    const result = planAdaptiveSession({
      primaryTopicId: 'topic-1',
      availableTopics: [primary, related],
      memoryStates,
      currentLevel: 3,
      sessionType: 'extended',
      hemisphereBalanceScore: 0.2,
      analysisItemBudget: 6,
      now: BASE_DATE,
    });

    expect(result.selectedItems.some((item) => item.topicId === 'topic-2')).toBe(true);
    expect(result.selectedItems.some((item) => item.isInterleaved)).toBe(true);
  });

  it('promotes level when primary retrievability crosses threshold', () => {
    const primary = makeAdaptiveTopic('topic-1', [
      makeAdaptiveItem('p1', 'topic-1', { difficultyLevel: 1 }),
      makeAdaptiveItem('p2', 'topic-1', { difficultyLevel: 1 }),
    ]);
    const memoryStates = new Map<string, FsrsCard>([
      ['p1', reviewCard(25, 0.96, 1)],
      ['p2', reviewCard(20, 0.94, 1)],
    ]);

    const result = planAdaptiveSession({
      primaryTopicId: 'topic-1',
      availableTopics: [primary],
      memoryStates,
      currentLevel: 1,
      sessionType: 'standard',
      hemisphereBalanceScore: 0,
      analysisItemBudget: 4,
      now: BASE_DATE,
    });

    expect(result.nextLevel).toBe(2);
  });
});
