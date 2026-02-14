/**
 * FSRS-5 Spaced Repetition Scheduling Service
 *
 * Pure TypeScript implementation of the FSRS-5 (Free Spaced Repetition Scheduler)
 * algorithm by Jarrett Ye. This is a pure domain service with no external dependencies.
 *
 * References:
 * - FSRS-5 paper: https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm
 * - Rating scale: 1=Again, 2=Hard, 3=Good, 4=Easy
 *
 * Key concepts:
 * - Stability (S): Number of days until 90% retention
 * - Difficulty (D): Inherent difficulty of the item, range [1, 10]
 * - Retrievability (R): Probability of recall at time t, range [0, 1]
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Rating scale for a review outcome
 * 1 = Again (complete failure, reset)
 * 2 = Hard (correct but difficult)
 * 3 = Good (correct with some effort)
 * 4 = Easy (correct with no effort)
 */
export type FsrsRating = 1 | 2 | 3 | 4;

/**
 * Card state in the FSRS system
 */
export type FsrsCardState = 'new' | 'learning' | 'review' | 'relearning';

/**
 * The memory state of a card prior to a review
 */
export interface FsrsCard {
  stability: number;    // S: days until 90% retention
  difficulty: number;   // D: [1, 10] inherent difficulty
  retrievability: number; // R: [0, 1] probability of recall
  state: FsrsCardState;
  lastReview: Date | null;
  reviewCount: number;
  lapseCount: number;
}

/**
 * Result of scheduling a review
 */
export interface FsrsScheduleResult {
  nextDue: Date;
  interval: number;      // days until next review
  stability: number;     // new stability after review
  difficulty: number;    // new difficulty after review
  retrievability: number; // retrievability at time of review
  state: FsrsCardState;
}

/**
 * FSRS-5 algorithm weights (19 parameters, w0..w18)
 * These are the default values from the FSRS-5 paper
 */
export interface FsrsWeights {
  w: readonly number[];
}

// ============================================================================
// Default Parameters
// ============================================================================

/**
 * Default FSRS-5 weights (w0..w18)
 * Matches the defaults stored in fsrs_parameters table
 */
export const DEFAULT_FSRS_WEIGHTS: FsrsWeights = {
  w: [
    0.4072, // w0:  initial stability for rating 1 (Again)
    1.1829, // w1:  initial stability for rating 2 (Hard)
    3.1262, // w2:  initial stability for rating 3 (Good)
    15.4722, // w3:  initial stability for rating 4 (Easy)
    7.2102, // w4:  initial difficulty base
    0.5316, // w5:  initial difficulty rating modifier
    1.0651, // w6:  difficulty update delta scale
    0.0,    // w7:  difficulty mean-reversion factor
    1.5546, // w8:  recall stability base exponent
    0.1192, // w9:  recall stability decay exponent
    1.0100, // w10: recall stability retrievability exponent
    1.9395, // w11: lapse stability coefficient
    0.1100, // w12: lapse stability difficulty exponent
    0.2939, // w13: lapse stability S exponent
    2.0091, // w14: lapse stability retrievability exponent
    0.2415, // w15: Hard recall stability penalty (< 1, reduces stability)
    2.9898, // w16: Easy recall stability bonus (> 1, increases stability)
    0.5100, // w17: short-term stability factor
    0.6000, // w18: short-term difficulty factor
  ] as const,
};

/**
 * Default target retention probability
 */
export const DEFAULT_TARGET_RETENTION = 0.9;

/**
 * Minimum and maximum bounds for difficulty
 */
const DIFFICULTY_MIN = 1;
const DIFFICULTY_MAX = 10;

/**
 * Minimum interval in days
 */
const MIN_INTERVAL_DAYS = 1;

// ============================================================================
// Core FSRS-5 Math
// ============================================================================

/**
 * Calculate retrievability R(t, S) = (1 + FACTOR * t / S)^DECAY
 * where FACTOR = 19/81 and DECAY = -0.5 (from FSRS-5 paper)
 *
 * R represents the probability of recall after t days given stability S.
 */
export function calculateRetrievability(elapsedDays: number, stability: number): number {
  const DECAY = -0.5;
  const FACTOR = 19 / 81;
  return Math.pow(1 + FACTOR * (elapsedDays / stability), DECAY);
}

/**
 * Calculate initial difficulty D0 for a new card based on first rating.
 *
 * D0(r) = w4 - exp(w5 * (r - 1)) + 1
 */
function initialDifficulty(rating: FsrsRating, w: readonly number[]): number {
  const d = w[4] - Math.exp(w[5] * (rating - 1)) + 1;
  return clampDifficulty(d);
}

/**
 * Update difficulty D' after a review.
 *
 * D'(D, r) = w7 * D0(3) + (1 - w7) * (D - w6 * (r - 3))
 *
 * Note: w7 = 0.0 in the defaults, so D' = D - w6 * (r - 3),
 * which means difficulty increases for Again/Hard and decreases for Easy.
 */
function updateDifficulty(
  currentDifficulty: number,
  rating: FsrsRating,
  w: readonly number[]
): number {
  const d0_3 = initialDifficulty(3, w); // difficulty at "Good" for mean reversion
  const d = w[7] * d0_3 + (1 - w[7]) * (currentDifficulty - w[6] * (rating - 3));
  return clampDifficulty(d);
}

/**
 * Clamp difficulty to valid range [1, 10].
 */
function clampDifficulty(d: number): number {
  return Math.min(DIFFICULTY_MAX, Math.max(DIFFICULTY_MIN, d));
}

/**
 * Calculate initial stability S0 for a new card based on first rating.
 *
 * S0(r) = w[r-1]  (i.e., w0 for Again, w1 for Hard, w2 for Good, w3 for Easy)
 */
function initialStability(rating: FsrsRating, w: readonly number[]): number {
  return Math.max(MIN_INTERVAL_DAYS, w[rating - 1]);
}

/**
 * Calculate next stability S'(D, S, R, r) after a successful review (rating >= 2).
 *
 * S'_r(D, S, R, r) = S * e^(w8) * (11 - D) * S^(-w9) *
 *                    (e^(w10 * (1 - R)) - 1) * hard_penalty * easy_bonus + S
 *
 * Where:
 *   - hard_penalty = w15 if r=Hard else 1  (w15 < 1, reduces stability for Hard)
 *   - easy_bonus   = w16 if r=Easy else 1  (w16 > 1, increases stability for Easy)
 */
function nextStabilityRecall(
  difficulty: number,
  stability: number,
  retrievability: number,
  rating: FsrsRating,
  w: readonly number[]
): number {
  const hardPenalty = rating === 2 ? w[15] : 1;
  const easyBonus = rating === 4 ? w[16] : 1;

  const s = stability * (
    Math.exp(w[8]) *
    (11 - difficulty) *
    Math.pow(stability, -w[9]) *
    (Math.exp(w[10] * (1 - retrievability)) - 1) *
    hardPenalty *
    easyBonus +
    1
  );

  return Math.max(MIN_INTERVAL_DAYS, s);
}

/**
 * Calculate next stability S'_f after a lapse (rating = Again).
 *
 * S'_f(D, S, R) = w11 * D^(-w12) * ((S + 1)^w13 - 1) * e^(w14 * (1 - R))
 */
function nextStabilityLapse(
  difficulty: number,
  stability: number,
  retrievability: number,
  w: readonly number[]
): number {
  const s =
    w[11] *
    Math.pow(difficulty, -w[12]) *
    (Math.pow(stability + 1, w[13]) - 1) *
    Math.exp(w[14] * (1 - retrievability));

  return Math.max(MIN_INTERVAL_DAYS, s);
}

/**
 * Calculate the next review interval in days given desired retention.
 *
 * Derived from: R = (1 + FACTOR * t / S)^DECAY
 * Solving for t: t = S / FACTOR * (R^(1/DECAY) - 1)
 */
export function nextInterval(stability: number, requestedRetention: number): number {
  const DECAY = -0.5;
  const FACTOR = 19 / 81;
  const interval = (stability / FACTOR) * (Math.pow(requestedRetention, 1 / DECAY) - 1);
  return Math.max(MIN_INTERVAL_DAYS, Math.round(interval));
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Create an initial card state for a new (unseen) item.
 */
export function createNewCard(): FsrsCard {
  return {
    stability: 0,
    difficulty: 0,
    retrievability: 1,
    state: 'new',
    lastReview: null,
    reviewCount: 0,
    lapseCount: 0,
  };
}

/**
 * Schedule a review for a card given a rating and the current time.
 *
 * Handles both first review (new card) and subsequent reviews (repeat).
 *
 * @param card       - Current card state
 * @param rating     - 1=Again, 2=Hard, 3=Good, 4=Easy
 * @param now        - Current date/time (defaults to current time if omitted)
 * @param weights    - FSRS-5 weights (defaults to DEFAULT_FSRS_WEIGHTS)
 * @param targetRetention - Target retention probability (defaults to 0.9)
 * @returns          - Updated scheduling result
 */
export function scheduleReview(
  card: FsrsCard,
  rating: FsrsRating,
  now: Date = new Date(),
  weights: FsrsWeights = DEFAULT_FSRS_WEIGHTS,
  targetRetention: number = DEFAULT_TARGET_RETENTION
): FsrsScheduleResult {
  const w = weights.w;
  const isNew = card.state === 'new';

  // Calculate elapsed days since last review
  const elapsedDays = card.lastReview !== null
    ? Math.max(0, (now.getTime() - card.lastReview.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // Calculate retrievability at time of review
  const retrievability = isNew
    ? 1
    : calculateRetrievability(elapsedDays, card.stability);

  let newStability: number;
  let newDifficulty: number;
  let newState: FsrsCardState;

  if (isNew) {
    // First review: use initial parameters
    newStability = initialStability(rating, w);
    newDifficulty = initialDifficulty(rating, w);
    newState = rating === 1 ? 'learning' : 'review';
  } else {
    // Subsequent review: update parameters based on recall/lapse
    newDifficulty = updateDifficulty(card.difficulty, rating, w);

    if (rating === 1) {
      // Lapse (Again): significant stability decrease
      newStability = nextStabilityLapse(card.difficulty, card.stability, retrievability, w);
      newState = 'relearning';
    } else {
      // Successful recall (Hard/Good/Easy): stability increase
      newStability = nextStabilityRecall(
        card.difficulty,
        card.stability,
        retrievability,
        rating,
        w
      );
      newState = 'review';
    }
  }

  // Calculate next interval based on desired retention
  const interval = nextInterval(newStability, targetRetention);

  // Schedule next review date
  const nextDue = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);

  return {
    nextDue,
    interval,
    stability: newStability,
    difficulty: newDifficulty,
    retrievability,
    state: newState,
  };
}

/**
 * Apply a schedule result back to a card, producing a new card state.
 *
 * This is a pure function that does not mutate the input card.
 */
export function applyScheduleResult(
  card: FsrsCard,
  result: FsrsScheduleResult,
  rating: FsrsRating,
  now: Date = new Date()
): FsrsCard {
  return {
    stability: result.stability,
    difficulty: result.difficulty,
    retrievability: result.retrievability,
    state: result.state,
    lastReview: now,
    reviewCount: card.reviewCount + 1,
    lapseCount: card.lapseCount + (rating === 1 ? 1 : 0),
  };
}

/**
 * Calculate the current retrievability of a card given the current date.
 *
 * Returns 1 for new cards that have never been reviewed.
 */
export function getCurrentRetrievability(card: FsrsCard, now: Date = new Date()): number {
  if (card.state === 'new' || card.lastReview === null || card.stability <= 0) {
    return 1;
  }
  const elapsedDays = (now.getTime() - card.lastReview.getTime()) / (1000 * 60 * 60 * 24);
  return calculateRetrievability(Math.max(0, elapsedDays), card.stability);
}

/**
 * Check whether a card is due for review at the given time.
 */
export function isCardDue(card: FsrsCard, dueDate: Date, now: Date = new Date()): boolean {
  if (card.state === 'new') {
    return true;
  }
  return now >= dueDate;
}
