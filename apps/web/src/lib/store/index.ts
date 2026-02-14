/**
 * Session Runtime Store
 *
 * Root Zustand store combining all session slice modules:
 *   - SessionSlice  – state machine state, lifecycle, timing
 *   - QueueSlice    – ordered item presentation queue
 *   - ResponseSlice – user responses and interaction state
 *
 * Includes Redux DevTools integration for development debugging.
 *
 * Usage:
 *   import { useSessionStore } from '@/lib/store';
 *
 *   const stage = useSessionStore((s) => s.session?.currentStage);
 *   const sendEvent = useSessionStore((s) => s.sendEvent);
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';

import { createSessionSlice, type SessionSlice } from './session-slice';
import { createQueueSlice, type QueueSlice } from './queue-slice';
import { createResponseSlice, type ResponseSlice } from './response-slice';
import { createOutboxSlice, type OutboxSlice } from './outbox-slice';

// ============================================================================
// Combined Store Type
// ============================================================================

export type SessionStore = SessionSlice & QueueSlice & ResponseSlice & OutboxSlice;

// ============================================================================
// Store Instance
// ============================================================================

export const useSessionStore = create<SessionStore>()(
  devtools(
    (set, get) => ({
      ...createSessionSlice<SessionStore>(set, get),
      ...createQueueSlice<SessionStore>(set, get),
      ...createResponseSlice<SessionStore>(set, get),
      ...createOutboxSlice<SessionStore>(set, get),
    }),
    {
      name: 'HemisphereSession',
      // Only enable in non-production builds
      enabled: process.env.NODE_ENV !== 'production',
    }
  )
);

// ============================================================================
// Selector Hooks – convenience hooks for common subscriptions
// ============================================================================

/**
 * Subscribe to the active session state machine state.
 * Returns null when no session is loaded.
 */
export const useSession = () => useSessionStore((s) => s.session);

/**
 * Subscribe to the current learning stage.
 * Returns null when no session is active.
 */
export const useCurrentStage = () => useSessionStore((s) => s.session?.currentStage ?? null);

/**
 * Subscribe to the session status.
 */
export const useSessionStatus = () => useSessionStore((s) => s.session?.status ?? null);

/**
 * Subscribe to the currently active queue item.
 */
export const useCurrentQueueItem = () => useSessionStore((s) => s.getCurrentItem());

/**
 * Subscribe to overall session progress (0–1).
 */
export const useSessionProgress = () => useSessionStore((s) => s.getSessionProgress());

/**
 * Subscribe to current stage progress (0–1).
 */
export const useStageProgress = () => useSessionStore((s) => s.getStageProgress());

/**
 * Subscribe to the active interaction state (in-flight response).
 */
export const useActiveInteraction = () => useSessionStore((s) => s.activeInteraction);

/**
 * Subscribe to session-level error state.
 */
export const useSessionError = () => useSessionStore((s) => s.lastError);

/**
 * Subscribe to queue exhaustion state for the current stage.
 */
export const useQueueExhausted = () => useSessionStore((s) => s.stageQueueExhausted);

/**
 * Subscribe to response accuracy (0–1) for the current session.
 */
export const useResponseAccuracy = () => useSessionStore((s) => s.getAccuracy());

/**
 * Subscribe to the outbox queue (pending / sending / retrying entries).
 */
export const useOutboxQueue = () => useSessionStore((s) => s.outboxQueue);

/**
 * Subscribe to the dead-letter queue (responses that failed all retries).
 */
export const useDeadLetterQueue = () => useSessionStore((s) => s.deadLetterQueue);

/**
 * Subscribe to the count of responses not yet confirmed by the server.
 */
export const usePendingResponseCount = () => useSessionStore((s) => s.getPendingCount());

/**
 * Subscribe to whether there are any dead-letter entries that need attention.
 */
export const useHasDeadLetters = () => useSessionStore((s) => s.hasDeadLetters());

// ============================================================================
// Action Selectors – stable references for dispatching
// ============================================================================

/**
 * Returns all store actions (non-state fields).
 * Useful in event handlers where only actions are needed.
 */
export const useSessionActions = () =>
  useSessionStore(useShallow((s) => ({
    // Session actions
    loadSession: s.loadSession,
    hydrateSession: s.hydrateSession,
    sendEvent: s.sendEvent,
    clearSession: s.clearSession,
    setConfig: s.setConfig,
    setGuards: s.setGuards,
    // Queue actions
    initQueue: s.initQueue,
    appendItems: s.appendItems,
    advance: s.advance,
    goBack: s.goBack,
    skip: s.skip,
    jumpTo: s.jumpTo,
    markSeen: s.markSeen,
    setItemMeta: s.setItemMeta,
    clearQueue: s.clearQueue,
    // Response actions
    beginInteraction: s.beginInteraction,
    updateDraft: s.updateDraft,
    submitResponse: s.submitResponse,
    rateResponse: s.rateResponse,
    setConfidence: s.setConfidence,
    revealAnswer: s.revealAnswer,
    cancelInteraction: s.cancelInteraction,
    clearResponses: s.clearResponses,
    // Outbox actions
    configureOutbox: s.configureOutbox,
    enqueueResponse: s.enqueueResponse,
    flushOutbox: s.flushOutbox,
    reviveDeadLetter: s.reviveDeadLetter,
    dismissDeadLetter: s.dismissDeadLetter,
    pruneConfirmed: s.pruneConfirmed,
    clearOutbox: s.clearOutbox,
    rehydrateOutbox: s.rehydrateOutbox,
  })));

// ============================================================================
// Re-export slice types for consumers
// ============================================================================

export type { SessionSlice, SessionSliceState, SessionSliceActions } from './session-slice';
export type { QueueSlice, QueueSliceState, QueueSliceActions, QueueItem } from './queue-slice';
export type {
  ResponseSlice,
  ResponseSliceState,
  ResponseSliceActions,
  UserResponse,
  ActiveInteraction,
  ResponseQuality,
  ResponseModality,
} from './response-slice';
export type {
  OutboxSlice,
  OutboxSliceState,
  OutboxSliceActions,
  OutboxEntry,
  OutboxEntryStatus,
  DeadLetterEntry,
  ResponseSubmitFn,
} from './outbox-slice';

// Re-export shared types that consumers often need alongside the store
export type {
  SessionState,
  SessionEvent,
  SessionStage,
  SessionStatus,
  SessionConfig,
  SessionGuards,
  TransitionResult,
  StageMetadata,
  SessionSummary,
} from '@hemisphere/shared';

export { stageMetadata, defaultSessionConfig, defaultGuards } from './session-slice';
