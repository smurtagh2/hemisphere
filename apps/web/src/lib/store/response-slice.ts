/**
 * Response Slice
 *
 * Manages user responses and interaction state during a session.
 * Tracks per-item responses, submission status, confidence ratings,
 * and derived metrics (correct count, accuracy, latency).
 */

import type { SessionStage } from '@hemisphere/shared';

// ============================================================================
// Response Types
// ============================================================================

/**
 * The quality of a user response, modelled on SM-2 / FSRS vocabulary.
 * Used to decide how to update spaced-repetition scheduling.
 */
export type ResponseQuality = 'again' | 'hard' | 'good' | 'easy';

/**
 * The modality in which the learner answered.
 */
export type ResponseModality = 'text' | 'multiple_choice' | 'boolean' | 'drag_drop' | 'free_recall';

/**
 * A single recorded response from the learner.
 */
export interface UserResponse {
  /** Stable response ID (UUID, generated client-side) */
  id: string;

  /** The content item this response is for */
  itemId: string;

  /** The stage in which the response was recorded */
  stage: SessionStage;

  /** Unix timestamp (ms) when the learner began interacting with the item */
  startedAt: number;

  /** Unix timestamp (ms) when the response was submitted */
  submittedAt: number;

  /** Response latency in milliseconds (submittedAt - startedAt) */
  latencyMs: number;

  /** The modality used */
  modality: ResponseModality;

  /**
   * The raw response value.
   * - For multiple_choice / boolean: the selected option key
   * - For text / free_recall: the typed string
   * - For drag_drop: JSON-encoded arrangement
   */
  value: string;

  /**
   * Whether the system evaluated the response as correct.
   * Null for free-recall / subjective items that need manual review.
   */
  isCorrect: boolean | null;

  /** Self-reported quality rating (populated after answer reveal) */
  quality: ResponseQuality | null;

  /** Optional explicit confidence score (0–1) reported by the learner */
  selfConfidence: number | null;
}

/**
 * Transient interaction state for the item currently being answered.
 */
export interface ActiveInteraction {
  /** The item currently being presented */
  itemId: string;

  /** Unix timestamp (ms) when interaction started */
  startedAt: number;

  /** Current draft value (before submission) */
  draftValue: string;

  /** Whether the answer has been revealed/submitted */
  submitted: boolean;

  /** Whether the answer card is in the "showing result" state */
  showingResult: boolean;
}

// ============================================================================
// Slice State
// ============================================================================

export interface ResponseSliceState {
  /** All recorded responses for the current session, keyed by itemId */
  responses: Record<string, UserResponse>;

  /**
   * Ordered list of item IDs in the order responses were submitted.
   * Useful for sequential review.
   */
  responseOrder: string[];

  /** Active (in-flight) interaction state, or null when between items */
  activeInteraction: ActiveInteraction | null;

  /** Whether a response is currently being submitted to the API */
  isSubmitting: boolean;

  /** Last submission error message, if any */
  submissionError: string | null;
}

// ============================================================================
// Slice Actions
// ============================================================================

export interface ResponseSliceActions {
  /**
   * Begin interacting with an item.
   * Records the start timestamp and initialises draft state.
   */
  beginInteraction: (itemId: string, timestamp?: number) => void;

  /**
   * Update the draft value as the learner types / selects.
   */
  updateDraft: (value: string) => void;

  /**
   * Submit the current interaction as a response.
   * Generates a UserResponse and stores it; clears activeInteraction.
   */
  submitResponse: (params: {
    isCorrect: boolean | null;
    modality: ResponseModality;
    timestamp?: number;
  }) => UserResponse | null;

  /**
   * Record a quality self-rating after an answer is revealed.
   * Can only be applied to the most recently submitted response for the item.
   */
  rateResponse: (itemId: string, quality: ResponseQuality) => void;

  /**
   * Record self-confidence for an item response.
   */
  setConfidence: (itemId: string, confidence: number) => void;

  /**
   * Mark the active interaction as "showing result" (answer revealed).
   */
  revealAnswer: () => void;

  /**
   * Clear active interaction without submitting (e.g. user navigated away).
   */
  cancelInteraction: () => void;

  /**
   * Clear all responses and interaction state (e.g. on session end / reset).
   */
  clearResponses: () => void;

  /** Computed: response for a specific item, or null */
  getResponseForItem: (itemId: string) => UserResponse | null;

  /** Computed: all responses in submission order */
  getAllResponses: () => UserResponse[];

  /** Computed: total number of submitted responses */
  getResponseCount: () => number;

  /** Computed: number of correct responses (isCorrect === true) */
  getCorrectCount: () => number;

  /** Computed: accuracy ratio (0–1), or 0 if no responses */
  getAccuracy: () => number;

  /** Computed: mean response latency in ms, or 0 if no responses */
  getMeanLatencyMs: () => number;

  /** Computed: responses for a specific stage */
  getResponsesByStage: (stage: SessionStage) => UserResponse[];
}

// ============================================================================
// Slice Type (combined)
// ============================================================================

export type ResponseSlice = ResponseSliceState & ResponseSliceActions;

// ============================================================================
// Default State
// ============================================================================

export const defaultResponseSliceState: ResponseSliceState = {
  responses: {},
  responseOrder: [],
  activeInteraction: null,
  isSubmitting: false,
  submissionError: null,
};

// ============================================================================
// Helpers
// ============================================================================

function generateId(): string {
  // Prefer crypto.randomUUID when available (browser / Node 19+)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback: timestamp + random suffix
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ============================================================================
// Slice Creator
// ============================================================================

export function createResponseSlice<S extends ResponseSlice>(
  set: (partial: Partial<S> | ((state: S) => Partial<S>)) => void,
  get: () => S
): ResponseSlice {
  return {
    ...defaultResponseSliceState,

    beginInteraction: (itemId, timestamp) => {
      const startedAt = timestamp ?? Date.now();
      set({
        activeInteraction: {
          itemId,
          startedAt,
          draftValue: '',
          submitted: false,
          showingResult: false,
        },
        submissionError: null,
      } as Partial<S>);
    },

    updateDraft: (value) => {
      const { activeInteraction } = get();
      if (!activeInteraction) return;
      set({
        activeInteraction: { ...activeInteraction, draftValue: value },
      } as Partial<S>);
    },

    submitResponse: ({ isCorrect, modality, timestamp }) => {
      const { activeInteraction, responses, responseOrder } = get();
      if (!activeInteraction || activeInteraction.submitted) return null;

      const submittedAt = timestamp ?? Date.now();
      const latencyMs = submittedAt - activeInteraction.startedAt;

      // Infer stage from the queue slice if available; default to 'analysis'
      // (the stage is enriched when the caller has stage context)
      const stage: SessionStage = 'analysis';

      const response: UserResponse = {
        id: generateId(),
        itemId: activeInteraction.itemId,
        stage,
        startedAt: activeInteraction.startedAt,
        submittedAt,
        latencyMs,
        modality,
        value: activeInteraction.draftValue,
        isCorrect,
        quality: null,
        selfConfidence: null,
      };

      const updatedResponses = { ...responses, [activeInteraction.itemId]: response };
      const updatedOrder = responseOrder.includes(activeInteraction.itemId)
        ? responseOrder
        : [...responseOrder, activeInteraction.itemId];

      set({
        responses: updatedResponses,
        responseOrder: updatedOrder,
        activeInteraction: {
          ...activeInteraction,
          submitted: true,
          showingResult: false,
        },
      } as Partial<S>);

      return response;
    },

    rateResponse: (itemId, quality) => {
      const { responses } = get();
      const existing = responses[itemId];
      if (!existing) return;
      set({
        responses: {
          ...responses,
          [itemId]: { ...existing, quality },
        },
      } as Partial<S>);
    },

    setConfidence: (itemId, confidence) => {
      const { responses } = get();
      const existing = responses[itemId];
      if (!existing) return;
      // Clamp to [0, 1]
      const clamped = Math.max(0, Math.min(1, confidence));
      set({
        responses: {
          ...responses,
          [itemId]: { ...existing, selfConfidence: clamped },
        },
      } as Partial<S>);
    },

    revealAnswer: () => {
      const { activeInteraction } = get();
      if (!activeInteraction) return;
      set({
        activeInteraction: { ...activeInteraction, showingResult: true },
      } as Partial<S>);
    },

    cancelInteraction: () => {
      set({ activeInteraction: null } as Partial<S>);
    },

    clearResponses: () => {
      set({
        responses: {},
        responseOrder: [],
        activeInteraction: null,
        isSubmitting: false,
        submissionError: null,
      } as unknown as Partial<S>);
    },

    getResponseForItem: (itemId) => {
      return get().responses[itemId] ?? null;
    },

    getAllResponses: () => {
      const { responses, responseOrder } = get();
      return responseOrder.map((id) => responses[id]).filter(Boolean) as UserResponse[];
    },

    getResponseCount: () => get().responseOrder.length,

    getCorrectCount: () => {
      return Object.values(get().responses).filter((r) => r.isCorrect === true).length;
    },

    getAccuracy: () => {
      const { responses } = get();
      const evaluated = Object.values(responses).filter((r) => r.isCorrect !== null);
      if (evaluated.length === 0) return 0;
      const correct = evaluated.filter((r) => r.isCorrect === true).length;
      return correct / evaluated.length;
    },

    getMeanLatencyMs: () => {
      const all = Object.values(get().responses);
      if (all.length === 0) return 0;
      const total = all.reduce((sum, r) => sum + r.latencyMs, 0);
      return total / all.length;
    },

    getResponsesByStage: (stage) => {
      return Object.values(get().responses).filter((r) => r.stage === stage);
    },
  };
}
