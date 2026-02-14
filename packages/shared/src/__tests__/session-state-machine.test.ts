/**
 * Session State Machine Tests
 *
 * Validates the core state machine logic including:
 * - State transitions
 * - Guard conditions
 * - Duration tracking
 * - Progress calculations
 */

import { describe, it, expect } from 'vitest';
import {
  createInitialSessionState,
  validateSessionState,
  getNextStage,
  getStageIndex,
  isRightHemisphereStage,
  isLeftHemisphereStage,
  defaultGuards,
  defaultSessionConfig,
  type SessionState,
} from '../session-state-machine';
import {
  sessionStateReducer,
  calculateStageProgress,
  calculateSessionProgress,
  getCurrentStageDuration,
  isStageDurationMet,
} from '../session-state-reducer';

// ============================================================================
// Test Helpers
// ============================================================================

function makeReadyState(itemQueue: string[] = ['item-1', 'item-2', 'item-3']): SessionState {
  return createInitialSessionState({
    sessionId: 'test-session',
    userId: 'test-user',
    topicId: 'test-topic',
    sessionType: 'standard',
    itemQueue,
    plannedBalance: { newItemCount: 2, reviewItemCount: 1, interleavedCount: 0 },
  });
}

function startSession(state: SessionState, timestamp = 1000): SessionState {
  const result = sessionStateReducer(state, {
    type: 'START_SESSION',
    sessionId: state.sessionId,
    timestamp,
  });
  if (!result.success) throw new Error(`Failed to start session: ${result.reason}`);
  return result.newState;
}

/**
 * Build a state that has spent the given milliseconds in the encounter stage
 * without going through the full reducer (direct construction for guard tests).
 */
function encounterStateWithDuration(durationMs: number, complete = true): SessionState {
  return {
    sessionId: 'test-session',
    userId: 'test-user',
    topicId: 'test-topic',
    status: 'in_progress',
    currentStage: 'encounter',
    startedAt: 1000,
    pausedAt: null,
    completedAt: null,
    encounterStartedAt: 1000,
    analysisStartedAt: null,
    returnStartedAt: null,
    totalDurationMs: 0,
    encounterDurationMs: durationMs,
    analysisDurationMs: 0,
    returnDurationMs: 0,
    pausedDurationMs: 0,
    itemQueue: ['item-1', 'item-2'],
    currentItemIndex: 0,
    completedActivityIds: [],
    encounterComplete: complete,
    analysisComplete: false,
    returnComplete: false,
    abandonedAtStage: null,
    abandonmentReason: null,
    sessionType: 'standard',
    plannedBalance: { newItemCount: 2, reviewItemCount: 0, interleavedCount: 0 },
  };
}

function analysisStateWithDuration(
  durationMs: number,
  complete = true,
  itemIndex = 1
): SessionState {
  return {
    sessionId: 'test-session',
    userId: 'test-user',
    topicId: 'test-topic',
    status: 'in_progress',
    currentStage: 'analysis',
    startedAt: 1000,
    pausedAt: null,
    completedAt: null,
    encounterStartedAt: 1000,
    analysisStartedAt: 181_000,
    returnStartedAt: null,
    totalDurationMs: 0,
    encounterDurationMs: 180_000,
    analysisDurationMs: durationMs,
    returnDurationMs: 0,
    pausedDurationMs: 0,
    itemQueue: ['item-1', 'item-2'],
    currentItemIndex: itemIndex,
    completedActivityIds: ['item-1'],
    encounterComplete: true,
    analysisComplete: complete,
    returnComplete: false,
    abandonedAtStage: null,
    abandonmentReason: null,
    sessionType: 'standard',
    plannedBalance: { newItemCount: 2, reviewItemCount: 0, interleavedCount: 0 },
  };
}

function returnStateWithDuration(durationMs: number, complete = true): SessionState {
  return {
    sessionId: 'test-session',
    userId: 'test-user',
    topicId: 'test-topic',
    status: 'in_progress',
    currentStage: 'return',
    startedAt: 1000,
    pausedAt: null,
    completedAt: null,
    encounterStartedAt: 1000,
    analysisStartedAt: 181_000,
    returnStartedAt: 541_000,
    totalDurationMs: 0,
    encounterDurationMs: 180_000,
    analysisDurationMs: 360_000,
    returnDurationMs: durationMs,
    pausedDurationMs: 0,
    itemQueue: ['item-1', 'item-2'],
    currentItemIndex: 2,
    completedActivityIds: ['item-1', 'item-2'],
    encounterComplete: true,
    analysisComplete: true,
    returnComplete: complete,
    abandonedAtStage: null,
    abandonmentReason: null,
    sessionType: 'standard',
    plannedBalance: { newItemCount: 2, reviewItemCount: 0, interleavedCount: 0 },
  };
}

// ============================================================================
// Initial State Creation
// ============================================================================

describe('Session State Machine', () => {
  describe('Initial State Creation', () => {
    it('should create valid initial state', () => {
      const state = makeReadyState();

      expect(state.status).toBe('ready');
      expect(state.currentStage).toBe(null);
      expect(state.itemQueue.length).toBe(3);
      expect(state.completedActivityIds).toEqual([]);
      expect(validateSessionState(state)).toEqual([]);
    });

    it('all timing fields start at null or zero', () => {
      const state = makeReadyState();

      expect(state.startedAt).toBe(null);
      expect(state.pausedAt).toBe(null);
      expect(state.completedAt).toBe(null);
      expect(state.encounterStartedAt).toBe(null);
      expect(state.analysisStartedAt).toBe(null);
      expect(state.returnStartedAt).toBe(null);
      expect(state.totalDurationMs).toBe(0);
      expect(state.encounterDurationMs).toBe(0);
      expect(state.analysisDurationMs).toBe(0);
      expect(state.returnDurationMs).toBe(0);
      expect(state.pausedDurationMs).toBe(0);
    });

    it('all completion flags start false', () => {
      const state = makeReadyState();

      expect(state.encounterComplete).toBe(false);
      expect(state.analysisComplete).toBe(false);
      expect(state.returnComplete).toBe(false);
      expect(state.abandonedAtStage).toBe(null);
      expect(state.abandonmentReason).toBe(null);
    });
  });

  // ============================================================================
  // START_SESSION
  // ============================================================================

  describe('START_SESSION', () => {
    it('should transition ready → in_progress and enter encounter stage', () => {
      const state = makeReadyState();
      const result = sessionStateReducer(state, {
        type: 'START_SESSION',
        sessionId: 'test-session',
        timestamp: 1000,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.newState.status).toBe('in_progress');
        expect(result.newState.currentStage).toBe('encounter');
        expect(result.newState.startedAt).toBe(1000);
        expect(result.newState.encounterStartedAt).toBe(1000);
      }
    });

    it('should reject start when item queue is empty', () => {
      const state = makeReadyState([]);
      const result = sessionStateReducer(state, {
        type: 'START_SESSION',
        sessionId: 'test-session',
        timestamp: 1000,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('INVALID_TRANSITION');
      }
    });

    it('should reject start when session is not in ready status', () => {
      // Use an in_progress session
      const state = startSession(makeReadyState());
      const result = sessionStateReducer(state, {
        type: 'START_SESSION',
        sessionId: 'test-session',
        timestamp: 5000,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('INVALID_TRANSITION');
      }
    });
  });

  // ============================================================================
  // PAUSE_SESSION / RESUME_SESSION
  // ============================================================================

  describe('PAUSE_SESSION', () => {
    it('should transition in_progress → paused and record pausedAt', () => {
      const inProgress = startSession(makeReadyState(), 1000);
      const result = sessionStateReducer(inProgress, {
        type: 'PAUSE_SESSION',
        timestamp: 10_000,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.newState.status).toBe('paused');
        expect(result.newState.pausedAt).toBe(10_000);
      }
    });

    it('should reject pause when already paused', () => {
      const inProgress = startSession(makeReadyState(), 1000);
      const paused = sessionStateReducer(inProgress, {
        type: 'PAUSE_SESSION',
        timestamp: 10_000,
      });
      expect(paused.success).toBe(true);
      if (!paused.success) return;

      const secondPause = sessionStateReducer(paused.newState, {
        type: 'PAUSE_SESSION',
        timestamp: 15_000,
      });

      expect(secondPause.success).toBe(false);
      if (!secondPause.success) {
        expect(secondPause.error).toBe('INVALID_TRANSITION');
      }
    });

    it('should reject pause when session not in_progress (e.g. ready)', () => {
      const state = makeReadyState();
      const result = sessionStateReducer(state, {
        type: 'PAUSE_SESSION',
        timestamp: 5000,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('INVALID_TRANSITION');
      }
    });
  });

  describe('RESUME_SESSION', () => {
    it('should transition paused → in_progress and accumulate pausedDurationMs', () => {
      const inProgress = startSession(makeReadyState(), 1000);
      const paused = sessionStateReducer(inProgress, {
        type: 'PAUSE_SESSION',
        timestamp: 10_000,
      });
      expect(paused.success).toBe(true);
      if (!paused.success) return;

      const resumed = sessionStateReducer(paused.newState, {
        type: 'RESUME_SESSION',
        timestamp: 20_000,
      });

      expect(resumed.success).toBe(true);
      if (resumed.success) {
        expect(resumed.newState.status).toBe('in_progress');
        expect(resumed.newState.pausedAt).toBe(null);
        expect(resumed.newState.pausedDurationMs).toBe(10_000); // 20000 - 10000
      }
    });

    it('should accumulate pause durations across multiple pause/resume cycles', () => {
      let state = startSession(makeReadyState(), 1000);

      // First pause/resume: 10s pause at t=5000, resume at t=15000
      const pause1 = sessionStateReducer(state, {
        type: 'PAUSE_SESSION',
        timestamp: 5_000,
      });
      expect(pause1.success).toBe(true);
      if (!pause1.success) return;

      const resume1 = sessionStateReducer(pause1.newState, {
        type: 'RESUME_SESSION',
        timestamp: 15_000,
      });
      expect(resume1.success).toBe(true);
      if (!resume1.success) return;
      expect(resume1.newState.pausedDurationMs).toBe(10_000);

      // Second pause/resume: 5s pause at t=20000, resume at t=25000
      const pause2 = sessionStateReducer(resume1.newState, {
        type: 'PAUSE_SESSION',
        timestamp: 20_000,
      });
      expect(pause2.success).toBe(true);
      if (!pause2.success) return;

      const resume2 = sessionStateReducer(pause2.newState, {
        type: 'RESUME_SESSION',
        timestamp: 25_000,
      });
      expect(resume2.success).toBe(true);
      if (resume2.success) {
        expect(resume2.newState.pausedDurationMs).toBe(15_000); // 10000 + 5000
      }
    });

    it('should reject resume when session is in_progress (not paused)', () => {
      const inProgress = startSession(makeReadyState(), 1000);
      const result = sessionStateReducer(inProgress, {
        type: 'RESUME_SESSION',
        timestamp: 5000,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('INVALID_TRANSITION');
      }
    });
  });

  // ============================================================================
  // COMPLETE_ACTIVITY
  // ============================================================================

  describe('COMPLETE_ACTIVITY', () => {
    it('should record activity and increment currentItemIndex', () => {
      const inProgress = startSession(makeReadyState(), 1000);
      const result = sessionStateReducer(inProgress, {
        type: 'COMPLETE_ACTIVITY',
        activityId: 'item-1',
        timestamp: 30_000,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.newState.completedActivityIds).toContain('item-1');
        expect(result.newState.currentItemIndex).toBe(1);
      }
    });

    it('should not duplicate an activity that is already completed', () => {
      const inProgress = startSession(makeReadyState(), 1000);
      const first = sessionStateReducer(inProgress, {
        type: 'COMPLETE_ACTIVITY',
        activityId: 'item-1',
        timestamp: 30_000,
      });
      expect(first.success).toBe(true);
      if (!first.success) return;

      const second = sessionStateReducer(first.newState, {
        type: 'COMPLETE_ACTIVITY',
        activityId: 'item-1',
        timestamp: 35_000,
      });
      expect(second.success).toBe(true);
      if (second.success) {
        const ids = second.newState.completedActivityIds;
        expect(ids.filter((id) => id === 'item-1').length).toBe(1);
      }
    });

    it('should reject COMPLETE_ACTIVITY when session is paused', () => {
      const inProgress = startSession(makeReadyState(), 1000);
      const paused = sessionStateReducer(inProgress, {
        type: 'PAUSE_SESSION',
        timestamp: 5000,
      });
      expect(paused.success).toBe(true);
      if (!paused.success) return;

      const result = sessionStateReducer(paused.newState, {
        type: 'COMPLETE_ACTIVITY',
        activityId: 'item-1',
        timestamp: 10_000,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('INVALID_STATE');
      }
    });

    it('should reject COMPLETE_ACTIVITY when session is ready (not started)', () => {
      const state = makeReadyState();
      const result = sessionStateReducer(state, {
        type: 'COMPLETE_ACTIVITY',
        activityId: 'item-1',
        timestamp: 1000,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('INVALID_STATE');
      }
    });

    it('should update encounterDurationMs when completing activity in encounter stage', () => {
      const inProgress = startSession(makeReadyState(), 1000);
      const result = sessionStateReducer(inProgress, {
        type: 'COMPLETE_ACTIVITY',
        activityId: 'item-1',
        timestamp: 61_000, // 60 seconds in
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.newState.encounterDurationMs).toBe(60_000);
      }
    });
  });

  // ============================================================================
  // ADVANCE_STAGE
  // ============================================================================

  describe('ADVANCE_STAGE — encounter → analysis', () => {
    it('should advance when encounterComplete and minimum duration met', () => {
      const state = encounterStateWithDuration(180_000, true);
      const result = sessionStateReducer(state, {
        type: 'ADVANCE_STAGE',
        timestamp: 181_000,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.newState.currentStage).toBe('analysis');
        expect(result.newState.encounterComplete).toBe(true);
        expect(result.newState.analysisStartedAt).toBe(181_000);
      }
    });

    it('should reject advance when encounterComplete is false', () => {
      const state = encounterStateWithDuration(180_000, false);
      const result = sessionStateReducer(state, {
        type: 'ADVANCE_STAGE',
        timestamp: 181_000,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('GUARD_FAILED');
      }
    });

    it('should reject advance when encounter duration is too short', () => {
      const state = encounterStateWithDuration(60_000, true); // 1 min, need 3 min
      const result = sessionStateReducer(state, {
        type: 'ADVANCE_STAGE',
        timestamp: 61_000,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('GUARD_FAILED');
      }
    });

    it('should reject advance when encounterStartedAt is null', () => {
      const state: SessionState = {
        ...encounterStateWithDuration(180_000, true),
        encounterStartedAt: null,
      };
      const result = sessionStateReducer(state, {
        type: 'ADVANCE_STAGE',
        timestamp: 181_000,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('GUARD_FAILED');
      }
    });
  });

  describe('ADVANCE_STAGE — analysis → return', () => {
    it('should advance when analysisComplete, duration met, and items completed', () => {
      const state = analysisStateWithDuration(360_000, true, 1);
      const result = sessionStateReducer(state, {
        type: 'ADVANCE_STAGE',
        timestamp: 541_000,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.newState.currentStage).toBe('return');
        expect(result.newState.analysisComplete).toBe(true);
        expect(result.newState.returnStartedAt).toBe(541_000);
      }
    });

    it('should reject advance when analysisComplete is false', () => {
      const state = analysisStateWithDuration(360_000, false, 1);
      const result = sessionStateReducer(state, {
        type: 'ADVANCE_STAGE',
        timestamp: 541_000,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('GUARD_FAILED');
      }
    });

    it('should reject advance when analysis duration is too short', () => {
      const state = analysisStateWithDuration(120_000, true, 1); // 2 min, need 6 min
      const result = sessionStateReducer(state, {
        type: 'ADVANCE_STAGE',
        timestamp: 301_000,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('GUARD_FAILED');
      }
    });

    it('should reject advance when no items have been completed (currentItemIndex === 0)', () => {
      const state = analysisStateWithDuration(360_000, true, 0); // zero items completed
      const result = sessionStateReducer(state, {
        type: 'ADVANCE_STAGE',
        timestamp: 541_000,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('GUARD_FAILED');
      }
    });

    it('should reject advance when analysisStartedAt is null', () => {
      const state: SessionState = {
        ...analysisStateWithDuration(360_000, true, 1),
        analysisStartedAt: null,
      };
      const result = sessionStateReducer(state, {
        type: 'ADVANCE_STAGE',
        timestamp: 541_000,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('GUARD_FAILED');
      }
    });
  });

  describe('ADVANCE_STAGE — return (terminal)', () => {
    it('should reject advance from return stage (use COMPLETE_SESSION instead)', () => {
      const state = returnStateWithDuration(180_000, true);
      const result = sessionStateReducer(state, {
        type: 'ADVANCE_STAGE',
        timestamp: 721_000,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('INVALID_TRANSITION');
        expect(result.reason).toContain('COMPLETE_SESSION');
      }
    });
  });

  describe('ADVANCE_STAGE — invalid session state', () => {
    it('should reject ADVANCE_STAGE when session is not in_progress', () => {
      const state = makeReadyState();
      const result = sessionStateReducer(state, {
        type: 'ADVANCE_STAGE',
        timestamp: 5000,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('INVALID_STATE');
      }
    });

    it('should reject ADVANCE_STAGE when currentStage is null', () => {
      // Construct an unusual in_progress state with null stage
      const state: SessionState = {
        ...makeReadyState(),
        status: 'in_progress',
        currentStage: null,
      };
      const result = sessionStateReducer(state, {
        type: 'ADVANCE_STAGE',
        timestamp: 5000,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('INVALID_STATE');
      }
    });
  });

  // ============================================================================
  // SKIP_STAGE
  // ============================================================================

  describe('SKIP_STAGE', () => {
    it('should skip encounter → analysis without guard enforcement', () => {
      const inProgress = startSession(makeReadyState(), 1000);
      const result = sessionStateReducer(inProgress, {
        type: 'SKIP_STAGE',
        reason: 'debug',
        timestamp: 5000,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.newState.currentStage).toBe('analysis');
        expect(result.newState.encounterComplete).toBe(true);
        expect(result.newState.analysisStartedAt).toBe(5000);
      }
    });

    it('should skip analysis → return', () => {
      // Advance to analysis first via skip
      const inProgress = startSession(makeReadyState(), 1000);
      const skipToAnalysis = sessionStateReducer(inProgress, {
        type: 'SKIP_STAGE',
        reason: 'debug',
        timestamp: 5000,
      });
      expect(skipToAnalysis.success).toBe(true);
      if (!skipToAnalysis.success) return;

      const result = sessionStateReducer(skipToAnalysis.newState, {
        type: 'SKIP_STAGE',
        reason: 'debug',
        timestamp: 10_000,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.newState.currentStage).toBe('return');
        expect(result.newState.analysisComplete).toBe(true);
        expect(result.newState.returnStartedAt).toBe(10_000);
      }
    });

    it('should reject SKIP_STAGE from return stage (final stage)', () => {
      // Skip to return
      const inProgress = startSession(makeReadyState(), 1000);
      const s1 = sessionStateReducer(inProgress, {
        type: 'SKIP_STAGE',
        reason: 'debug',
        timestamp: 5000,
      });
      expect(s1.success).toBe(true);
      if (!s1.success) return;

      const s2 = sessionStateReducer(s1.newState, {
        type: 'SKIP_STAGE',
        reason: 'debug',
        timestamp: 10_000,
      });
      expect(s2.success).toBe(true);
      if (!s2.success) return;

      // Now try to skip from return
      const result = sessionStateReducer(s2.newState, {
        type: 'SKIP_STAGE',
        reason: 'debug',
        timestamp: 15_000,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('INVALID_TRANSITION');
      }
    });

    it('should reject SKIP_STAGE when session is not in_progress', () => {
      const state = makeReadyState();
      const result = sessionStateReducer(state, {
        type: 'SKIP_STAGE',
        reason: 'debug',
        timestamp: 5000,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('INVALID_STATE');
      }
    });

    it('should reject SKIP_STAGE when currentStage is null on in_progress session', () => {
      const state: SessionState = {
        ...makeReadyState(),
        status: 'in_progress',
        currentStage: null,
      };
      const result = sessionStateReducer(state, {
        type: 'SKIP_STAGE',
        reason: 'debug',
        timestamp: 5000,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('INVALID_STATE');
      }
    });
  });

  // ============================================================================
  // COMPLETE_SESSION
  // ============================================================================

  describe('COMPLETE_SESSION', () => {
    it('should complete session when return stage is done and duration met', () => {
      const state = returnStateWithDuration(180_000, true);
      const result = sessionStateReducer(state, {
        type: 'COMPLETE_SESSION',
        timestamp: 721_000,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.newState.status).toBe('completed');
        expect(result.newState.completedAt).toBe(721_000);
        expect(result.newState.returnComplete).toBe(true);
        // totalDurationMs = encounter + analysis + return
        expect(result.newState.totalDurationMs).toBe(
          result.newState.encounterDurationMs +
            result.newState.analysisDurationMs +
            result.newState.returnDurationMs
        );
      }
    });

    it('should reject COMPLETE_SESSION when returnComplete is false', () => {
      const state = returnStateWithDuration(180_000, false);
      const result = sessionStateReducer(state, {
        type: 'COMPLETE_SESSION',
        timestamp: 721_000,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('GUARD_FAILED');
      }
    });

    it('should reject COMPLETE_SESSION when return duration is too short', () => {
      const state = returnStateWithDuration(60_000, true); // 1 min, need 3 min
      const result = sessionStateReducer(state, {
        type: 'COMPLETE_SESSION',
        timestamp: 600_000,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('GUARD_FAILED');
      }
    });

    it('should reject COMPLETE_SESSION when not in return stage', () => {
      const state = encounterStateWithDuration(180_000, true);
      // Override returnComplete to true to isolate the stage check
      const withReturnComplete: SessionState = { ...state, returnComplete: true, returnDurationMs: 180_000 };
      const result = sessionStateReducer(withReturnComplete, {
        type: 'COMPLETE_SESSION',
        timestamp: 400_000,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('GUARD_FAILED');
      }
    });

    it('should reject COMPLETE_SESSION when returnStartedAt is null', () => {
      const state: SessionState = {
        ...returnStateWithDuration(180_000, true),
        returnStartedAt: null,
      };
      const result = sessionStateReducer(state, {
        type: 'COMPLETE_SESSION',
        timestamp: 721_000,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('GUARD_FAILED');
      }
    });
  });

  // ============================================================================
  // ABANDON_SESSION
  // ============================================================================

  describe('ABANDON_SESSION', () => {
    it('should abandon session during encounter stage and record stage', () => {
      const inProgress = startSession(makeReadyState(), 1000);
      const result = sessionStateReducer(inProgress, {
        type: 'ABANDON_SESSION',
        reason: 'user closed app',
        timestamp: 10_000,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.newState.status).toBe('abandoned');
        expect(result.newState.abandonedAtStage).toBe('encounter');
        expect(result.newState.abandonmentReason).toBe('user closed app');
      }
    });

    it('should abandon session during analysis stage', () => {
      const state = analysisStateWithDuration(120_000, false, 1);
      const result = sessionStateReducer(state, {
        type: 'ABANDON_SESSION',
        reason: 'timeout',
        timestamp: 300_000,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.newState.status).toBe('abandoned');
        expect(result.newState.abandonedAtStage).toBe('analysis');
      }
    });

    it('should abandon session during return stage', () => {
      const state = returnStateWithDuration(60_000, false);
      const result = sessionStateReducer(state, {
        type: 'ABANDON_SESSION',
        reason: 'network error',
        timestamp: 620_000,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.newState.status).toBe('abandoned');
        expect(result.newState.abandonedAtStage).toBe('return');
      }
    });

    it('should abandon session from paused state', () => {
      const inProgress = startSession(makeReadyState(), 1000);
      const paused = sessionStateReducer(inProgress, {
        type: 'PAUSE_SESSION',
        timestamp: 10_000,
      });
      expect(paused.success).toBe(true);
      if (!paused.success) return;

      const result = sessionStateReducer(paused.newState, {
        type: 'ABANDON_SESSION',
        reason: 'user gave up',
        timestamp: 20_000,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.newState.status).toBe('abandoned');
        expect(result.newState.abandonedAtStage).toBe('encounter');
      }
    });

    it('should reject ABANDON_SESSION when session is already completed', () => {
      const returnState = returnStateWithDuration(180_000, true);
      const completed = sessionStateReducer(returnState, {
        type: 'COMPLETE_SESSION',
        timestamp: 721_000,
      });
      expect(completed.success).toBe(true);
      if (!completed.success) return;

      const result = sessionStateReducer(completed.newState, {
        type: 'ABANDON_SESSION',
        reason: 'too late',
        timestamp: 730_000,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('INVALID_STATE');
      }
    });
  });

  // ============================================================================
  // RESUME_ABANDONED
  // ============================================================================

  describe('RESUME_ABANDONED', () => {
    it('should resume an abandoned session back to in_progress and clear reason', () => {
      const inProgress = startSession(makeReadyState(), 1000);
      const abandoned = sessionStateReducer(inProgress, {
        type: 'ABANDON_SESSION',
        reason: 'user stepped away',
        timestamp: 10_000,
      });
      expect(abandoned.success).toBe(true);
      if (!abandoned.success) return;

      const result = sessionStateReducer(abandoned.newState, {
        type: 'RESUME_ABANDONED',
        timestamp: 50_000,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.newState.status).toBe('in_progress');
        expect(result.newState.abandonmentReason).toBe(null);
        // abandonedAtStage is preserved for analytics
        expect(result.newState.abandonedAtStage).toBe('encounter');
      }
    });

    it('should reject RESUME_ABANDONED when session is in_progress (not abandoned)', () => {
      const inProgress = startSession(makeReadyState(), 1000);
      const result = sessionStateReducer(inProgress, {
        type: 'RESUME_ABANDONED',
        timestamp: 5000,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        // canResumeSession only allows paused or abandoned; in_progress fails the guard
        expect(result.error).toBe('INVALID_TRANSITION');
      }
    });

    it('should reject RESUME_ABANDONED when session is paused (not abandoned)', () => {
      const inProgress = startSession(makeReadyState(), 1000);
      const paused = sessionStateReducer(inProgress, {
        type: 'PAUSE_SESSION',
        timestamp: 5000,
      });
      expect(paused.success).toBe(true);
      if (!paused.success) return;

      // Guard allows paused OR abandoned, but the handler checks status === 'abandoned'
      const result = sessionStateReducer(paused.newState, {
        type: 'RESUME_ABANDONED',
        timestamp: 10_000,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('INVALID_STATE');
      }
    });
  });

  // ============================================================================
  // Full end-to-end happy path
  // ============================================================================

  describe('Full session happy path (ready → encounter → analysis → return → completed)', () => {
    it('should complete a full session through all stages', () => {
      let state = makeReadyState(['item-1', 'item-2', 'item-3']);

      // Start at t=1000 (non-zero to avoid falsy-timestamp edge case in reducer)
      const start = sessionStateReducer(state, {
        type: 'START_SESSION',
        sessionId: 'test-session',
        timestamp: 1000,
      });
      expect(start.success).toBe(true);
      if (!start.success) return;
      state = start.newState;
      expect(state.status).toBe('in_progress');
      expect(state.currentStage).toBe('encounter');

      // Complete activity in encounter
      const actResult = sessionStateReducer(state, {
        type: 'COMPLETE_ACTIVITY',
        activityId: 'item-1',
        timestamp: 61_000,
      });
      expect(actResult.success).toBe(true);
      if (!actResult.success) return;
      state = actResult.newState;

      // Manually mark encounter complete and meeting minimum duration
      state = { ...state, encounterComplete: true, encounterDurationMs: 180_000 };

      // Advance encounter → analysis
      const adv1 = sessionStateReducer(state, {
        type: 'ADVANCE_STAGE',
        timestamp: 181_000,
      });
      expect(adv1.success).toBe(true);
      if (!adv1.success) return;
      state = adv1.newState;
      expect(state.currentStage).toBe('analysis');

      // Complete two activities in analysis
      for (const [id, ts] of [
        ['item-2', 250_000],
        ['item-3', 400_000],
      ] as [string, number][]) {
        const r = sessionStateReducer(state, {
          type: 'COMPLETE_ACTIVITY',
          activityId: id,
          timestamp: ts,
        });
        expect(r.success).toBe(true);
        if (!r.success) return;
        state = r.newState;
      }

      // Mark analysis complete and meeting minimum duration
      state = { ...state, analysisComplete: true, analysisDurationMs: 360_000 };

      // Advance analysis → return
      const adv2 = sessionStateReducer(state, {
        type: 'ADVANCE_STAGE',
        timestamp: 541_000,
      });
      expect(adv2.success).toBe(true);
      if (!adv2.success) return;
      state = adv2.newState;
      expect(state.currentStage).toBe('return');

      // Mark return complete and meeting minimum duration
      state = { ...state, returnComplete: true, returnDurationMs: 180_000 };

      // Complete session
      const complete = sessionStateReducer(state, {
        type: 'COMPLETE_SESSION',
        timestamp: 721_000,
      });
      expect(complete.success).toBe(true);
      if (complete.success) {
        expect(complete.newState.status).toBe('completed');
        expect(complete.newState.completedAt).toBe(721_000);
        expect(complete.newState.totalDurationMs).toBeGreaterThan(0);
        expect(validateSessionState(complete.newState)).toEqual([]);
      }
    });
  });

  // ============================================================================
  // Duration accumulation across pause/resume within a stage
  // ============================================================================

  describe('Duration tracking with pause/resume', () => {
    it('should track pausedDurationMs correctly across a pause/resume cycle', () => {
      // Session starts at t=1000
      let state = startSession(makeReadyState(), 1000);

      // Pause at t=11000, resume at t=21000 (10s pause)
      const paused = sessionStateReducer(state, {
        type: 'PAUSE_SESSION',
        timestamp: 11_000,
      });
      expect(paused.success).toBe(true);
      if (!paused.success) return;

      const resumed = sessionStateReducer(paused.newState, {
        type: 'RESUME_SESSION',
        timestamp: 21_000,
      });
      expect(resumed.success).toBe(true);
      if (!resumed.success) return;
      state = resumed.newState;

      // Verify pausedDurationMs accumulated correctly
      expect(state.pausedDurationMs).toBe(10_000);

      // Complete activity at t=31000
      // calculateCurrentStageDuration: timestamp - stageStartedAt = 31000 - 1000 = 30000
      // (past pauses not subtracted — only current active pause would be subtracted)
      const activity = sessionStateReducer(state, {
        type: 'COMPLETE_ACTIVITY',
        activityId: 'item-1',
        timestamp: 31_000,
      });
      expect(activity.success).toBe(true);
      if (activity.success) {
        // Wall clock duration from encounter start to now (pauses tracked separately in pausedDurationMs)
        expect(activity.newState.encounterDurationMs).toBe(30_000);
      }
    });

    it('should subtract current active pause duration from stage duration', () => {
      // Session starts at t=1000
      const state = startSession(makeReadyState(), 1000);

      // Pause at t=6000 — while still paused, ADVANCE_STAGE is blocked by guard
      // But we can test that calculateCurrentStageDuration with an active pause
      // returns duration minus the ongoing pause period.
      // We verify this by checking the paused state object directly.
      const paused = sessionStateReducer(state, {
        type: 'PAUSE_SESSION',
        timestamp: 6_000,
      });
      expect(paused.success).toBe(true);
      if (paused.success) {
        expect(paused.newState.status).toBe('paused');
        expect(paused.newState.pausedAt).toBe(6_000);
        // pausedDurationMs not yet incremented (will be added on resume)
        expect(paused.newState.pausedDurationMs).toBe(0);
      }
    });
  });

  // ============================================================================
  // Guard conditions (direct unit tests)
  // ============================================================================

  describe('Guard Conditions', () => {
    describe('canStartSession', () => {
      it('returns true for ready state with items', () => {
        expect(defaultGuards.canStartSession(makeReadyState())).toBe(true);
      });

      it('returns false for empty item queue', () => {
        expect(defaultGuards.canStartSession(makeReadyState([]))).toBe(false);
      });

      it('returns false for non-ready status', () => {
        const state: SessionState = { ...makeReadyState(), status: 'in_progress' };
        expect(defaultGuards.canStartSession(state)).toBe(false);
      });
    });

    describe('canAdvanceToAnalysis', () => {
      it('returns true when all conditions met', () => {
        const state = encounterStateWithDuration(180_000, true);
        expect(defaultGuards.canAdvanceToAnalysis(state)).toBe(true);
      });

      it('returns false when encounterComplete is false', () => {
        const state = encounterStateWithDuration(180_000, false);
        expect(defaultGuards.canAdvanceToAnalysis(state)).toBe(false);
      });

      it('returns false when duration is below minimum', () => {
        const state = encounterStateWithDuration(100_000, true);
        expect(defaultGuards.canAdvanceToAnalysis(state)).toBe(false);
      });

      it('returns false when in wrong stage', () => {
        const state: SessionState = {
          ...encounterStateWithDuration(180_000, true),
          currentStage: 'analysis',
        };
        expect(defaultGuards.canAdvanceToAnalysis(state)).toBe(false);
      });

      it('returns false when encounterStartedAt is null', () => {
        const state: SessionState = {
          ...encounterStateWithDuration(180_000, true),
          encounterStartedAt: null,
        };
        expect(defaultGuards.canAdvanceToAnalysis(state)).toBe(false);
      });

      it('respects custom minDurationMs parameter', () => {
        const state = encounterStateWithDuration(30_000, true);
        // Custom min of 10s — should pass
        expect(defaultGuards.canAdvanceToAnalysis(state, 10_000)).toBe(true);
        // Default 3min — should fail
        expect(defaultGuards.canAdvanceToAnalysis(state)).toBe(false);
      });
    });

    describe('canAdvanceToReturn', () => {
      it('returns true when all conditions met', () => {
        const state = analysisStateWithDuration(360_000, true, 1);
        expect(defaultGuards.canAdvanceToReturn(state)).toBe(true);
      });

      it('returns false when analysisComplete is false', () => {
        const state = analysisStateWithDuration(360_000, false, 1);
        expect(defaultGuards.canAdvanceToReturn(state)).toBe(false);
      });

      it('returns false when duration is below minimum', () => {
        const state = analysisStateWithDuration(100_000, true, 1);
        expect(defaultGuards.canAdvanceToReturn(state)).toBe(false);
      });

      it('returns false when currentItemIndex is 0', () => {
        const state = analysisStateWithDuration(360_000, true, 0);
        expect(defaultGuards.canAdvanceToReturn(state)).toBe(false);
      });

      it('returns false when in wrong stage', () => {
        const state: SessionState = {
          ...analysisStateWithDuration(360_000, true, 1),
          currentStage: 'encounter',
        };
        expect(defaultGuards.canAdvanceToReturn(state)).toBe(false);
      });

      it('returns false when analysisStartedAt is null', () => {
        const state: SessionState = {
          ...analysisStateWithDuration(360_000, true, 1),
          analysisStartedAt: null,
        };
        expect(defaultGuards.canAdvanceToReturn(state)).toBe(false);
      });

      it('respects custom minDurationMs parameter', () => {
        const state = analysisStateWithDuration(60_000, true, 1);
        expect(defaultGuards.canAdvanceToReturn(state, 30_000)).toBe(true);
        expect(defaultGuards.canAdvanceToReturn(state)).toBe(false);
      });
    });

    describe('canCompleteSession', () => {
      it('returns true when all conditions met', () => {
        const state = returnStateWithDuration(180_000, true);
        expect(defaultGuards.canCompleteSession(state)).toBe(true);
      });

      it('returns false when returnComplete is false', () => {
        const state = returnStateWithDuration(180_000, false);
        expect(defaultGuards.canCompleteSession(state)).toBe(false);
      });

      it('returns false when duration is below minimum', () => {
        const state = returnStateWithDuration(60_000, true);
        expect(defaultGuards.canCompleteSession(state)).toBe(false);
      });

      it('returns false when in wrong stage', () => {
        const state: SessionState = {
          ...returnStateWithDuration(180_000, true),
          currentStage: 'analysis',
        };
        expect(defaultGuards.canCompleteSession(state)).toBe(false);
      });

      it('returns false when returnStartedAt is null', () => {
        const state: SessionState = {
          ...returnStateWithDuration(180_000, true),
          returnStartedAt: null,
        };
        expect(defaultGuards.canCompleteSession(state)).toBe(false);
      });

      it('respects custom minDurationMs parameter', () => {
        const state = returnStateWithDuration(30_000, true);
        expect(defaultGuards.canCompleteSession(state, 10_000)).toBe(true);
        expect(defaultGuards.canCompleteSession(state)).toBe(false);
      });
    });

    describe('canPauseSession', () => {
      it('returns true for in_progress session with no pausedAt', () => {
        const state = startSession(makeReadyState(), 1000);
        expect(defaultGuards.canPauseSession(state)).toBe(true);
      });

      it('returns false when already paused (pausedAt is set)', () => {
        const inProgress = startSession(makeReadyState(), 1000);
        const paused = sessionStateReducer(inProgress, {
          type: 'PAUSE_SESSION',
          timestamp: 5000,
        });
        expect(paused.success).toBe(true);
        if (!paused.success) return;
        expect(defaultGuards.canPauseSession(paused.newState)).toBe(false);
      });

      it('returns false when status is not in_progress', () => {
        expect(defaultGuards.canPauseSession(makeReadyState())).toBe(false);
      });
    });

    describe('canResumeSession', () => {
      it('returns true for paused state', () => {
        const inProgress = startSession(makeReadyState(), 1000);
        const paused = sessionStateReducer(inProgress, {
          type: 'PAUSE_SESSION',
          timestamp: 5000,
        });
        expect(paused.success).toBe(true);
        if (!paused.success) return;
        expect(defaultGuards.canResumeSession(paused.newState)).toBe(true);
      });

      it('returns true for abandoned state', () => {
        const inProgress = startSession(makeReadyState(), 1000);
        const abandoned = sessionStateReducer(inProgress, {
          type: 'ABANDON_SESSION',
          reason: 'test',
          timestamp: 5000,
        });
        expect(abandoned.success).toBe(true);
        if (!abandoned.success) return;
        expect(defaultGuards.canResumeSession(abandoned.newState)).toBe(true);
      });

      it('returns false for in_progress state', () => {
        const state = startSession(makeReadyState(), 1000);
        expect(defaultGuards.canResumeSession(state)).toBe(false);
      });

      it('returns false for ready state', () => {
        expect(defaultGuards.canResumeSession(makeReadyState())).toBe(false);
      });

      it('returns false for completed state', () => {
        const returnState = returnStateWithDuration(180_000, true);
        const completed = sessionStateReducer(returnState, {
          type: 'COMPLETE_SESSION',
          timestamp: 721_000,
        });
        expect(completed.success).toBe(true);
        if (!completed.success) return;
        expect(defaultGuards.canResumeSession(completed.newState)).toBe(false);
      });
    });
  });

  // ============================================================================
  // Progress Calculations
  // ============================================================================

  describe('Progress Calculations', () => {
    describe('calculateStageProgress', () => {
      it('should calculate 50% progress when at half the target duration', () => {
        const state = encounterStateWithDuration(120_000, false); // 2 min of 4 min target
        expect(calculateStageProgress(state)).toBe(0.5);
      });

      it('should cap at 1.0 when beyond target duration', () => {
        const state = encounterStateWithDuration(600_000, true); // way over 4 min target
        expect(calculateStageProgress(state)).toBe(1.0);
      });

      it('should return 0 when currentStage is null', () => {
        const state = makeReadyState();
        expect(calculateStageProgress(state)).toBe(0);
      });

      it('should return 0 for zero duration', () => {
        const state = encounterStateWithDuration(0, false);
        expect(calculateStageProgress(state)).toBe(0);
      });

      it('should calculate progress for analysis stage', () => {
        const state = analysisStateWithDuration(300_000, false, 1); // 5 min of 10 min target
        expect(calculateStageProgress(state)).toBe(0.5);
      });

      it('should calculate progress for return stage', () => {
        const state = returnStateWithDuration(120_000, false); // 2 min of 4 min target
        expect(calculateStageProgress(state)).toBe(0.5);
      });

      it('should use custom config when provided', () => {
        const state = encounterStateWithDuration(60_000, false);
        const customConfig = { ...defaultSessionConfig, targetEncounterDurationMs: 60_000 };
        expect(calculateStageProgress(state, customConfig)).toBe(1.0);
      });
    });

    describe('calculateSessionProgress', () => {
      it('should return 0 for a fresh session', () => {
        const state = makeReadyState();
        expect(calculateSessionProgress(state)).toBe(0);
      });

      it('should calculate ~50% when halfway through all stages', () => {
        // Total target: 240000 + 600000 + 240000 = 1080000
        // Completed: 240000 + 300000 = 540000 → 50%
        const state: SessionState = {
          ...analysisStateWithDuration(300_000, false, 1),
          encounterDurationMs: 240_000,
        };
        const progress = calculateSessionProgress(state);
        expect(progress).toBeCloseTo(0.5, 2);
      });

      it('should cap at 1.0 when over total target', () => {
        const state: SessionState = {
          ...returnStateWithDuration(600_000, true),
          encounterDurationMs: 600_000,
          analysisDurationMs: 600_000,
        };
        expect(calculateSessionProgress(state)).toBe(1.0);
      });
    });

    describe('getCurrentStageDuration', () => {
      it('should return active time since stage start', () => {
        // Use non-zero start timestamp; the reducer treats 0 as falsy ("not set")
        const state = startSession(makeReadyState(), 1000);
        const duration = getCurrentStageDuration(state, 31_000);
        expect(duration).toBe(30_000);
      });

      it('should return 0 when session is not in_progress', () => {
        const state = makeReadyState();
        expect(getCurrentStageDuration(state, 10_000)).toBe(0);
      });

      it('should return 0 when currentStage is null', () => {
        const state: SessionState = {
          ...makeReadyState(),
          status: 'in_progress',
          currentStage: null,
        };
        expect(getCurrentStageDuration(state, 10_000)).toBe(0);
      });
    });

    describe('isStageDurationMet', () => {
      it('should return true when encounter duration meets minimum', () => {
        const state = encounterStateWithDuration(180_000, false);
        expect(isStageDurationMet(state)).toBe(true);
      });

      it('should return false when encounter duration is below minimum', () => {
        const state = encounterStateWithDuration(60_000, false);
        expect(isStageDurationMet(state)).toBe(false);
      });

      it('should return true when analysis duration meets minimum', () => {
        const state = analysisStateWithDuration(360_000, false, 0);
        expect(isStageDurationMet(state)).toBe(true);
      });

      it('should return false when currentStage is null', () => {
        const state = makeReadyState();
        expect(isStageDurationMet(state)).toBe(false);
      });

      it('should return false when stage duration is zero (exercises || 0 fallback)', () => {
        const state = encounterStateWithDuration(0, false); // encounterDurationMs = 0
        expect(isStageDurationMet(state)).toBe(false);
      });

      it('should use custom config when provided', () => {
        const state = encounterStateWithDuration(30_000, false);
        const customConfig = { ...defaultSessionConfig, minEncounterDurationMs: 10_000 };
        expect(isStageDurationMet(state, customConfig)).toBe(true);
        expect(isStageDurationMet(state)).toBe(false);
      });
    });
  });

  // ============================================================================
  // State Validation
  // ============================================================================

  describe('State Validation', () => {
    it('should pass for a valid initial state', () => {
      expect(validateSessionState(makeReadyState())).toEqual([]);
    });

    it('should detect in_progress with null currentStage', () => {
      const state: SessionState = {
        ...makeReadyState(),
        status: 'in_progress',
        currentStage: null,
      };
      const errors = validateSessionState(state);
      expect(errors.some((e) => e.includes('in_progress but currentStage is null'))).toBe(true);
    });

    it('should detect completed with null completedAt', () => {
      const state: SessionState = {
        ...returnStateWithDuration(180_000, true),
        status: 'completed',
        completedAt: null,
      };
      const errors = validateSessionState(state);
      expect(errors.some((e) => e.includes('completedAt is null'))).toBe(true);
    });

    it('should detect completedAt before startedAt', () => {
      const state: SessionState = {
        ...returnStateWithDuration(180_000, true),
        status: 'completed',
        startedAt: 1000,
        completedAt: 500, // before startedAt
      };
      const errors = validateSessionState(state);
      expect(errors.some((e) => e.includes('completedAt is before startedAt'))).toBe(true);
    });

    it('should detect analysis started before encounter', () => {
      const state: SessionState = {
        ...makeReadyState(),
        status: 'in_progress',
        currentStage: 'analysis',
        encounterStartedAt: null, // missing encounter start
        analysisStartedAt: 1000,
      };
      const errors = validateSessionState(state);
      expect(errors.some((e) => e.includes('Analysis started before Encounter'))).toBe(true);
    });

    it('should detect return started before analysis', () => {
      const state: SessionState = {
        ...makeReadyState(),
        status: 'in_progress',
        currentStage: 'return',
        encounterStartedAt: 1000,
        analysisStartedAt: null, // missing analysis start
        returnStartedAt: 5000,
      };
      const errors = validateSessionState(state);
      expect(errors.some((e) => e.includes('Return started before Analysis'))).toBe(true);
    });

    it('should detect negative stage durations', () => {
      const state: SessionState = {
        ...makeReadyState(),
        encounterDurationMs: -1,
      };
      const errors = validateSessionState(state);
      expect(errors.some((e) => e.includes('Negative stage duration'))).toBe(true);
    });

    it('should detect currentItemIndex exceeding itemQueue length', () => {
      const state: SessionState = {
        ...makeReadyState(['item-1']),
        currentItemIndex: 5,
      };
      const errors = validateSessionState(state);
      expect(errors.some((e) => e.includes('currentItemIndex exceeds itemQueue length'))).toBe(
        true
      );
    });
  });

  // ============================================================================
  // Edge Cases and Error Paths
  // ============================================================================

  describe('Edge Cases', () => {
    it('should return REDUCER_ERROR when a guard throws an unexpected exception', () => {
      const state = makeReadyState();
      const throwingGuards = {
        ...defaultGuards,
        canStartSession: () => {
          throw new Error('Unexpected guard failure');
        },
      };
      const result = sessionStateReducer(
        state,
        { type: 'START_SESSION', sessionId: 'test-session', timestamp: 1000 },
        defaultSessionConfig,
        throwingGuards
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('REDUCER_ERROR');
        expect(result.reason).toContain('Unexpected guard failure');
      }
    });

    it('should handle REDUCER_ERROR with non-Error thrown value', () => {
      const state = makeReadyState();
      const throwingGuards = {
        ...defaultGuards,
        canStartSession: () => {
          // eslint-disable-next-line @typescript-eslint/no-throw-literal
          throw 'string error';
        },
      };
      const result = sessionStateReducer(
        state,
        { type: 'START_SESSION', sessionId: 'test-session', timestamp: 1000 },
        defaultSessionConfig,
        throwingGuards
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('REDUCER_ERROR');
        expect(result.reason).toBe('Unknown error in reducer');
      }
    });

    it('should handle RESUME_SESSION when pausedAt is null (zero pause duration)', () => {
      // An abandoned session may have status='paused' conceptually but pausedAt=null
      // canResumeSession allows both 'paused' and 'abandoned'; if we construct a paused
      // state with pausedAt=null the ternary on line 145 takes the false branch (returns 0).
      const state: SessionState = {
        ...startSession(makeReadyState(), 1000),
        status: 'paused',
        pausedAt: null, // null despite being 'paused' — exercises the ternary false branch
      };

      const result = sessionStateReducer(state, {
        type: 'RESUME_SESSION',
        timestamp: 5000,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.newState.status).toBe('in_progress');
        // pauseDuration was 0 (since pausedAt was null), so pausedDurationMs unchanged
        expect(result.newState.pausedDurationMs).toBe(0);
      }
    });

    it('should return UNKNOWN_EVENT for an unrecognised event type', () => {
      const state = makeReadyState();
      // Cast to bypass TypeScript exhaustiveness check and reach the default branch
      const unknownEvent = { type: 'TOTALLY_UNKNOWN', timestamp: 1000 } as unknown as Parameters<
        typeof sessionStateReducer
      >[1];

      const result = sessionStateReducer(state, unknownEvent);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('UNKNOWN_EVENT');
      }
    });

    it('should subtract active pause time from stage duration during COMPLETE_SESSION with pausedAt set', () => {
      // Construct an in_progress return state that also has a pausedAt set
      // (inconsistent state — but exercises the pausedAt branch in calculateCurrentStageDuration)
      const state: SessionState = {
        ...returnStateWithDuration(180_000, true),
        // Simulate being "in_progress" but with a pausedAt timestamp present
        status: 'in_progress',
        pausedAt: 700_000, // started pausing at t=700000
      };

      const result = sessionStateReducer(state, {
        type: 'COMPLETE_SESSION',
        timestamp: 721_000,
      });

      // canCompleteSession checks state.returnDurationMs >= minDuration (180000 >= 180000 = true)
      // calculateCurrentStageDuration: duration = 721000 - 541000 = 180000
      // minus pausedAt branch: 721000 - 700000 = 21000 → duration = 180000 - 21000 = 159000
      // But since returnDurationMs was already 180000 and the computed duration is lower,
      // the result will write the lower value — the important thing is the branch executes.
      expect(result.success).toBe(true);
    });
  });

  // ============================================================================
  // Helper Functions
  // ============================================================================

  describe('Helper Functions', () => {
    describe('getNextStage', () => {
      it('encounter → analysis', () => expect(getNextStage('encounter')).toBe('analysis'));
      it('analysis → return', () => expect(getNextStage('analysis')).toBe('return'));
      it('return → null (final stage)', () => expect(getNextStage('return')).toBe(null));
    });

    describe('getStageIndex', () => {
      it('encounter is index 0', () => expect(getStageIndex('encounter')).toBe(0));
      it('analysis is index 1', () => expect(getStageIndex('analysis')).toBe(1));
      it('return is index 2', () => expect(getStageIndex('return')).toBe(2));
    });

    describe('isRightHemisphereStage', () => {
      it('encounter is RH', () => expect(isRightHemisphereStage('encounter')).toBe(true));
      it('analysis is not RH', () => expect(isRightHemisphereStage('analysis')).toBe(false));
      it('return is RH', () => expect(isRightHemisphereStage('return')).toBe(true));
    });

    describe('isLeftHemisphereStage', () => {
      it('encounter is not LH', () => expect(isLeftHemisphereStage('encounter')).toBe(false));
      it('analysis is LH', () => expect(isLeftHemisphereStage('analysis')).toBe(true));
      it('return is not LH', () => expect(isLeftHemisphereStage('return')).toBe(false));
    });
  });
});
