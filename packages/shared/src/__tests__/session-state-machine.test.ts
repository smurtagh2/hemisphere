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
  type SessionState,
} from '../session-state-machine';
import {
  sessionStateReducer,
  calculateStageProgress,
  calculateSessionProgress,
} from '../session-state-reducer';

describe('Session State Machine', () => {
  describe('Initial State Creation', () => {
    it('should create valid initial state', () => {
      const state = createInitialSessionState({
        sessionId: 'test-session',
        userId: 'test-user',
        topicId: 'test-topic',
        sessionType: 'standard',
        itemQueue: ['item-1', 'item-2', 'item-3'],
        plannedBalance: { newItemCount: 2, reviewItemCount: 1, interleavedCount: 0 },
      });

      expect(state.status).toBe('ready');
      expect(state.currentStage).toBe(null);
      expect(state.itemQueue.length).toBe(3);
      expect(state.completedActivityIds).toEqual([]);
      expect(validateSessionState(state)).toEqual([]);
    });
  });

  describe('State Transitions', () => {
    it('should start session from ready state', () => {
      const state = createInitialSessionState({
        sessionId: 'test-session',
        userId: 'test-user',
        topicId: 'test-topic',
        sessionType: 'standard',
        itemQueue: ['item-1'],
        plannedBalance: { newItemCount: 1, reviewItemCount: 0, interleavedCount: 0 },
      });

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

    it('should not start session without item queue', () => {
      const state = createInitialSessionState({
        sessionId: 'test-session',
        userId: 'test-user',
        topicId: 'test-topic',
        sessionType: 'standard',
        itemQueue: [],
        plannedBalance: { newItemCount: 0, reviewItemCount: 0, interleavedCount: 0 },
      });

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

    it('should pause and resume session', () => {
      const state = createInitialSessionState({
        sessionId: 'test-session',
        userId: 'test-user',
        topicId: 'test-topic',
        sessionType: 'standard',
        itemQueue: ['item-1'],
        plannedBalance: { newItemCount: 1, reviewItemCount: 0, interleavedCount: 0 },
      });

      // Start session
      let result = sessionStateReducer(state, {
        type: 'START_SESSION',
        sessionId: 'test-session',
        timestamp: 1000,
      });
      expect(result.success).toBe(true);

      // Pause session
      if (result.success) {
        const pauseResult = sessionStateReducer(result.newState, {
          type: 'PAUSE_SESSION',
          timestamp: 10000,
        });
        expect(pauseResult.success).toBe(true);
        if (pauseResult.success) {
          expect(pauseResult.newState.status).toBe('paused');
          expect(pauseResult.newState.pausedAt).toBe(10000);
        }

        // Resume session
        if (pauseResult.success) {
          const resumeResult = sessionStateReducer(pauseResult.newState, {
            type: 'RESUME_SESSION',
            timestamp: 20000,
          });
          expect(resumeResult.success).toBe(true);
          if (resumeResult.success) {
            expect(resumeResult.newState.status).toBe('in_progress');
            expect(resumeResult.newState.pausedAt).toBe(null);
            expect(resumeResult.newState.pausedDurationMs).toBe(10000);
          }
        }
      }
    });
  });

  describe('Stage Advancement', () => {
    it('should advance from Encounter to Analysis when conditions met', () => {
      const state = createInitialSessionState({
        sessionId: 'test-session',
        userId: 'test-user',
        topicId: 'test-topic',
        sessionType: 'standard',
        itemQueue: ['item-1'],
        plannedBalance: { newItemCount: 1, reviewItemCount: 0, interleavedCount: 0 },
      });

      // Start session
      let result = sessionStateReducer(state, {
        type: 'START_SESSION',
        sessionId: 'test-session',
        timestamp: 1000,
      });
      expect(result.success).toBe(true);

      if (result.success) {
        // Mark encounter as complete and set duration
        const updatedState: SessionState = {
          ...result.newState,
          encounterComplete: true,
          encounterDurationMs: 180000, // 3 min minimum
        };

        // Advance to Analysis
        const advanceResult = sessionStateReducer(updatedState, {
          type: 'ADVANCE_STAGE',
          timestamp: 181000,
        });
        expect(advanceResult.success).toBe(true);
        if (advanceResult.success) {
          expect(advanceResult.newState.currentStage).toBe('analysis');
          expect(advanceResult.newState.analysisStartedAt).toBe(181000);
        }
      }
    });

    it('should not advance from Encounter without minimum duration', () => {
      const state = createInitialSessionState({
        sessionId: 'test-session',
        userId: 'test-user',
        topicId: 'test-topic',
        sessionType: 'standard',
        itemQueue: ['item-1'],
        plannedBalance: { newItemCount: 1, reviewItemCount: 0, interleavedCount: 0 },
      });

      // Start session
      let result = sessionStateReducer(state, {
        type: 'START_SESSION',
        sessionId: 'test-session',
        timestamp: 1000,
      });
      expect(result.success).toBe(true);

      if (result.success) {
        // Mark encounter as complete but duration too short
        const updatedState: SessionState = {
          ...result.newState,
          encounterComplete: true,
          encounterDurationMs: 60000, // Only 1 min, need 3 min
        };

        // Try to advance to Analysis
        const advanceResult = sessionStateReducer(updatedState, {
          type: 'ADVANCE_STAGE',
          timestamp: 61000,
        });
        expect(advanceResult.success).toBe(false);
        if (!advanceResult.success) {
          expect(advanceResult.error).toBe('GUARD_FAILED');
        }
      }
    });
  });

  describe('Activity Completion', () => {
    it('should track completed activities', () => {
      const state = createInitialSessionState({
        sessionId: 'test-session',
        userId: 'test-user',
        topicId: 'test-topic',
        sessionType: 'standard',
        itemQueue: ['item-1', 'item-2', 'item-3'],
        plannedBalance: { newItemCount: 3, reviewItemCount: 0, interleavedCount: 0 },
      });

      // Start session
      let result = sessionStateReducer(state, {
        type: 'START_SESSION',
        sessionId: 'test-session',
        timestamp: 1000,
      });
      expect(result.success).toBe(true);

      if (result.success) {
        // Complete first activity
        const completeResult = sessionStateReducer(result.newState, {
          type: 'COMPLETE_ACTIVITY',
          activityId: 'item-1',
          timestamp: 30000,
        });
        expect(completeResult.success).toBe(true);
        if (completeResult.success) {
          expect(completeResult.newState.completedActivityIds).toContain('item-1');
          expect(completeResult.newState.currentItemIndex).toBe(1);
        }
      }
    });
  });

  describe('Session Completion', () => {
    it('should complete session when all conditions met', () => {
      const state: SessionState = {
        sessionId: 'test-session',
        userId: 'test-user',
        topicId: 'test-topic',
        status: 'in_progress',
        currentStage: 'return',
        startedAt: 1000,
        pausedAt: null,
        completedAt: null,
        encounterStartedAt: 1000,
        analysisStartedAt: 181000,
        returnStartedAt: 541000,
        totalDurationMs: 0,
        encounterDurationMs: 180000,
        analysisDurationMs: 360000,
        returnDurationMs: 180000,
        pausedDurationMs: 0,
        itemQueue: ['item-1', 'item-2'],
        currentItemIndex: 2,
        completedActivityIds: ['item-1', 'item-2'],
        encounterComplete: true,
        analysisComplete: true,
        returnComplete: true,
        abandonedAtStage: null,
        abandonmentReason: null,
        sessionType: 'standard',
        plannedBalance: { newItemCount: 2, reviewItemCount: 0, interleavedCount: 0 },
      };

      const result = sessionStateReducer(state, {
        type: 'COMPLETE_SESSION',
        timestamp: 721000,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.newState.status).toBe('completed');
        expect(result.newState.completedAt).toBe(721000);
        expect(result.newState.totalDurationMs).toBeGreaterThan(0);
      }
    });
  });

  describe('Session Abandonment', () => {
    it('should abandon session and track stage', () => {
      const state = createInitialSessionState({
        sessionId: 'test-session',
        userId: 'test-user',
        topicId: 'test-topic',
        sessionType: 'standard',
        itemQueue: ['item-1'],
        plannedBalance: { newItemCount: 1, reviewItemCount: 0, interleavedCount: 0 },
      });

      // Start session
      let result = sessionStateReducer(state, {
        type: 'START_SESSION',
        sessionId: 'test-session',
        timestamp: 1000,
      });
      expect(result.success).toBe(true);

      if (result.success) {
        // Abandon session
        const abandonResult = sessionStateReducer(result.newState, {
          type: 'ABANDON_SESSION',
          reason: 'User quit',
          timestamp: 10000,
        });
        expect(abandonResult.success).toBe(true);
        if (abandonResult.success) {
          expect(abandonResult.newState.status).toBe('abandoned');
          expect(abandonResult.newState.abandonedAtStage).toBe('encounter');
          expect(abandonResult.newState.abandonmentReason).toBe('User quit');
        }
      }
    });
  });

  describe('Guard Conditions', () => {
    it('should validate canStartSession', () => {
      const readyState = createInitialSessionState({
        sessionId: 'test-session',
        userId: 'test-user',
        topicId: 'test-topic',
        sessionType: 'standard',
        itemQueue: ['item-1'],
        plannedBalance: { newItemCount: 1, reviewItemCount: 0, interleavedCount: 0 },
      });

      expect(defaultGuards.canStartSession(readyState)).toBe(true);

      const emptyQueueState = { ...readyState, itemQueue: [] };
      expect(defaultGuards.canStartSession(emptyQueueState)).toBe(false);
    });

    it('should validate canAdvanceToAnalysis', () => {
      const state: SessionState = {
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
        encounterDurationMs: 180000,
        analysisDurationMs: 0,
        returnDurationMs: 0,
        pausedDurationMs: 0,
        itemQueue: ['item-1'],
        currentItemIndex: 0,
        completedActivityIds: [],
        encounterComplete: true,
        analysisComplete: false,
        returnComplete: false,
        abandonedAtStage: null,
        abandonmentReason: null,
        sessionType: 'standard',
        plannedBalance: { newItemCount: 1, reviewItemCount: 0, interleavedCount: 0 },
      };

      expect(defaultGuards.canAdvanceToAnalysis(state)).toBe(true);

      const incompleteState = { ...state, encounterComplete: false };
      expect(defaultGuards.canAdvanceToAnalysis(incompleteState)).toBe(false);

      const shortDurationState = { ...state, encounterDurationMs: 60000 };
      expect(defaultGuards.canAdvanceToAnalysis(shortDurationState)).toBe(false);
    });
  });

  describe('Progress Calculations', () => {
    it('should calculate stage progress', () => {
      const state: SessionState = {
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
        encounterDurationMs: 120000, // 2 min of 4 min target = 50%
        analysisDurationMs: 0,
        returnDurationMs: 0,
        pausedDurationMs: 0,
        itemQueue: ['item-1'],
        currentItemIndex: 0,
        completedActivityIds: [],
        encounterComplete: false,
        analysisComplete: false,
        returnComplete: false,
        abandonedAtStage: null,
        abandonmentReason: null,
        sessionType: 'standard',
        plannedBalance: { newItemCount: 1, reviewItemCount: 0, interleavedCount: 0 },
      };

      const progress = calculateStageProgress(state);
      expect(progress).toBe(0.5); // 120s / 240s target
    });

    it('should calculate session progress', () => {
      const state: SessionState = {
        sessionId: 'test-session',
        userId: 'test-user',
        topicId: 'test-topic',
        status: 'in_progress',
        currentStage: 'analysis',
        startedAt: 1000,
        pausedAt: null,
        completedAt: null,
        encounterStartedAt: 1000,
        analysisStartedAt: 241000,
        returnStartedAt: null,
        totalDurationMs: 0,
        encounterDurationMs: 240000, // 4 min
        analysisDurationMs: 300000, // 5 min
        returnDurationMs: 0,
        pausedDurationMs: 0,
        itemQueue: ['item-1'],
        currentItemIndex: 0,
        completedActivityIds: [],
        encounterComplete: true,
        analysisComplete: false,
        returnComplete: false,
        abandonedAtStage: null,
        abandonmentReason: null,
        sessionType: 'standard',
        plannedBalance: { newItemCount: 1, reviewItemCount: 0, interleavedCount: 0 },
      };

      const progress = calculateSessionProgress(state);
      // 540s completed / (240s + 600s + 240s) target = 0.5
      expect(progress).toBeCloseTo(0.5, 2);
    });
  });

  describe('Helper Functions', () => {
    it('should get next stage', () => {
      expect(getNextStage('encounter')).toBe('analysis');
      expect(getNextStage('analysis')).toBe('return');
      expect(getNextStage('return')).toBe(null);
    });

    it('should get stage index', () => {
      expect(getStageIndex('encounter')).toBe(0);
      expect(getStageIndex('analysis')).toBe(1);
      expect(getStageIndex('return')).toBe(2);
    });

    it('should identify hemisphere stages', () => {
      expect(isRightHemisphereStage('encounter')).toBe(true);
      expect(isRightHemisphereStage('analysis')).toBe(false);
      expect(isRightHemisphereStage('return')).toBe(true);

      expect(isLeftHemisphereStage('encounter')).toBe(false);
      expect(isLeftHemisphereStage('analysis')).toBe(true);
      expect(isLeftHemisphereStage('return')).toBe(false);
    });
  });

  describe('State Validation', () => {
    it('should validate consistent state', () => {
      const state = createInitialSessionState({
        sessionId: 'test-session',
        userId: 'test-user',
        topicId: 'test-topic',
        sessionType: 'standard',
        itemQueue: ['item-1'],
        plannedBalance: { newItemCount: 1, reviewItemCount: 0, interleavedCount: 0 },
      });

      const errors = validateSessionState(state);
      expect(errors).toEqual([]);
    });

    it('should detect invalid state', () => {
      const invalidState: SessionState = {
        sessionId: 'test-session',
        userId: 'test-user',
        topicId: 'test-topic',
        status: 'in_progress',
        currentStage: null, // Invalid: in_progress but no stage
        startedAt: 1000,
        pausedAt: null,
        completedAt: null,
        encounterStartedAt: null,
        analysisStartedAt: null,
        returnStartedAt: null,
        totalDurationMs: 0,
        encounterDurationMs: 0,
        analysisDurationMs: 0,
        returnDurationMs: 0,
        pausedDurationMs: 0,
        itemQueue: ['item-1'],
        currentItemIndex: 0,
        completedActivityIds: [],
        encounterComplete: false,
        analysisComplete: false,
        returnComplete: false,
        abandonedAtStage: null,
        abandonmentReason: null,
        sessionType: 'standard',
        plannedBalance: { newItemCount: 1, reviewItemCount: 0, interleavedCount: 0 },
      };

      const errors = validateSessionState(invalidState);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('in_progress but currentStage is null');
    });
  });
});
