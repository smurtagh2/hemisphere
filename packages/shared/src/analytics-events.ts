/**
 * Analytics Events — typed observability event system for Hemisphere.
 *
 * This module defines structured event types that can be forwarded to any
 * analytics backend (PostHog, Mixpanel, internal logging, etc). The module
 * itself is backend-agnostic — it only defines event shapes and factory helpers.
 */

import type {
  AdaptiveSessionPlanInput,
  AdaptiveSessionPlan,
} from './adaptive-selection';

// ============================================================================
// Base event shape
// ============================================================================

/** Base shape for all analytics events */
export interface AnalyticsEvent<T extends string, P extends object = object> {
  event: T;
  timestamp: Date;
  userId: string;
  sessionId?: string;
  properties: P;
}

// ============================================================================
// Adaptive Engine Events
// ============================================================================

export type AdaptiveSessionPlannedEvent = AnalyticsEvent<
  'adaptive_session_planned',
  {
    level: number;
    nextLevel: number;
    itemCount: number;
    reviewCount: number;
    newCount: number;
    interleavedCount: number;
    overdueCount: number;
    analysisBudget: number;
    reviewRatio: number;
    interleaveRatio: number;
    primaryTopicId: string;
    sessionType: string;
    hemisphereBalanceScore: number;
    rationale: string;
  }
>;

export type ItemSelectedEvent = AnalyticsEvent<
  'item_selected',
  {
    itemId: string;
    kcId: string;
    topicId: string;
    reason: string;
    priorityScore: number;
    retrievability: number;
    isInterleaved: boolean;
    sessionType: string;
  }
>;

export type LevelChangeEvent = AnalyticsEvent<
  'difficulty_level_changed',
  {
    fromLevel: number;
    toLevel: number;
    avgRetrievability: number;
    trigger: 'promotion' | 'demotion';
  }
>;

export type ReviewOutcomeEvent = AnalyticsEvent<
  'review_outcome',
  {
    itemId: string;
    kcId: string;
    rating: number;
    prevState: string;
    nextState: string;
    prevRetrievability: number;
    nextStability: number;
    elapsedDays: number;
    scheduledDays: number;
  }
>;

export type SessionCompletedEvent = AnalyticsEvent<
  'session_completed',
  {
    sessionId: string;
    itemsReviewed: number;
    avgRating: number;
    avgRetrievability: number;
    durationMs: number;
    sessionType: string;
    level: number;
  }
>;

export type HemisphereScoreUpdatedEvent = AnalyticsEvent<
  'hemisphere_score_updated',
  {
    prevScore: number;
    newScore: number;
    trigger: string;
    leftBrainWeight: number;
    rightBrainWeight: number;
  }
>;

/** Union of all analytics events */
export type AnyAnalyticsEvent =
  | AdaptiveSessionPlannedEvent
  | ItemSelectedEvent
  | LevelChangeEvent
  | ReviewOutcomeEvent
  | SessionCompletedEvent
  | HemisphereScoreUpdatedEvent;

// ============================================================================
// Emitter interface
// ============================================================================

/**
 * Pluggable analytics emitter.
 * Pass an implementation to instrument the adaptive engine without coupling it
 * to a specific backend.
 */
export interface AnalyticsEmitter {
  emit(event: AnyAnalyticsEvent): void | Promise<void>;
}

/** No-op emitter — safe default when no analytics configured. */
export const noopEmitter: AnalyticsEmitter = {
  emit: () => undefined,
};

// ============================================================================
// Factory helpers
// ============================================================================

/**
 * Create a typed analytics event with the current timestamp.
 *
 * @example
 * const ev = createEvent<LevelChangeEvent>('difficulty_level_changed', userId, {
 *   fromLevel: 1, toLevel: 2, avgRetrievability: 0.75, trigger: 'promotion',
 * });
 */
export function createEvent<T extends AnyAnalyticsEvent>(
  event: T['event'],
  userId: string,
  properties: T['properties'],
  sessionId?: string
): T {
  return {
    event,
    timestamp: new Date(),
    userId,
    sessionId,
    properties,
  } as T;
}

function deriveAnalysisBudget(sessionType: string, explicitBudget?: number): number {
  if (explicitBudget !== undefined && explicitBudget > 0) {
    return Math.floor(explicitBudget);
  }
  if (sessionType === 'quick') return 8;
  if (sessionType === 'extended') return 28;
  return 16;
}

/**
 * Build an AdaptiveSessionPlannedEvent from the inputs and result of
 * planAdaptiveSession(), ready to forward to an AnalyticsEmitter.
 */
export function eventFromAdaptivePlan(
  userId: string,
  input: AdaptiveSessionPlanInput,
  result: AdaptiveSessionPlan,
  sessionId?: string
): AdaptiveSessionPlannedEvent {
  const items = result.selectedItems;
  const itemCount = items.length;

  const reviewCount = items.filter(
    (i) => i.reason === 'due_review' || i.reason === 'overdue_review'
  ).length;

  const newCount = items.filter((i) => i.reason === 'new_primary').length;
  const interleavedCount = items.filter((i) => i.isInterleaved).length;
  const overdueCount = items.filter((i) => i.reason === 'overdue_review').length;

  const analysisBudget = deriveAnalysisBudget(input.sessionType, input.analysisItemBudget);
  const reviewRatio = itemCount > 0 ? reviewCount / itemCount : 0;
  const interleaveRatio = itemCount > 0 ? interleavedCount / itemCount : 0;

  return createEvent<AdaptiveSessionPlannedEvent>(
    'adaptive_session_planned',
    userId,
    {
      level: result.level,
      nextLevel: result.nextLevel,
      itemCount,
      reviewCount,
      newCount,
      interleavedCount,
      overdueCount,
      analysisBudget,
      reviewRatio,
      interleaveRatio,
      primaryTopicId: input.primaryTopicId,
      sessionType: input.sessionType,
      hemisphereBalanceScore: input.hemisphereBalanceScore,
      rationale: result.rationale,
    },
    sessionId
  );
}
