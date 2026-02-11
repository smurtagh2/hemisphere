/**
 * Session State Machine: RH → LH → RH (Encounter → Analysis → Return)
 *
 * This state machine defines the formal session flow for the Hemisphere learning app.
 * Based on McGilchrist's RH→LH→RH cognitive circuit, every learning session follows
 * a three-stage loop:
 * 1. ENCOUNTER (RH-Primary): Narrative hook, spatial overview, emotional anchor
 * 2. ANALYSIS (LH-Primary): Decomposition, retrieval practice, categorization
 * 3. RETURN (RH-Primary): Reconnection, transfer challenge, creative synthesis
 *
 * The state machine enforces stage transitions, timing constraints, and completion criteria.
 */

// ============================================================================
// Stage and Session Types
// ============================================================================

/**
 * The three learning stages in sequential order
 */
export type SessionStage = 'encounter' | 'analysis' | 'return';

/**
 * Session status throughout its lifecycle
 */
export type SessionStatus =
  | 'planning' // Session plan being generated
  | 'ready' // Session plan ready, not yet started
  | 'in_progress' // Session actively running
  | 'paused' // Session paused by learner
  | 'completing' // Final stage (Return) is done, processing completion
  | 'completed' // Session fully completed and persisted
  | 'abandoned'; // Session started but not completed

/**
 * Abandonment tracking - which stage was active when session was abandoned
 */
export type AbandonedAtStage = SessionStage | null;

// ============================================================================
// State Machine Events
// ============================================================================

/**
 * Events that can be sent to the session state machine
 */
export type SessionEvent =
  | { type: 'START_SESSION'; sessionId: string; timestamp: number }
  | { type: 'PAUSE_SESSION'; timestamp: number }
  | { type: 'RESUME_SESSION'; timestamp: number }
  | { type: 'COMPLETE_ACTIVITY'; activityId: string; timestamp: number }
  | { type: 'ADVANCE_STAGE'; timestamp: number } // Advance from Encounter→Analysis or Analysis→Return
  | { type: 'SKIP_STAGE'; reason: string; timestamp: number } // Manual override (rare, for debugging)
  | { type: 'COMPLETE_SESSION'; timestamp: number } // Return stage complete
  | { type: 'ABANDON_SESSION'; reason: string; timestamp: number }
  | { type: 'RESUME_ABANDONED'; timestamp: number };

// ============================================================================
// State Machine States
// ============================================================================

/**
 * The core session state that flows through the state machine
 */
export interface SessionState {
  // Identity
  sessionId: string;
  userId: string;
  topicId: string;

  // Status tracking
  status: SessionStatus;
  currentStage: SessionStage | null;

  // Timing
  startedAt: number | null; // Unix timestamp (ms)
  pausedAt: number | null;
  completedAt: number | null;
  encounterStartedAt: number | null;
  analysisStartedAt: number | null;
  returnStartedAt: number | null;

  // Duration tracking (cumulative, excluding pauses)
  totalDurationMs: number;
  encounterDurationMs: number;
  analysisDurationMs: number;
  returnDurationMs: number;
  pausedDurationMs: number; // Total time paused

  // Activity tracking
  itemQueue: string[]; // Content item IDs in order
  currentItemIndex: number;
  completedActivityIds: string[];

  // Stage completion criteria
  encounterComplete: boolean;
  analysisComplete: boolean;
  returnComplete: boolean;

  // Abandonment tracking
  abandonedAtStage: AbandonedAtStage;
  abandonmentReason: string | null;

  // Metadata
  sessionType: string; // e.g., 'standard', 'review', 'diagnostic'
  plannedBalance: {
    newItemCount: number;
    reviewItemCount: number;
    interleavedCount: number;
  };
}

// ============================================================================
// State Machine Transitions
// ============================================================================

/**
 * Valid state transitions
 */
export type SessionTransition =
  | 'PLANNING_TO_READY'
  | 'READY_TO_IN_PROGRESS'
  | 'IN_PROGRESS_TO_PAUSED'
  | 'PAUSED_TO_IN_PROGRESS'
  | 'IN_PROGRESS_TO_COMPLETING'
  | 'COMPLETING_TO_COMPLETED'
  | 'IN_PROGRESS_TO_ABANDONED'
  | 'ABANDONED_TO_IN_PROGRESS';

/**
 * Stage transitions (substates within IN_PROGRESS status)
 */
export type StageTransition =
  | 'ENCOUNTER_TO_ANALYSIS'
  | 'ANALYSIS_TO_RETURN'
  | 'RETURN_TO_COMPLETE';

// ============================================================================
// Guard Conditions
// ============================================================================

/**
 * Guard conditions that must be satisfied before transitions
 */
export interface SessionGuards {
  /**
   * Can start session?
   * - Session must be in 'ready' status
   * - Session plan must exist (itemQueue not empty)
   */
  canStartSession: (state: SessionState) => boolean;

  /**
   * Can advance from Encounter to Analysis?
   * - Must be in 'encounter' stage
   * - encounterComplete must be true
   * - Minimum encounter duration met (configurable, default 180s = 3min)
   */
  canAdvanceToAnalysis: (state: SessionState, minDurationMs?: number) => boolean;

  /**
   * Can advance from Analysis to Return?
   * - Must be in 'analysis' stage
   * - analysisComplete must be true
   * - Minimum analysis duration met (configurable, default 360s = 6min)
   * - At least some items completed (currentItemIndex > 0)
   */
  canAdvanceToReturn: (state: SessionState, minDurationMs?: number) => boolean;

  /**
   * Can complete session?
   * - Must be in 'return' stage
   * - returnComplete must be true
   * - Minimum return duration met (configurable, default 180s = 3min)
   */
  canCompleteSession: (state: SessionState, minDurationMs?: number) => boolean;

  /**
   * Can pause session?
   * - Status must be 'in_progress'
   * - Not already paused
   */
  canPauseSession: (state: SessionState) => boolean;

  /**
   * Can resume session?
   * - Status must be 'paused' or 'abandoned'
   */
  canResumeSession: (state: SessionState) => boolean;
}

/**
 * Default guard implementations
 */
export const defaultGuards: SessionGuards = {
  canStartSession: (state) => {
    return state.status === 'ready' && state.itemQueue.length > 0;
  },

  canAdvanceToAnalysis: (state, minDurationMs = 180_000) => {
    if (state.currentStage !== 'encounter' || !state.encounterComplete) {
      return false;
    }
    if (state.encounterStartedAt === null) {
      return false;
    }
    return state.encounterDurationMs >= minDurationMs;
  },

  canAdvanceToReturn: (state, minDurationMs = 360_000) => {
    if (state.currentStage !== 'analysis' || !state.analysisComplete) {
      return false;
    }
    if (state.analysisStartedAt === null) {
      return false;
    }
    // Require at least one item completed
    if (state.currentItemIndex === 0) {
      return false;
    }
    return state.analysisDurationMs >= minDurationMs;
  },

  canCompleteSession: (state, minDurationMs = 180_000) => {
    if (state.currentStage !== 'return' || !state.returnComplete) {
      return false;
    }
    if (state.returnStartedAt === null) {
      return false;
    }
    return state.returnDurationMs >= minDurationMs;
  },

  canPauseSession: (state) => {
    return state.status === 'in_progress' && state.pausedAt === null;
  },

  canResumeSession: (state) => {
    return state.status === 'paused' || state.status === 'abandoned';
  },
};

// ============================================================================
// State Machine Configuration
// ============================================================================

/**
 * Configuration for stage durations and completion criteria
 */
export interface SessionConfig {
  // Minimum durations (milliseconds)
  minEncounterDurationMs: number;
  minAnalysisDurationMs: number;
  minReturnDurationMs: number;

  // Target durations (for progress tracking)
  targetEncounterDurationMs: number;
  targetAnalysisDurationMs: number;
  targetReturnDurationMs: number;

  // Maximum allowed pause duration before auto-abandon (default 30 min)
  maxPauseDurationMs: number;

  // Completion criteria
  requireAllActivitiesComplete: boolean; // If false, can advance with partial completion
}

/**
 * Default session configuration based on instructional design
 * - Encounter: 3-4 min
 * - Analysis: 6-10 min
 * - Return: 3-4 min
 * Total: 12-18 min per session
 */
export const defaultSessionConfig: SessionConfig = {
  minEncounterDurationMs: 180_000, // 3 min
  minAnalysisDurationMs: 360_000, // 6 min
  minReturnDurationMs: 180_000, // 3 min

  targetEncounterDurationMs: 240_000, // 4 min
  targetAnalysisDurationMs: 600_000, // 10 min
  targetReturnDurationMs: 240_000, // 4 min

  maxPauseDurationMs: 1_800_000, // 30 min

  requireAllActivitiesComplete: false, // Allow flexible pacing
};

// ============================================================================
// State Machine Contracts
// ============================================================================

/**
 * Result of a state transition attempt
 */
export type TransitionResult =
  | { success: true; newState: SessionState }
  | { success: false; error: string; reason: string };

/**
 * The session state machine interface
 */
export interface SessionStateMachine {
  /**
   * Get current state
   */
  getState(): SessionState;

  /**
   * Send an event to the state machine
   */
  send(event: SessionEvent): TransitionResult;

  /**
   * Check if a transition is valid without executing it
   */
  canTransition(event: SessionEvent): boolean;

  /**
   * Get the current stage progress (0-1)
   */
  getStageProgress(): number;

  /**
   * Get time spent in current stage (ms)
   */
  getCurrentStageDuration(): number;

  /**
   * Get overall session progress (0-1)
   */
  getSessionProgress(): number;
}

// ============================================================================
// Helper Types
// ============================================================================

/**
 * Stage metadata for UI display
 */
export interface StageMetadata {
  stage: SessionStage;
  displayName: string;
  description: string;
  hemisphereMode: 'RH' | 'LH';
  colorPalette: 'warm' | 'cool';
  minDurationMs: number;
  targetDurationMs: number;
}

/**
 * Stage metadata lookup
 */
export const stageMetadata: Record<SessionStage, StageMetadata> = {
  encounter: {
    stage: 'encounter',
    displayName: 'Encounter',
    description: 'Narrative hook, spatial overview, emotional anchor',
    hemisphereMode: 'RH',
    colorPalette: 'warm',
    minDurationMs: 180_000,
    targetDurationMs: 240_000,
  },
  analysis: {
    stage: 'analysis',
    displayName: 'Analysis',
    description: 'Decomposition, retrieval practice, categorization',
    hemisphereMode: 'LH',
    colorPalette: 'cool',
    minDurationMs: 360_000,
    targetDurationMs: 600_000,
  },
  return: {
    stage: 'return',
    displayName: 'Return',
    description: 'Reconnection, transfer challenge, creative synthesis',
    hemisphereMode: 'RH',
    colorPalette: 'warm',
    minDurationMs: 180_000,
    targetDurationMs: 240_000,
  },
};

/**
 * Session lifecycle event for tracking/analytics
 */
export interface SessionLifecycleEvent {
  sessionId: string;
  eventType: SessionEvent['type'];
  timestamp: number;
  previousState?: SessionStatus;
  newState: SessionStatus;
  metadata?: Record<string, unknown>;
}

/**
 * Session summary after completion
 */
export interface SessionSummary {
  sessionId: string;
  userId: string;
  topicId: string;
  status: 'completed' | 'abandoned';

  // Timing
  startedAt: number;
  completedAt: number | null;
  totalDurationMs: number;

  // Stage durations
  encounterDurationMs: number;
  analysisDurationMs: number;
  returnDurationMs: number;

  // Activity completion
  totalItems: number;
  completedItems: number;
  completionRate: number;

  // Abandonment info
  abandonedAtStage: AbandonedAtStage;
  abandonmentReason: string | null;
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate session state consistency
 */
export function validateSessionState(state: SessionState): string[] {
  const errors: string[] = [];

  // Status validation
  if (state.status === 'in_progress' && state.currentStage === null) {
    errors.push('Session in_progress but currentStage is null');
  }

  if (state.status === 'completed' && !state.completedAt) {
    errors.push('Session completed but completedAt is null');
  }

  // Timing validation
  if (state.startedAt !== null && state.completedAt !== null) {
    if (state.completedAt < state.startedAt) {
      errors.push('completedAt is before startedAt');
    }
  }

  // Stage progression validation
  if (state.analysisStartedAt && !state.encounterStartedAt) {
    errors.push('Analysis started before Encounter');
  }

  if (state.returnStartedAt && !state.analysisStartedAt) {
    errors.push('Return started before Analysis');
  }

  // Duration validation
  if (state.encounterDurationMs < 0 || state.analysisDurationMs < 0 || state.returnDurationMs < 0) {
    errors.push('Negative stage duration');
  }

  // Item queue validation
  if (state.currentItemIndex > state.itemQueue.length) {
    errors.push('currentItemIndex exceeds itemQueue length');
  }

  return errors;
}

/**
 * Create initial session state
 */
export function createInitialSessionState(params: {
  sessionId: string;
  userId: string;
  topicId: string;
  sessionType: string;
  itemQueue: string[];
  plannedBalance: SessionState['plannedBalance'];
}): SessionState {
  return {
    sessionId: params.sessionId,
    userId: params.userId,
    topicId: params.topicId,
    status: 'ready',
    currentStage: null,
    startedAt: null,
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
    itemQueue: params.itemQueue,
    currentItemIndex: 0,
    completedActivityIds: [],
    encounterComplete: false,
    analysisComplete: false,
    returnComplete: false,
    abandonedAtStage: null,
    abandonmentReason: null,
    sessionType: params.sessionType,
    plannedBalance: params.plannedBalance,
  };
}

/**
 * Get stage order index (0=encounter, 1=analysis, 2=return)
 */
export function getStageIndex(stage: SessionStage): number {
  const stageOrder: SessionStage[] = ['encounter', 'analysis', 'return'];
  return stageOrder.indexOf(stage);
}

/**
 * Get next stage in sequence
 */
export function getNextStage(current: SessionStage): SessionStage | null {
  const stages: SessionStage[] = ['encounter', 'analysis', 'return'];
  const currentIndex = stages.indexOf(current);
  if (currentIndex === stages.length - 1) {
    return null; // Return is final stage
  }
  return stages[currentIndex + 1];
}

/**
 * Check if stage is right-hemisphere dominant
 */
export function isRightHemisphereStage(stage: SessionStage): boolean {
  return stage === 'encounter' || stage === 'return';
}

/**
 * Check if stage is left-hemisphere dominant
 */
export function isLeftHemisphereStage(stage: SessionStage): boolean {
  return stage === 'analysis';
}
