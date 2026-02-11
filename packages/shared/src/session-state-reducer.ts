/**
 * Session State Machine Reducer
 *
 * Pure reducer implementation of the session state machine.
 * This reducer enforces all guard conditions and state transitions.
 * It can be used with Zustand, Redux, or any state management library.
 */

import {
  type SessionState,
  type SessionEvent,
  type TransitionResult,
  type SessionGuards,
  type SessionConfig,
  defaultGuards,
  defaultSessionConfig,
  getNextStage,
} from './session-state-machine';

// ============================================================================
// Reducer Implementation
// ============================================================================

/**
 * Core session state reducer
 * Pure function that takes current state + event and returns new state or error
 */
export function sessionStateReducer(
  state: SessionState,
  event: SessionEvent,
  config: SessionConfig = defaultSessionConfig,
  guards: SessionGuards = defaultGuards
): TransitionResult {
  try {
    switch (event.type) {
      case 'START_SESSION':
        return handleStartSession(state, event, guards);

      case 'PAUSE_SESSION':
        return handlePauseSession(state, event, guards);

      case 'RESUME_SESSION':
        return handleResumeSession(state, event, guards);

      case 'COMPLETE_ACTIVITY':
        return handleCompleteActivity(state, event);

      case 'ADVANCE_STAGE':
        return handleAdvanceStage(state, event, config, guards);

      case 'SKIP_STAGE':
        return handleSkipStage(state, event);

      case 'COMPLETE_SESSION':
        return handleCompleteSession(state, event, config, guards);

      case 'ABANDON_SESSION':
        return handleAbandonSession(state, event);

      case 'RESUME_ABANDONED':
        return handleResumeAbandoned(state, event, guards);

      default:
        return {
          success: false,
          error: 'UNKNOWN_EVENT',
          reason: `Unknown event type: ${(event as SessionEvent).type}`,
        };
    }
  } catch (error) {
    return {
      success: false,
      error: 'REDUCER_ERROR',
      reason: error instanceof Error ? error.message : 'Unknown error in reducer',
    };
  }
}

// ============================================================================
// Event Handlers
// ============================================================================

function handleStartSession(
  state: SessionState,
  event: Extract<SessionEvent, { type: 'START_SESSION' }>,
  guards: SessionGuards
): TransitionResult {
  if (!guards.canStartSession(state)) {
    return {
      success: false,
      error: 'INVALID_TRANSITION',
      reason: 'Cannot start session: not in ready state or no item queue',
    };
  }

  return {
    success: true,
    newState: {
      ...state,
      status: 'in_progress',
      currentStage: 'encounter',
      startedAt: event.timestamp,
      encounterStartedAt: event.timestamp,
    },
  };
}

function handlePauseSession(
  state: SessionState,
  event: Extract<SessionEvent, { type: 'PAUSE_SESSION' }>,
  guards: SessionGuards
): TransitionResult {
  if (!guards.canPauseSession(state)) {
    return {
      success: false,
      error: 'INVALID_TRANSITION',
      reason: 'Cannot pause: session not in progress or already paused',
    };
  }

  return {
    success: true,
    newState: {
      ...state,
      status: 'paused',
      pausedAt: event.timestamp,
    },
  };
}

function handleResumeSession(
  state: SessionState,
  event: Extract<SessionEvent, { type: 'RESUME_SESSION' }>,
  guards: SessionGuards
): TransitionResult {
  if (!guards.canResumeSession(state)) {
    return {
      success: false,
      error: 'INVALID_TRANSITION',
      reason: 'Cannot resume: session not paused or abandoned',
    };
  }

  // Calculate pause duration
  const pauseDuration = state.pausedAt ? event.timestamp - state.pausedAt : 0;

  return {
    success: true,
    newState: {
      ...state,
      status: 'in_progress',
      pausedAt: null,
      pausedDurationMs: state.pausedDurationMs + pauseDuration,
    },
  };
}

function handleCompleteActivity(
  state: SessionState,
  event: Extract<SessionEvent, { type: 'COMPLETE_ACTIVITY' }>
): TransitionResult {
  if (state.status !== 'in_progress') {
    return {
      success: false,
      error: 'INVALID_STATE',
      reason: 'Cannot complete activity: session not in progress',
    };
  }

  // Add activity to completed list if not already there
  const completedActivityIds = state.completedActivityIds.includes(event.activityId)
    ? state.completedActivityIds
    : [...state.completedActivityIds, event.activityId];

  // Update duration for current stage
  const stageDuration = calculateCurrentStageDuration(state, event.timestamp);
  const durationUpdates = updateStageDuration(state, stageDuration);

  return {
    success: true,
    newState: {
      ...state,
      ...durationUpdates,
      completedActivityIds,
      currentItemIndex: state.currentItemIndex + 1,
    },
  };
}

function handleAdvanceStage(
  state: SessionState,
  event: Extract<SessionEvent, { type: 'ADVANCE_STAGE' }>,
  config: SessionConfig,
  guards: SessionGuards
): TransitionResult {
  if (state.status !== 'in_progress') {
    return {
      success: false,
      error: 'INVALID_STATE',
      reason: 'Cannot advance stage: session not in progress',
    };
  }

  const currentStage = state.currentStage;
  if (!currentStage) {
    return {
      success: false,
      error: 'INVALID_STATE',
      reason: 'Cannot advance: no current stage',
    };
  }

  // Calculate duration for current stage
  const stageDuration = calculateCurrentStageDuration(state, event.timestamp);
  const durationUpdates = updateStageDuration(state, stageDuration);

  // Check which stage we're advancing from and validate guards
  if (currentStage === 'encounter') {
    if (!guards.canAdvanceToAnalysis(state, config.minEncounterDurationMs)) {
      return {
        success: false,
        error: 'GUARD_FAILED',
        reason: `Cannot advance to Analysis: minimum duration not met or stage not complete`,
      };
    }

    return {
      success: true,
      newState: {
        ...state,
        ...durationUpdates,
        currentStage: 'analysis',
        encounterComplete: true,
        analysisStartedAt: event.timestamp,
      },
    };
  }

  if (currentStage === 'analysis') {
    if (!guards.canAdvanceToReturn(state, config.minAnalysisDurationMs)) {
      return {
        success: false,
        error: 'GUARD_FAILED',
        reason: `Cannot advance to Return: minimum duration not met or stage not complete`,
      };
    }

    return {
      success: true,
      newState: {
        ...state,
        ...durationUpdates,
        currentStage: 'return',
        analysisComplete: true,
        returnStartedAt: event.timestamp,
      },
    };
  }

  // Already in Return stage, cannot advance further
  return {
    success: false,
    error: 'INVALID_TRANSITION',
    reason: 'Cannot advance from Return stage: use COMPLETE_SESSION instead',
  };
}

function handleSkipStage(
  state: SessionState,
  event: Extract<SessionEvent, { type: 'SKIP_STAGE' }>
): TransitionResult {
  if (state.status !== 'in_progress' || !state.currentStage) {
    return {
      success: false,
      error: 'INVALID_STATE',
      reason: 'Cannot skip stage: session not in progress or no current stage',
    };
  }

  const nextStage = getNextStage(state.currentStage);
  if (!nextStage) {
    return {
      success: false,
      error: 'INVALID_TRANSITION',
      reason: 'Cannot skip Return stage (final stage)',
    };
  }

  // Calculate duration for current stage
  const stageDuration = calculateCurrentStageDuration(state, event.timestamp);
  const durationUpdates = updateStageDuration(state, stageDuration);

  // Mark current stage as complete and advance
  const stageCompleteKey = `${state.currentStage}Complete` as keyof SessionState;

  return {
    success: true,
    newState: {
      ...state,
      ...durationUpdates,
      [stageCompleteKey]: true,
      currentStage: nextStage,
      [`${nextStage}StartedAt`]: event.timestamp,
    },
  };
}

function handleCompleteSession(
  state: SessionState,
  event: Extract<SessionEvent, { type: 'COMPLETE_SESSION' }>,
  config: SessionConfig,
  guards: SessionGuards
): TransitionResult {
  if (!guards.canCompleteSession(state, config.minReturnDurationMs)) {
    return {
      success: false,
      error: 'GUARD_FAILED',
      reason: 'Cannot complete session: Return stage not complete or minimum duration not met',
    };
  }

  // Calculate final duration for Return stage
  const stageDuration = calculateCurrentStageDuration(state, event.timestamp);
  const durationUpdates = updateStageDuration(state, stageDuration);

  // Create updated state with final durations
  const updatedState = {
    ...state,
    ...durationUpdates,
  };

  // Calculate total duration (excluding pauses)
  const totalDurationMs =
    updatedState.encounterDurationMs +
    updatedState.analysisDurationMs +
    updatedState.returnDurationMs;

  return {
    success: true,
    newState: {
      ...updatedState,
      status: 'completed',
      completedAt: event.timestamp,
      returnComplete: true,
      totalDurationMs,
    },
  };
}

function handleAbandonSession(
  state: SessionState,
  event: Extract<SessionEvent, { type: 'ABANDON_SESSION' }>
): TransitionResult {
  if (state.status === 'completed') {
    return {
      success: false,
      error: 'INVALID_STATE',
      reason: 'Cannot abandon: session already completed',
    };
  }

  // Calculate duration for current stage if in progress
  let durationUpdates = {};
  if (state.status === 'in_progress' && state.currentStage) {
    const stageDuration = calculateCurrentStageDuration(state, event.timestamp);
    durationUpdates = updateStageDuration(state, stageDuration);
  }

  return {
    success: true,
    newState: {
      ...state,
      ...durationUpdates,
      status: 'abandoned',
      abandonedAtStage: state.currentStage,
      abandonmentReason: event.reason,
    },
  };
}

function handleResumeAbandoned(
  state: SessionState,
  _event: Extract<SessionEvent, { type: 'RESUME_ABANDONED' }>,
  guards: SessionGuards
): TransitionResult {
  if (!guards.canResumeSession(state)) {
    return {
      success: false,
      error: 'INVALID_TRANSITION',
      reason: 'Cannot resume abandoned session: invalid state',
    };
  }

  if (state.status !== 'abandoned') {
    return {
      success: false,
      error: 'INVALID_STATE',
      reason: 'Session is not abandoned',
    };
  }

  return {
    success: true,
    newState: {
      ...state,
      status: 'in_progress',
      // Keep abandonedAtStage for analytics but clear reason
      abandonmentReason: null,
    },
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate duration for the current stage based on timestamp
 */
function calculateCurrentStageDuration(state: SessionState, timestamp: number): number {
  const currentStage = state.currentStage;
  if (!currentStage) return 0;

  const stageStartedAtKey = `${currentStage}StartedAt` as keyof SessionState;
  const stageStartedAt = state[stageStartedAtKey] as number | null;

  if (!stageStartedAt) return 0;

  // Calculate duration excluding pauses
  let duration = timestamp - stageStartedAt;

  // If currently paused, subtract the pause time
  if (state.pausedAt) {
    duration -= timestamp - state.pausedAt;
  }

  return Math.max(0, duration);
}

/**
 * Update stage duration fields based on current stage
 */
function updateStageDuration(
  state: SessionState,
  duration: number
): Partial<SessionState> {
  const currentStage = state.currentStage;
  if (!currentStage) return {};

  const durationKey = `${currentStage}DurationMs` as keyof SessionState;

  return {
    [durationKey]: duration,
  } as Partial<SessionState>;
}

// ============================================================================
// Progress Calculation Utilities
// ============================================================================

/**
 * Calculate stage progress (0-1) based on target duration
 */
export function calculateStageProgress(
  state: SessionState,
  config: SessionConfig = defaultSessionConfig
): number {
  const currentStage = state.currentStage;
  if (!currentStage) return 0;

  const durationKey = `${currentStage}DurationMs` as keyof SessionState;
  const currentDuration = (state[durationKey] as number) || 0;

  const targetKey = `target${
    currentStage.charAt(0).toUpperCase() + currentStage.slice(1)
  }DurationMs` as keyof SessionConfig;
  const targetDuration = config[targetKey] as number;

  return Math.min(1, currentDuration / targetDuration);
}

/**
 * Calculate overall session progress (0-1) across all stages
 */
export function calculateSessionProgress(
  state: SessionState,
  config: SessionConfig = defaultSessionConfig
): number {
  const totalTarget =
    config.targetEncounterDurationMs +
    config.targetAnalysisDurationMs +
    config.targetReturnDurationMs;

  const totalCompleted =
    state.encounterDurationMs + state.analysisDurationMs + state.returnDurationMs;

  return Math.min(1, totalCompleted / totalTarget);
}

/**
 * Get current stage duration in milliseconds
 */
export function getCurrentStageDuration(state: SessionState, currentTime: number): number {
  if (!state.currentStage || state.status !== 'in_progress') {
    return 0;
  }

  return calculateCurrentStageDuration(state, currentTime);
}

/**
 * Check if stage minimum duration is met
 */
export function isStageDurationMet(
  state: SessionState,
  config: SessionConfig = defaultSessionConfig
): boolean {
  const currentStage = state.currentStage;
  if (!currentStage) return false;

  const durationKey = `${currentStage}DurationMs` as keyof SessionState;
  const currentDuration = (state[durationKey] as number) || 0;

  const minKey = `min${
    currentStage.charAt(0).toUpperCase() + currentStage.slice(1)
  }DurationMs` as keyof SessionConfig;
  const minDuration = config[minKey] as number;

  return currentDuration >= minDuration;
}
