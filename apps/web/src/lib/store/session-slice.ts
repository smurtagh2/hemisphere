/**
 * Session Slice
 *
 * Manages the core session lifecycle state: current stage, session status,
 * timing metadata, and wires into the shared session-state-reducer.
 */

import {
  type SessionState,
  type SessionEvent,
  type SessionConfig,
  type SessionGuards,
  type TransitionResult,
  defaultSessionConfig,
  defaultGuards,
  createInitialSessionState,
  calculateStageProgress,
  calculateSessionProgress,
  stageMetadata,
  validateSessionState,
  sessionStateReducer,
} from '@hemisphere/shared';

// ============================================================================
// Slice State Type
// ============================================================================

export interface SessionSliceState {
  /** The full state machine state for the active session, or null if none loaded */
  session: SessionState | null;

  /** Whether a session is currently being loaded / planned */
  isLoading: boolean;

  /** Last error message from a failed transition or load */
  lastError: string | null;

  /** Session config controlling durations and completion criteria */
  config: SessionConfig;

  /** Guards to apply – override for dev/testing */
  guards: SessionGuards;
}

// ============================================================================
// Slice Actions Type
// ============================================================================

export interface SessionSliceActions {
  /** Load (or re-load) a session into the store */
  loadSession: (params: {
    sessionId: string;
    userId: string;
    topicId: string;
    sessionType: string;
    itemQueue: string[];
    plannedBalance: SessionState['plannedBalance'];
  }) => void;

  /** Hydrate an existing (e.g. fetched from DB) session state */
  hydrateSession: (state: SessionState) => void;

  /** Send an event through the state machine reducer */
  sendEvent: (event: SessionEvent) => TransitionResult;

  /** Clear the current session and reset to idle */
  clearSession: () => void;

  /** Override the session config (e.g. for dev/testing shorter durations) */
  setConfig: (config: Partial<SessionConfig>) => void;

  /** Override guards (e.g. bypass minimum duration in development) */
  setGuards: (guards: Partial<SessionGuards>) => void;

  /** Computed: stage progress ratio (0–1) for the current stage */
  getStageProgress: () => number;

  /** Computed: overall session progress ratio (0–1) */
  getSessionProgress: () => number;

  /** Validate the current session state, returning any consistency errors */
  validateSession: () => string[];
}

// ============================================================================
// Slice Type (combined)
// ============================================================================

export type SessionSlice = SessionSliceState & SessionSliceActions;

// ============================================================================
// Default State
// ============================================================================

export const defaultSessionSliceState: SessionSliceState = {
  session: null,
  isLoading: false,
  lastError: null,
  config: defaultSessionConfig,
  guards: defaultGuards,
};

// ============================================================================
// Slice Creator
//
// Follows the Zustand slice pattern – pass `set` and `get` from the root store.
// ============================================================================

export type SessionSliceCreator<S extends SessionSlice> = (
  set: (partial: Partial<S> | ((state: S) => Partial<S>)) => void,
  get: () => S
) => SessionSlice;

export function createSessionSlice<S extends SessionSlice>(
  set: (partial: Partial<S> | ((state: S) => Partial<S>)) => void,
  get: () => S
): SessionSlice {
  return {
    ...defaultSessionSliceState,

    loadSession: (params) => {
      const initialState = createInitialSessionState(params);
      set({ session: initialState, isLoading: false, lastError: null } as Partial<S>);
    },

    hydrateSession: (sessionState) => {
      set({ session: sessionState, isLoading: false, lastError: null } as Partial<S>);
    },

    sendEvent: (event) => {
      const { session, config, guards } = get();

      if (!session) {
        const result: TransitionResult = {
          success: false,
          error: 'NO_SESSION',
          reason: 'No active session to send event to',
        };
        set({ lastError: result.reason } as Partial<S>);
        return result;
      }

      const result = sessionStateReducer(session, event, config, guards);

      if (result.success) {
        set({ session: result.newState, lastError: null } as Partial<S>);
      } else {
        set({ lastError: result.reason } as Partial<S>);
      }

      return result;
    },

    clearSession: () => {
      set({ session: null, isLoading: false, lastError: null } as Partial<S>);
    },

    setConfig: (partial) => {
      const { config } = get();
      set({ config: { ...config, ...partial } } as Partial<S>);
    },

    setGuards: (partial) => {
      const { guards } = get();
      set({ guards: { ...guards, ...partial } } as Partial<S>);
    },

    getStageProgress: () => {
      const { session, config } = get();
      if (!session) return 0;
      return calculateStageProgress(session, config);
    },

    getSessionProgress: () => {
      const { session, config } = get();
      if (!session) return 0;
      return calculateSessionProgress(session, config);
    },

    validateSession: () => {
      const { session } = get();
      if (!session) return ['No session loaded'];
      return validateSessionState(session);
    },
  };
}

// ============================================================================
// Re-export useful helpers from shared
// ============================================================================

export { stageMetadata, defaultSessionConfig, defaultGuards };
