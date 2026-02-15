/**
 * Additional analytics-events.ts coverage for branches not reached by the primary test file.
 */
import { describe, it, expect } from 'vitest';
import { eventFromAdaptivePlan } from '../analytics-events';
import type { AdaptiveSessionPlanInput, AdaptiveSessionPlan } from '../adaptive-selection';

function makeMockInput(overrides: Partial<AdaptiveSessionPlanInput> = {}): AdaptiveSessionPlanInput {
  return {
    primaryTopicId: 'topic-1',
    availableTopics: [],
    memoryStates: new Map(),
    currentLevel: 2,
    sessionType: 'standard',
    hemisphereBalanceScore: 0.0,
    ...overrides,
  };
}

function makeMockResult(overrides: Partial<AdaptiveSessionPlan> = {}): AdaptiveSessionPlan {
  return {
    level: 2,
    nextLevel: 2,
    stageBalance: { encounter: 0.25, analysis: 0.5, return: 0.25 },
    rationale: 'test',
    selectedItems: [],
    ...overrides,
  };
}

describe('deriveAnalysisBudget — edge cases', () => {
  it('falls through to sessionType logic when analysisItemBudget is 0 (not > 0)', () => {
    // explicitBudget=0 → condition `explicitBudget !== undefined && explicitBudget > 0` is false
    // → falls through to sessionType check → 'standard' → 16
    const event = eventFromAdaptivePlan(
      'u',
      makeMockInput({ analysisItemBudget: 0 }),
      makeMockResult()
    );
    expect(event.properties.analysisBudget).toBe(16);
  });

  it('uses positive explicit budget via Math.floor', () => {
    const event = eventFromAdaptivePlan(
      'u',
      makeMockInput({ analysisItemBudget: 5.9 }),
      makeMockResult()
    );
    // Math.floor(5.9) = 5
    expect(event.properties.analysisBudget).toBe(5);
  });

  it('falls back to 16 for unknown sessionType', () => {
    const event = eventFromAdaptivePlan(
      'u',
      makeMockInput({ sessionType: 'unknown-type' }),
      makeMockResult()
    );
    expect(event.properties.analysisBudget).toBe(16);
  });
});
