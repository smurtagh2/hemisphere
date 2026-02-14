/**
 * Outbox Slice
 *
 * Implements an optimistic response queue (outbox pattern) for reliable
 * delivery of user responses to the API.
 *
 * Behaviour contract:
 *   1. When the learner submits a response, it is written to the outbox
 *      immediately. The UI advances optimistically without waiting for the
 *      server – the response is already recorded in the ResponseSlice.
 *   2. A flush loop drains the outbox in FIFO order. Each entry is sent to
 *      the provided `submitFn` (injected at runtime so the slice stays
 *      framework-agnostic).
 *   3. On transient failure the entry is retried up to MAX_ATTEMPTS times
 *      with exponential back-off (base 1 s, factor 2, jitter ±20 %).
 *   4. After MAX_ATTEMPTS failures the entry is marked "dead" and moved to
 *      `deadLetterQueue` so that it can be surfaced in the UI or retried
 *      manually.
 *   5. Confirmed server IDs are stored in `confirmedIds` so callers can
 *      reconcile local `UserResponse.id` → server-assigned ID.
 *   6. The pending queue is persisted to `localStorage` under
 *      OUTBOX_STORAGE_KEY so that undelivered responses survive a page
 *      refresh. Confirmed and dead entries are NOT persisted (they are
 *      already tracked elsewhere or irrecoverable).
 */

import type { UserResponse } from './response-slice';

// ============================================================================
// Constants
// ============================================================================

const MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 1_000;
const BACKOFF_FACTOR = 2;
const JITTER_RATIO = 0.2;
const OUTBOX_STORAGE_KEY = 'hemisphere:outbox:v1';

// ============================================================================
// Entry Types
// ============================================================================

/** Current lifecycle status of a queued entry. */
export type OutboxEntryStatus =
  | 'pending'   // waiting to be sent
  | 'sending'   // actively being sent right now
  | 'confirmed' // server acknowledged; will be pruned
  | 'failed'    // all retry attempts exhausted; moved to dead-letter queue
  | 'retrying'; // waiting for back-off delay before next attempt

/**
 * A single outbox entry wrapping a UserResponse waiting to be persisted to
 * the API.
 */
export interface OutboxEntry {
  /**
   * Client-generated correlation ID (same as UserResponse.id).
   * Used to match confirmations back to local state.
   */
  clientId: string;

  /** The full response payload to send. */
  response: UserResponse;

  /** Current status of this entry in the lifecycle. */
  status: OutboxEntryStatus;

  /** Unix timestamp (ms) when this entry was first enqueued. */
  enqueuedAt: number;

  /** How many send attempts have been made (0 = not yet tried). */
  attempts: number;

  /**
   * Unix timestamp (ms) of the earliest time the next retry is permitted.
   * Null when status is not 'retrying'.
   */
  retryAfter: number | null;

  /**
   * Server-assigned ID returned on successful confirmation.
   * Populated when status transitions to 'confirmed'.
   */
  serverId: string | null;

  /**
   * Last error message seen, for display in dev tooling / error UIs.
   */
  lastError: string | null;
}

/**
 * An entry that has exhausted all retry attempts and been moved out of the
 * main queue.
 */
export interface DeadLetterEntry extends OutboxEntry {
  status: 'failed';
  deadAt: number;
}

// ============================================================================
// Submit function type
// ============================================================================

/**
 * Injected async function that sends a single response to the API.
 *
 * Resolves with the server-assigned ID on success.
 * Rejects (or throws) on any failure – the outbox handles retry logic.
 *
 * Implementations should NOT retry internally; let the outbox do it.
 */
export type ResponseSubmitFn = (response: UserResponse) => Promise<string>;

// ============================================================================
// Slice State
// ============================================================================

export interface OutboxSliceState {
  /**
   * Ordered list of pending/sending/retrying entries.
   * Confirmed entries are removed after reconciliation.
   * Failed entries are moved to deadLetterQueue.
   */
  outboxQueue: OutboxEntry[];

  /** Entries that exhausted all retry attempts. */
  deadLetterQueue: DeadLetterEntry[];

  /**
   * Map of clientId → serverId for confirmed responses.
   * Consumers can use this to reconcile optimistic local IDs with server IDs.
   */
  confirmedIds: Record<string, string>;

  /** Whether the flush loop is currently running. */
  isFlushing: boolean;

  /**
   * The injected submit function. Must be set via `configureOutbox` before
   * `enqueueResponse` is called. Stored outside of serialised state so that
   * it does not end up in localStorage.
   */
  _submitFn: ResponseSubmitFn | null;
}

// ============================================================================
// Slice Actions
// ============================================================================

export interface OutboxSliceActions {
  /**
   * Provide the async function that sends a response to the API.
   * Call this once at application bootstrap (e.g. in a top-level component
   * or a store initialiser hook).
   *
   * @example
   *   configureOutbox(async (response) => {
   *     const res = await fetch('/api/responses', { method: 'POST', body: JSON.stringify(response) });
   *     if (!res.ok) throw new Error(res.statusText);
   *     const { id } = await res.json();
   *     return id;
   *   });
   */
  configureOutbox: (submitFn: ResponseSubmitFn) => void;

  /**
   * Add a response to the outbox and immediately begin flushing.
   * The UI should already have updated optimistically before calling this.
   */
  enqueueResponse: (response: UserResponse) => void;

  /**
   * Trigger a single flush pass: send the oldest pending entry, handle
   * success/failure, schedule retries.
   *
   * This is called automatically by `enqueueResponse` but can also be called
   * manually (e.g. when the app regains network connectivity).
   */
  flushOutbox: () => Promise<void>;

  /**
   * Move a dead-letter entry back to `outboxQueue` for a manual retry.
   * Resets the attempt count so the full 3-attempt window is available.
   *
   * @param clientId  The clientId of the dead-letter entry to revive.
   */
  reviveDeadLetter: (clientId: string) => void;

  /**
   * Permanently discard a dead-letter entry (user chose not to retry).
   */
  dismissDeadLetter: (clientId: string) => void;

  /**
   * Remove all confirmed entries from the queue (housekeeping).
   * Called automatically after each successful confirmation but also
   * available for manual pruning.
   */
  pruneConfirmed: () => void;

  /**
   * Clear the entire outbox including the dead-letter queue.
   * Only call on session end / sign-out.
   */
  clearOutbox: () => void;

  /**
   * Hydrate the outbox from localStorage.
   * Call once on app startup before rendering interactive content.
   * Entries loaded from storage have their status reset to 'pending' so
   * they will be retried in the next flush.
   */
  rehydrateOutbox: () => void;

  // ---- Computed selectors ----

  /** Number of entries that are pending, sending or retrying. */
  getPendingCount: () => number;

  /** Whether there are any entries not yet confirmed. */
  hasUnconfirmed: () => boolean;

  /** Whether there are any entries in the dead-letter queue. */
  hasDeadLetters: () => boolean;

  /** Look up the server-assigned ID for a given clientId, or null. */
  getServerId: (clientId: string) => string | null;
}

// ============================================================================
// Slice Type (combined)
// ============================================================================

export type OutboxSlice = OutboxSliceState & OutboxSliceActions;

// ============================================================================
// Default State
// ============================================================================

export const defaultOutboxSliceState: OutboxSliceState = {
  outboxQueue: [],
  deadLetterQueue: [],
  confirmedIds: {},
  isFlushing: false,
  _submitFn: null,
};

// ============================================================================
// Helpers
// ============================================================================

/**
 * Calculate the delay in milliseconds before the nth retry attempt.
 * Uses full-jitter exponential back-off:
 *   delay = base * factor^(attempt-1) * (1 ± jitter)
 */
function backoffDelayMs(attempt: number): number {
  const base = BASE_BACKOFF_MS * Math.pow(BACKOFF_FACTOR, attempt - 1);
  // Jitter: random value in [base*(1-JITTER_RATIO), base*(1+JITTER_RATIO)]
  const jitter = base * JITTER_RATIO * (Math.random() * 2 - 1);
  return Math.round(base + jitter);
}

const STORAGE_KEY = OUTBOX_STORAGE_KEY;

/** Serialise the pending queue to localStorage. Only persists entries that
 *  need to survive a refresh (pending / retrying / sending → reset to pending).
 */
function persistQueue(entries: OutboxEntry[]): void {
  if (typeof localStorage === 'undefined') return;
  // Only persist entries that haven't been confirmed or failed
  const toStore: OutboxEntry[] = entries
    .filter((e) => e.status !== 'confirmed' && e.status !== 'failed')
    .map((e) => ({
      ...e,
      // Reset transient sending state so entries start as pending on reload
      status: e.status === 'sending' ? 'pending' : e.status,
      retryAfter: e.status === 'sending' ? null : e.retryAfter,
    }));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  } catch {
    // Storage quota exceeded – non-fatal; responses are already in memory
  }
}

/** Load persisted queue from localStorage. */
function loadPersistedQueue(): OutboxEntry[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as OutboxEntry[];
    // Reset any 'sending' status that was frozen mid-flight
    return parsed.map((e) => ({
      ...e,
      status: e.status === 'sending' ? 'pending' : e.status,
    }));
  } catch {
    return [];
  }
}

// ============================================================================
// Slice Creator
// ============================================================================

export function createOutboxSlice<S extends OutboxSlice>(
  set: (partial: Partial<S> | ((state: S) => Partial<S>)) => void,
  get: () => S
): OutboxSlice {
  return {
    ...defaultOutboxSliceState,

    // ------------------------------------------------------------------
    // Configuration
    // ------------------------------------------------------------------

    configureOutbox: (submitFn) => {
      set({ _submitFn: submitFn } as Partial<S>);
    },

    // ------------------------------------------------------------------
    // Enqueue
    // ------------------------------------------------------------------

    enqueueResponse: (response) => {
      const entry: OutboxEntry = {
        clientId: response.id,
        response,
        status: 'pending',
        enqueuedAt: Date.now(),
        attempts: 0,
        retryAfter: null,
        serverId: null,
        lastError: null,
      };

      const updatedQueue = [...get().outboxQueue, entry];
      set({ outboxQueue: updatedQueue } as Partial<S>);
      persistQueue(updatedQueue);

      // Fire-and-forget flush; callers do not need to await
      get().flushOutbox();
    },

    // ------------------------------------------------------------------
    // Flush
    // ------------------------------------------------------------------

    flushOutbox: async () => {
      const { isFlushing, outboxQueue, _submitFn } = get();

      // Only one flush loop at a time
      if (isFlushing) return;

      // Find the first actionable entry
      const now = Date.now();
      const candidate = outboxQueue.find(
        (e) =>
          e.status === 'pending' ||
          (e.status === 'retrying' && e.retryAfter !== null && e.retryAfter <= now)
      );

      if (!candidate) return;
      if (!_submitFn) {
        // No submit function configured – leave entries in queue for later
        return;
      }

      set({ isFlushing: true } as Partial<S>);

      // Mark entry as 'sending'
      const markSending = (queue: OutboxEntry[]): OutboxEntry[] =>
        queue.map((e) =>
          e.clientId === candidate.clientId ? { ...e, status: 'sending' } : e
        );

      const sendingQueue = markSending(get().outboxQueue);
      set({ outboxQueue: sendingQueue } as Partial<S>);

      try {
        const serverId = await _submitFn(candidate.response);

        // Success – mark confirmed and record server ID mapping
        const { outboxQueue: qAfterSend, confirmedIds } = get();
        const confirmedQueue = qAfterSend.map((e) =>
          e.clientId === candidate.clientId
            ? { ...e, status: 'confirmed' as OutboxEntryStatus, serverId }
            : e
        );
        const updatedConfirmedIds = { ...confirmedIds, [candidate.clientId]: serverId };

        set({
          outboxQueue: confirmedQueue,
          confirmedIds: updatedConfirmedIds,
          isFlushing: false,
        } as Partial<S>);

        // Prune confirmed entries and persist
        get().pruneConfirmed();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        const nextAttempt = candidate.attempts + 1;
        const { outboxQueue: qAfterFail, deadLetterQueue } = get();

        if (nextAttempt >= MAX_ATTEMPTS) {
          // Exhausted retries – move to dead-letter queue
          const deadEntry: DeadLetterEntry = {
            ...candidate,
            status: 'failed',
            attempts: nextAttempt,
            lastError: errorMessage,
            deadAt: Date.now(),
          };

          const prunedQueue = qAfterFail.filter((e) => e.clientId !== candidate.clientId);
          const updatedDead = [...deadLetterQueue, deadEntry];

          set({
            outboxQueue: prunedQueue,
            deadLetterQueue: updatedDead,
            isFlushing: false,
          } as Partial<S>);

          persistQueue(prunedQueue);
        } else {
          // Schedule retry with exponential back-off
          const delay = backoffDelayMs(nextAttempt);
          const retryAfter = Date.now() + delay;

          const retriedQueue = qAfterFail.map((e) =>
            e.clientId === candidate.clientId
              ? {
                  ...e,
                  status: 'retrying' as OutboxEntryStatus,
                  attempts: nextAttempt,
                  retryAfter,
                  lastError: errorMessage,
                }
              : e
          );

          set({ outboxQueue: retriedQueue, isFlushing: false } as Partial<S>);
          persistQueue(retriedQueue);

          // Schedule next flush attempt after the back-off delay
          setTimeout(() => {
            get().flushOutbox();
          }, delay);
        }
      }

      // After handling this entry, attempt to flush the next one (if any)
      // This ensures we drain the queue even after a successful send
      const remaining = get().outboxQueue.filter(
        (e) => e.status === 'pending' ||
          (e.status === 'retrying' && e.retryAfter !== null && e.retryAfter <= Date.now())
      );
      if (remaining.length > 0) {
        get().flushOutbox();
      }
    },

    // ------------------------------------------------------------------
    // Dead-letter operations
    // ------------------------------------------------------------------

    reviveDeadLetter: (clientId) => {
      const { deadLetterQueue, outboxQueue } = get();
      const entry = deadLetterQueue.find((e) => e.clientId === clientId);
      if (!entry) return;

      const revivedEntry: OutboxEntry = {
        ...entry,
        status: 'pending',
        attempts: 0,
        retryAfter: null,
        lastError: null,
      };

      const updatedDead = deadLetterQueue.filter((e) => e.clientId !== clientId);
      const updatedQueue = [...outboxQueue, revivedEntry];

      set({
        deadLetterQueue: updatedDead,
        outboxQueue: updatedQueue,
      } as Partial<S>);

      persistQueue(updatedQueue);
      get().flushOutbox();
    },

    dismissDeadLetter: (clientId) => {
      const { deadLetterQueue } = get();
      set({
        deadLetterQueue: deadLetterQueue.filter((e) => e.clientId !== clientId),
      } as Partial<S>);
    },

    // ------------------------------------------------------------------
    // Housekeeping
    // ------------------------------------------------------------------

    pruneConfirmed: () => {
      const { outboxQueue } = get();
      const pruned = outboxQueue.filter((e) => e.status !== 'confirmed');
      set({ outboxQueue: pruned } as Partial<S>);
      persistQueue(pruned);
    },

    clearOutbox: () => {
      set({
        outboxQueue: [],
        deadLetterQueue: [],
        confirmedIds: {},
        isFlushing: false,
      } as unknown as Partial<S>);
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          // ignore
        }
      }
    },

    rehydrateOutbox: () => {
      const persisted = loadPersistedQueue();
      if (persisted.length === 0) return;

      const { outboxQueue } = get();

      // Merge: skip any entries already in memory (same clientId)
      const existingIds = new Set(outboxQueue.map((e) => e.clientId));
      const newEntries = persisted.filter((e) => !existingIds.has(e.clientId));

      if (newEntries.length === 0) return;

      const merged = [...newEntries, ...outboxQueue]; // prepend older entries
      set({ outboxQueue: merged } as Partial<S>);

      // Flush immediately if we have a submit function configured
      if (get()._submitFn) {
        get().flushOutbox();
      }
    },

    // ------------------------------------------------------------------
    // Computed selectors
    // ------------------------------------------------------------------

    getPendingCount: () => {
      return get().outboxQueue.filter(
        (e) => e.status === 'pending' || e.status === 'sending' || e.status === 'retrying'
      ).length;
    },

    hasUnconfirmed: () => {
      return get().outboxQueue.some(
        (e) => e.status !== 'confirmed'
      );
    },

    hasDeadLetters: () => {
      return get().deadLetterQueue.length > 0;
    },

    getServerId: (clientId) => {
      return get().confirmedIds[clientId] ?? null;
    },
  };
}
