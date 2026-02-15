import { describe, it, expect } from 'vitest';
import {
  createEvent,
  eventFromAdaptivePlan,
  noopEmitter,
  type LevelChangeEvent,
  type SessionCompletedEvent,
} from '../analytics-events';
import type { AdaptiveSessionPlanInput, AdaptiveSessionPlan } from '../adaptive-selection';

describe('createEvent', () => {
  it('produces correct event shape with timestamp', () => {
    const before = new Date();
    const event = createEvent<LevelChangeEvent>(
      'difficulty_level_changed',
      'user-123',
      { fromLevel: 1, toLevel: 2, avgRetrievability: 0.75, trigger: 'promotion' }
    );
    const after = new Date();

    expect(event.event).toBe('difficulty_level_changed');
    expect(event.userId).toBe('user-123');
    expect(event.sessionId).toBeUndefined();
    expect(event.timestamp).toBeInstanceOf(Date);
    expect(event.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(event.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    expect(event.properties.fromLevel).toBe(1);
    expect(event.properties.toLevel).toBe(2);
    expect(event.properties.trigger).toBe('promotion');
  });

  it('includes sessionId when provided', () => {
    const event = createEvent<SessionCompletedEvent>(
      'session_completed',
      'user-abc',
      {
        sessionId: 'sess-1',
        itemsReviewed: 10,
        avgRating: 3.2,
        avgRetrievability: 0.85,
        durationMs: 60000,
        sessionType: 'standard',
        level: 2,
      },
      'sess-1'
    );
    expect(event.sessionId).toBe('sess-1');
    expect(event.properties.sessionId).toBe('sess-1');
  });

  it('timestamps are monotonically non-decreasing', () => {
    const e1 = createEvent<LevelChangeEvent>(
      'difficulty_level_changed',
      'u',
      { fromLevel: 1, toLevel: 2, avgRetrievability: 0.8, trigger: 'promotion' }
    );
    const e2 = createEvent<LevelChangeEvent>(
      'difficulty_level_changed',
      'u',
      { fromLevel: 1, toLevel: 2, avgRetrievability: 0.8, trigger: 'promotion' }
    );
    expect(e1.timestamp.getTime()).toBeLessThanOrEqual(e2.timestamp.getTime());
  });
});

describe('noopEmitter', () => {
  it('returns undefined synchronously', () => {
    const result = noopEmitter.emit({
      event: 'difficulty_level_changed',
      timestamp: new Date(),
      userId: 'u',
      properties: { fromLevel: 1, toLevel: 2, avgRetrievability: 0.8, trigger: 'promotion' },
    });
    expect(result).toBeUndefined();
  });
});

describe('eventFromAdaptivePlan', () => {
  const mockInput: AdaptiveSessionPlanInput = {
    primaryTopicId: 'topic-1',
    availableTopics: [],
    memoryStates: new Map(),
    currentLevel: 2,
    sessionType: 'standard',
    hemisphereBalanceScore: 0.1,
  };

  const mockResult: AdaptiveSessionPlan = {
    level: 2,
    nextLevel: 2,
    stageBalance: { encounter: 0.25, analysis: 0.5, return: 0.25 },
    rationale: 'Test rationale.',
    selectedItems: [
      { itemId: 'i1', kcId: 'kc1', topicId: 'topic-1', reason: 'overdue_review', isInterleaved: false, retrievability: 0.5, priorityScore: 20 },
      { itemId: 'i2', kcId: 'kc2', topicId: 'topic-1', reason: 'due_review', isInterleaved: false, retrievability: 0.75, priorityScore: 10 },
      { itemId: 'i3', kcId: 'kc3', topicId: 'topic-2', reason: 'new_primary', isInterleaved: true, retrievability: 1.0, priorityScore: 1 },
      { itemId: 'i4', kcId: 'kc4', topicId: 'topic-2', reason: 'interleaved_related', isInterleaved: true, retrievability: 0.9, priorityScore: 4 },
    ],
  };

  it('populates all fields correctly', () => {
    const event = eventFromAdaptivePlan('user-1', mockInput, mockResult, 'sess-42');

    expect(event.event).toBe('adaptive_session_planned');
    expect(event.userId).toBe('user-1');
    expect(event.sessionId).toBe('sess-42');
    expect(event.timestamp).toBeInstanceOf(Date);

    const p = event.properties;
    expect(p.level).toBe(2);
    expect(p.nextLevel).toBe(2);
    expect(p.itemCount).toBe(4);
    expect(p.reviewCount).toBe(2);       // overdue_review + due_review
    expect(p.overdueCount).toBe(1);      // only overdue_review
    expect(p.newCount).toBe(1);          // new_primary
    expect(p.interleavedCount).toBe(2);  // i3 and i4
    expect(p.analysisBudget).toBe(16);   // standard → 16
    expect(p.reviewRatio).toBeCloseTo(2 / 4);
    expect(p.interleaveRatio).toBeCloseTo(2 / 4);
    expect(p.primaryTopicId).toBe('topic-1');
    expect(p.sessionType).toBe('standard');
    expect(p.hemisphereBalanceScore).toBe(0.1);
    expect(p.rationale).toBe('Test rationale.');
  });

  it('uses quick budget when sessionType is quick', () => {
    const event = eventFromAdaptivePlan('u', { ...mockInput, sessionType: 'quick' }, mockResult);
    expect(event.properties.analysisBudget).toBe(8);
  });

  it('uses extended budget when sessionType is extended', () => {
    const event = eventFromAdaptivePlan('u', { ...mockInput, sessionType: 'extended' }, mockResult);
    expect(event.properties.analysisBudget).toBe(28);
  });

  it('uses explicit analysisItemBudget when provided', () => {
    const event = eventFromAdaptivePlan('u', { ...mockInput, analysisItemBudget: 12 }, mockResult);
    expect(event.properties.analysisBudget).toBe(12);
  });

  it('handles empty selectedItems without division by zero', () => {
    const emptyResult: AdaptiveSessionPlan = { ...mockResult, selectedItems: [] };
    const event = eventFromAdaptivePlan('u', mockInput, emptyResult);
    expect(event.properties.itemCount).toBe(0);
    expect(event.properties.reviewRatio).toBe(0);
    expect(event.properties.interleaveRatio).toBe(0);
  });
});
