/**
 * FSRS-5 Fixture-Based Regression Tests
 *
 * These tests capture exact expected outputs for known sequences of reviews
 * using the default FSRS-5 weights. Any change to the algorithm or default
 * weights that alters these values will cause a test failure, making
 * regressions immediately visible.
 *
 * Fixture values were derived analytically from DEFAULT_FSRS_WEIGHTS with a
 * fixed base date of 2025-01-01T00:00:00Z.
 *
 * Key algorithm constants:
 *   DECAY   = -0.5
 *   FACTOR  = 19/81
 *   R(t,S)  = (1 + FACTOR * t/S)^DECAY
 *   interval ≈ stability at target retention = 0.9
 *
 * Initial difficulty:   D0(r) = w4 - exp(w5*(r-1)) + 1
 * Initial stability:    S0(r) = w[r-1]
 * Update difficulty:    D' = w7*D0(3) + (1-w7)*(D - w6*(r-3))
 *                          = D - w6*(r-3)  [since w7=0]
 * Recall stability:     S'_r = S*(exp(w8)*(11-D)*S^(-w9)*(exp(w10*(1-R))-1)*hp*eb + 1)
 * Lapse stability:      S'_f = w11*D^(-w12)*((S+1)^w13 - 1)*exp(w14*(1-R))
 */

import { describe, it, expect } from 'vitest';
import {
  createNewCard,
  scheduleReview,
  applyScheduleResult,
  calculateRetrievability,
  getCurrentRetrievability,
  isCardDue,
  DEFAULT_FSRS_WEIGHTS,
  DEFAULT_TARGET_RETENTION,
  type FsrsCard,
  type FsrsRating,
  type FsrsScheduleResult,
} from '../fsrs';

// ============================================================================
// Helpers
// ============================================================================

const BASE_DATE = new Date('2025-01-01T00:00:00Z');

function daysAfter(days: number, from: Date = BASE_DATE): Date {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}

/**
 * Simulate a full review sequence starting from a new card.
 * Each subsequent review is performed exactly `interval` days after the
 * previous one (i.e., on the scheduled due date).
 */
function simulateReviews(ratings: FsrsRating[]): {
  results: FsrsScheduleResult[];
  cards: FsrsCard[];
} {
  let card = createNewCard();
  let date = BASE_DATE;
  const results: FsrsScheduleResult[] = [];
  const cards: FsrsCard[] = [];

  for (const rating of ratings) {
    const result = scheduleReview(card, rating, date);
    results.push(result);
    card = applyScheduleResult(card, result, rating, date);
    cards.push({ ...card });
    date = daysAfter(result.interval, date);
  }

  return { results, cards };
}

// ============================================================================
// Fixture: first review snapshots for each rating (new card)
// ============================================================================

/**
 * Exact expected values for the first review of a brand-new card at each
 * rating. These are purely determined by initial formulas:
 *
 *   stability   = w[rating-1]
 *   difficulty  = w4 - exp(w5*(rating-1)) + 1   (clamped to [1,10])
 *   retrievability = 1   (new card, no elapsed time)
 *   interval    = max(1, round(stability))
 *   state       = 'learning' if rating==1, else 'review'
 */
interface FirstReviewSnapshot {
  rating: FsrsRating;
  stability: number;
  difficulty: number;
  retrievability: number;
  interval: number;
  state: string;
}

const FIRST_REVIEW_SNAPSHOTS: FirstReviewSnapshot[] = [
  {
    // Again: stability clamped to MIN_INTERVAL_DAYS (w0=0.4072 < 1)
    // D0(1)=w4-exp(0)+1=7.2102-1+1=7.2102
    rating: 1,
    stability: 1.0,
    difficulty: 7.2102,
    retrievability: 1,
    interval: 1,   // max(1, round(w0=0.4072)) = 1
    state: 'learning',
  },
  {
    // Hard: stability=w1=1.1829, difficulty=D0(2)=7.2102-exp(0.5316)+1
    //   exp(0.5316) ≈ 1.7023  →  D0(2) ≈ 6.5085
    rating: 2,
    stability: 1.1829,
    difficulty: 6.5085,
    retrievability: 1,
    interval: 1,   // max(1, round(1.1829)) = 1
    state: 'review',
  },
  {
    // Good: stability=w2=3.1262, difficulty=D0(3)=7.2102-exp(1.0632)+1
    //   exp(1.0632) ≈ 2.8951  →  D0(3) ≈ 5.3146
    rating: 3,
    stability: 3.1262,
    difficulty: 5.3146,
    retrievability: 1,
    interval: 3,   // round(3.1262) = 3
    state: 'review',
  },
  {
    // Easy: stability=w3=15.4722, difficulty=D0(4)=7.2102-exp(1.5948)+1
    //   exp(1.5948) ≈ 4.9272  →  D0(4) ≈ 3.2829
    rating: 4,
    stability: 15.4722,
    difficulty: 3.2829,
    retrievability: 1,
    interval: 15,  // round(15.4722) = 15
    state: 'review',
  },
];

describe('FSRS fixture: first review snapshots (new card, each rating)', () => {
  const newCard = createNewCard();

  for (const snap of FIRST_REVIEW_SNAPSHOTS) {
    const label = ['', 'Again', 'Hard', 'Good', 'Easy'][snap.rating];

    it(`rating=${snap.rating} (${label}): stability = ${snap.stability}`, () => {
      const result = scheduleReview(newCard, snap.rating, BASE_DATE);
      expect(result.stability).toBeCloseTo(snap.stability, 4);
    });

    it(`rating=${snap.rating} (${label}): difficulty ≈ ${snap.difficulty}`, () => {
      const result = scheduleReview(newCard, snap.rating, BASE_DATE);
      expect(result.difficulty).toBeCloseTo(snap.difficulty, 2);
    });

    it(`rating=${snap.rating} (${label}): retrievability = 1 (new card)`, () => {
      const result = scheduleReview(newCard, snap.rating, BASE_DATE);
      expect(result.retrievability).toBe(1);
    });

    it(`rating=${snap.rating} (${label}): interval = ${snap.interval}`, () => {
      const result = scheduleReview(newCard, snap.rating, BASE_DATE);
      expect(result.interval).toBe(snap.interval);
    });

    it(`rating=${snap.rating} (${label}): state = '${snap.state}'`, () => {
      const result = scheduleReview(newCard, snap.rating, BASE_DATE);
      expect(result.state).toBe(snap.state);
    });
  }
});

// ============================================================================
// Fixture: Good x5 multi-review sequence
// ============================================================================

describe('FSRS fixture: Good x5 review sequence', () => {
  const { results } = simulateReviews([3, 3, 3, 3, 3]);

  it('review 1: stability = w2 = 3.1262', () => {
    expect(results[0].stability).toBeCloseTo(3.1262, 4);
  });

  it('review 1: interval = 3', () => {
    expect(results[0].interval).toBe(3);
  });

  it('review 1: retrievability = 1 (new card)', () => {
    expect(results[0].retrievability).toBe(1);
  });

  it('review 1: state = review', () => {
    expect(results[0].state).toBe('review');
  });

  it('review 2: retrievability ≈ 0.9 (reviewed on due date)', () => {
    // At t=interval≈S, R(S,S)=(1+19/81)^(-0.5)≈0.9
    expect(results[1].retrievability).toBeCloseTo(0.9, 1);
  });

  it('review 2: stability grows beyond review 1', () => {
    expect(results[1].stability).toBeGreaterThan(results[0].stability);
  });

  it('review 2: interval ≈ 11 (±3 day rounding)', () => {
    expect(results[1].interval).toBeGreaterThanOrEqual(8);
    expect(results[1].interval).toBeLessThanOrEqual(14);
  });

  it('review 3: stability greater than review 2', () => {
    expect(results[2].stability).toBeGreaterThan(results[1].stability);
  });

  it('review 4: stability greater than review 3', () => {
    expect(results[3].stability).toBeGreaterThan(results[2].stability);
  });

  it('review 5: stability greater than review 4 and exceeds 40 days', () => {
    expect(results[4].stability).toBeGreaterThan(results[3].stability);
    expect(results[4].stability).toBeGreaterThan(40);
  });

  it('all reviews produce state = review', () => {
    for (const r of results) {
      expect(r.state).toBe('review');
    }
  });

  it('intervals grow monotonically', () => {
    for (let i = 1; i < results.length; i++) {
      expect(results[i].interval).toBeGreaterThan(results[i - 1].interval);
    }
  });

  it('difficulty stays constant for all Good reviews (r=3, delta=0)', () => {
    // updateDifficulty: D' = D - w6*(3-3) = D  →  difficulty never changes
    const firstDifficulty = results[0].difficulty;
    for (const r of results) {
      expect(r.difficulty).toBeCloseTo(firstDifficulty, 4);
    }
  });
});

// ============================================================================
// Fixture: consecutive Again (lapse) behaviour
// ============================================================================

describe('FSRS fixture: consecutive Again (lapse) reviews', () => {
  it('first Again on new card: state = learning, stability clamped to 1 (w0=0.4072 < MIN_INTERVAL=1)', () => {
    const card = createNewCard();
    const result = scheduleReview(card, 1, BASE_DATE);
    expect(result.state).toBe('learning');
    expect(result.stability).toBe(1);
    expect(result.interval).toBe(1);
  });

  it('second Again on reviewed card: state = relearning', () => {
    const card = createNewCard();
    const r1 = scheduleReview(card, 3, BASE_DATE);
    const card2 = applyScheduleResult(card, r1, 3, BASE_DATE);
    const r2 = scheduleReview(card2, 1, daysAfter(1));
    expect(r2.state).toBe('relearning');
  });

  it('lapse significantly reduces stability vs pre-lapse value', () => {
    const card = createNewCard();
    const r1 = scheduleReview(card, 3, BASE_DATE);
    const card2 = applyScheduleResult(card, r1, 3, BASE_DATE);
    const prelapseStability = card2.stability; // 3.1262

    const r2 = scheduleReview(card2, 1, daysAfter(r1.interval));
    expect(r2.stability).toBeLessThan(prelapseStability);
  });

  it('three consecutive lapses keep stability >= 1 (minimum interval)', () => {
    let card = createNewCard();
    let date = BASE_DATE;
    for (let i = 0; i < 3; i++) {
      const result = scheduleReview(card, 1, date);
      card = applyScheduleResult(card, result, 1, date);
      date = daysAfter(1, date);
      expect(card.stability).toBeGreaterThanOrEqual(1);
    }
  });

  it('lapse count increments by 1 for each Again review', () => {
    let card = createNewCard();
    let date = BASE_DATE;
    expect(card.lapseCount).toBe(0);
    for (let i = 1; i <= 5; i++) {
      const result = scheduleReview(card, 1, date);
      card = applyScheduleResult(card, result, 1, date);
      date = daysAfter(1, date);
      expect(card.lapseCount).toBe(i);
    }
  });

  it('difficulty is clamped to [1, 10] after 30 consecutive lapses', () => {
    let card = createNewCard();
    let date = BASE_DATE;
    for (let i = 0; i < 30; i++) {
      const result = scheduleReview(card, 1, date);
      card = applyScheduleResult(card, result, 1, date);
      date = daysAfter(1, date);
      expect(card.difficulty).toBeLessThanOrEqual(10);
      expect(card.difficulty).toBeGreaterThanOrEqual(1);
    }
  });

  it('Good → Again → Good: final state = review (recovered from lapse)', () => {
    let card = createNewCard();
    let date = BASE_DATE;

    const r1 = scheduleReview(card, 3, date);
    card = applyScheduleResult(card, r1, 3, date);
    date = daysAfter(r1.interval, date);
    expect(r1.state).toBe('review');

    const r2 = scheduleReview(card, 1, date);
    card = applyScheduleResult(card, r2, 1, date);
    date = daysAfter(r2.interval, date);
    expect(r2.state).toBe('relearning');

    const r3 = scheduleReview(card, 3, date);
    expect(r3.state).toBe('review');
  });

  it('Again on a reviewed card: difficulty increases by 2*w6', () => {
    // updateDifficulty: D' = D - w6*(1-3) = D + 2*w6
    const card = createNewCard();
    const r1 = scheduleReview(card, 3, BASE_DATE);
    const card2 = applyScheduleResult(card, r1, 3, BASE_DATE);
    const preLapseDifficulty = card2.difficulty;

    const r2 = scheduleReview(card2, 1, daysAfter(1));
    const expectedDiff = Math.min(10, preLapseDifficulty + 2 * DEFAULT_FSRS_WEIGHTS.w[6]);
    expect(r2.difficulty).toBeCloseTo(expectedDiff, 3);
  });
});

// ============================================================================
// Fixture: getCurrentRetrievability at known time offsets
// ============================================================================

describe('FSRS fixture: getCurrentRetrievability at known time offsets', () => {
  /** Card reviewed once with Good: stability = 3.1262, lastReview = BASE_DATE */
  function makeGoodCard(): FsrsCard {
    const card = createNewCard();
    const result = scheduleReview(card, 3, BASE_DATE);
    return applyScheduleResult(card, result, 3, BASE_DATE);
  }

  it('new (never-reviewed) card: always returns 1', () => {
    const card = createNewCard();
    expect(getCurrentRetrievability(card, BASE_DATE)).toBe(1);
    expect(getCurrentRetrievability(card, daysAfter(100))).toBe(1);
  });

  it('immediately after review (t=0): returns 1.0', () => {
    const card = makeGoodCard();
    // R(0, S) = (1 + 0)^(-0.5) = 1
    expect(getCurrentRetrievability(card, BASE_DATE)).toBeCloseTo(1.0, 10);
  });

  it('at t=1 day: matches exact formula value', () => {
    const card = makeGoodCard();
    const S = card.stability; // 3.1262
    // R(1, S) = (1 + (19/81)*(1/S))^(-0.5)
    const expected = Math.pow(1 + (19 / 81) * (1 / S), -0.5);
    expect(getCurrentRetrievability(card, daysAfter(1))).toBeCloseTo(expected, 5);
  });

  it('at t = stability days (≈3.1): returns ≈ 0.9', () => {
    const card = makeGoodCard();
    // R(S, S) = (1 + 19/81)^(-0.5) ≈ 0.9
    const r = getCurrentRetrievability(card, daysAfter(card.stability));
    expect(r).toBeCloseTo(0.9, 1);
  });

  it('at t = 2*stability days: between 0.7 and 0.9', () => {
    const card = makeGoodCard();
    const r = getCurrentRetrievability(card, daysAfter(card.stability * 2));
    expect(r).toBeGreaterThan(0.7);
    expect(r).toBeLessThan(0.9);
  });

  it('decreases monotonically as time passes', () => {
    const card = makeGoodCard();
    const r0  = getCurrentRetrievability(card, BASE_DATE);
    const r1  = getCurrentRetrievability(card, daysAfter(1));
    const r3  = getCurrentRetrievability(card, daysAfter(3));
    const r7  = getCurrentRetrievability(card, daysAfter(7));
    const r14 = getCurrentRetrievability(card, daysAfter(14));

    expect(r0).toBeGreaterThan(r1);
    expect(r1).toBeGreaterThan(r3);
    expect(r3).toBeGreaterThan(r7);
    expect(r7).toBeGreaterThan(r14);
  });

  it('card with stability=0 or null lastReview returns 1', () => {
    const card: FsrsCard = {
      ...createNewCard(),
      state: 'review',
      stability: 0,
    };
    expect(getCurrentRetrievability(card, BASE_DATE)).toBe(1);
  });
});

// ============================================================================
// Fixture: isCardDue logic
// ============================================================================

describe('FSRS fixture: isCardDue logic', () => {
  it('new card is always due regardless of dueDate', () => {
    const card = createNewCard();
    expect(isCardDue(card, BASE_DATE, BASE_DATE)).toBe(true);
    expect(isCardDue(card, daysAfter(100), BASE_DATE)).toBe(true);
    expect(isCardDue(card, daysAfter(365), BASE_DATE)).toBe(true);
  });

  it('reviewed card is due when now = dueDate (boundary)', () => {
    const card: FsrsCard = { ...createNewCard(), state: 'review', stability: 10, difficulty: 5 };
    const dueDate = daysAfter(10);
    expect(isCardDue(card, dueDate, dueDate)).toBe(true);
  });

  it('reviewed card is due when now > dueDate', () => {
    const card: FsrsCard = { ...createNewCard(), state: 'review', stability: 10, difficulty: 5 };
    const dueDate = daysAfter(10);
    expect(isCardDue(card, dueDate, daysAfter(15))).toBe(true);
  });

  it('reviewed card is NOT due when now < dueDate', () => {
    const card: FsrsCard = { ...createNewCard(), state: 'review', stability: 10, difficulty: 5 };
    const dueDate = daysAfter(10);
    expect(isCardDue(card, dueDate, daysAfter(5))).toBe(false);
  });

  it('relearning card is due when now >= dueDate', () => {
    const card: FsrsCard = { ...createNewCard(), state: 'relearning', stability: 1, difficulty: 8 };
    const dueDate = daysAfter(1);
    expect(isCardDue(card, dueDate, daysAfter(1))).toBe(true);
    expect(isCardDue(card, dueDate, daysAfter(2))).toBe(true);
  });

  it('relearning card is NOT due before dueDate', () => {
    const card: FsrsCard = { ...createNewCard(), state: 'relearning', stability: 1, difficulty: 8 };
    const dueDate = daysAfter(1);
    expect(isCardDue(card, dueDate, BASE_DATE)).toBe(false);
  });

  it('learning card is due when now >= dueDate', () => {
    const card: FsrsCard = {
      ...createNewCard(),
      state: 'learning',
      stability: 0.4072,
      difficulty: 7.2102,
      lastReview: BASE_DATE,
    };
    const dueDate = daysAfter(1);
    expect(isCardDue(card, dueDate, BASE_DATE)).toBe(false);
    expect(isCardDue(card, dueDate, daysAfter(1))).toBe(true);
  });
});

// ============================================================================
// Fixture: calculateRetrievability exact analytic values
// ============================================================================

describe('FSRS fixture: calculateRetrievability exact analytic values', () => {
  /**
   * R(t, S) = (1 + (19/81) * t/S)^(-0.5)
   * Expected values computed analytically.
   */
  const CASES = [
    { elapsed: 0,   stability: 10,  expected: 1.0 },
    { elapsed: 10,  stability: 10,  expected: Math.pow(1 + 19 / 81, -0.5) },        // ≈ 0.9
    { elapsed: 5,   stability: 10,  expected: Math.pow(1 + (19 / 81) * 0.5, -0.5) },
    { elapsed: 20,  stability: 10,  expected: Math.pow(1 + (19 / 81) * 2, -0.5) },
    { elapsed: 1,   stability: 30,  expected: Math.pow(1 + (19 / 81) / 30, -0.5) },
    { elapsed: 30,  stability: 30,  expected: Math.pow(1 + 19 / 81, -0.5) },        // ≈ 0.9
    { elapsed: 100, stability: 100, expected: Math.pow(1 + 19 / 81, -0.5) },        // ≈ 0.9
  ];

  for (const { elapsed, stability, expected } of CASES) {
    it(`R(${elapsed}, ${stability}) = ${expected.toFixed(6)}`, () => {
      expect(calculateRetrievability(elapsed, stability)).toBeCloseTo(expected, 8);
    });
  }

  it('R(S, S) ≈ 0.9 for any positive stability (formula invariant)', () => {
    for (const s of [1, 5, 10, 30, 100, 365]) {
      expect(calculateRetrievability(s, s)).toBeCloseTo(0.9, 1);
    }
  });
});

// ============================================================================
// Fixture: full deterministic regression sequence [4, 3, 2, 1, 3]
// ============================================================================

/**
 * Canonical regression sequence: Easy, Good, Hard, Again, Good.
 *
 * This fixture tests the full interaction of all rating types, including
 * the Hard penalty (w15), Easy bonus (w16), and lapse formula.
 * Any algorithm change will break one or more of these assertions.
 */
describe('FSRS fixture: deterministic regression sequence [Easy, Good, Hard, Again, Good]', () => {
  const SEQUENCE: FsrsRating[] = [4, 3, 2, 1, 3];
  const { results, cards } = simulateReviews(SEQUENCE);

  // --- Review 1: Easy (new card) ---

  it('review 1 (Easy): stability = w3 = 15.4722', () => {
    expect(results[0].stability).toBeCloseTo(15.4722, 4);
  });

  it('review 1 (Easy): difficulty ≈ 3.2829', () => {
    // D0(4) = w4 - exp(w5*3) + 1 = 7.2102 - exp(1.5948) + 1 ≈ 3.2829
    expect(results[0].difficulty).toBeCloseTo(3.2829, 2);
  });

  it('review 1 (Easy): retrievability = 1 (new card)', () => {
    expect(results[0].retrievability).toBe(1);
  });

  it('review 1 (Easy): interval = 15', () => {
    // round(15.4722) = 15
    expect(results[0].interval).toBe(15);
  });

  it('review 1 (Easy): state = review', () => {
    expect(results[0].state).toBe('review');
  });

  // --- Review 2: Good (after 15 days) ---

  it('review 2 (Good): retrievability ≈ 0.9 (reviewed on due date)', () => {
    // R(15, 15.4722) ≈ 0.9 by design
    expect(results[1].retrievability).toBeCloseTo(0.9, 1);
  });

  it('review 2 (Good): difficulty unchanged (r=3 → delta = w6*(3-3) = 0)', () => {
    expect(results[1].difficulty).toBeCloseTo(results[0].difficulty, 3);
  });

  it('review 2 (Good): stability grows substantially from review 1', () => {
    expect(results[1].stability).toBeGreaterThan(results[0].stability);
  });

  it('review 2 (Good): state = review', () => {
    expect(results[1].state).toBe('review');
  });

  // --- Review 3: Hard (penalty applies) ---

  it('review 3 (Hard): stability lower than if Good had been given', () => {
    // Hard penalty (w15=0.2415) reduces stability growth
    const { results: goodResults } = simulateReviews([4, 3, 3]);
    expect(results[2].stability).toBeLessThan(goodResults[2].stability);
  });

  it('review 3 (Hard): difficulty increases by w6 (Hard makes card harder)', () => {
    // updateDifficulty: D' = D - w6*(2-3) = D + w6*1
    const expectedDiff = Math.min(10, Math.max(1, results[1].difficulty + DEFAULT_FSRS_WEIGHTS.w[6]));
    expect(results[2].difficulty).toBeCloseTo(expectedDiff, 3);
  });

  it('review 3 (Hard): state = review', () => {
    expect(results[2].state).toBe('review');
  });

  // --- Review 4: Again (lapse) ---

  it('review 4 (Again): state = relearning', () => {
    expect(results[3].state).toBe('relearning');
  });

  it('review 4 (Again): stability substantially reduced from pre-lapse', () => {
    expect(results[3].stability).toBeLessThan(results[2].stability);
  });

  it('review 4 (Again): difficulty increases by 2*w6', () => {
    // D' = D - w6*(1-3) = D + 2*w6
    const expectedDiff = Math.min(10, Math.max(1, results[2].difficulty + 2 * DEFAULT_FSRS_WEIGHTS.w[6]));
    expect(results[3].difficulty).toBeCloseTo(expectedDiff, 3);
  });

  it('review 4 (Again): lapseCount = 1', () => {
    expect(cards[3].lapseCount).toBe(1);
  });

  // --- Review 5: Good (recovery) ---

  it('review 5 (Good after lapse): state = review', () => {
    expect(results[4].state).toBe('review');
  });

  it('review 5 (Good after lapse): stability greater than post-lapse value', () => {
    expect(results[4].stability).toBeGreaterThan(results[3].stability);
  });

  it('review 5 (Good): difficulty unchanged from review 4 (r=3, delta=0)', () => {
    expect(results[4].difficulty).toBeCloseTo(results[3].difficulty, 3);
  });

  // --- Overall card state after 5 reviews ---

  it('after 5 reviews: reviewCount = 5', () => {
    expect(cards[4].reviewCount).toBe(5);
  });

  it('after 5 reviews: lapseCount = 1 (only one Again)', () => {
    expect(cards[4].lapseCount).toBe(1);
  });

  it('after 5 reviews: lastReview is set (not null)', () => {
    expect(cards[4].lastReview).not.toBeNull();
  });
});

// ============================================================================
// Fixture: Easy bonus vs Good stability comparison
// ============================================================================

describe('FSRS fixture: rating stability ordering on repeat reviews', () => {
  /** Card reviewed once with Good, then given a second review with the given rating */
  function secondReviewStability(secondRating: FsrsRating): number {
    const card = createNewCard();
    const r1 = scheduleReview(card, 3, BASE_DATE);
    const card2 = applyScheduleResult(card, r1, 3, BASE_DATE);
    const r2 = scheduleReview(card2, secondRating, daysAfter(r1.interval));
    return r2.stability;
  }

  it('Easy bonus: stability(Easy) > stability(Good) on second review', () => {
    expect(secondReviewStability(4)).toBeGreaterThan(secondReviewStability(3));
  });

  it('Hard penalty: stability(Hard) < stability(Good) on second review', () => {
    expect(secondReviewStability(2)).toBeLessThan(secondReviewStability(3));
  });

  it('Lapse: stability(Again) < stability(Hard) on second review', () => {
    expect(secondReviewStability(1)).toBeLessThan(secondReviewStability(2));
  });

  it('ordering: Again < Hard < Good < Easy on second review', () => {
    const s1 = secondReviewStability(1);
    const s2 = secondReviewStability(2);
    const s3 = secondReviewStability(3);
    const s4 = secondReviewStability(4);
    expect(s1).toBeLessThan(s2);
    expect(s2).toBeLessThan(s3);
    expect(s3).toBeLessThan(s4);
  });
});

// ============================================================================
// Fixture: default weight and parameter contract
// ============================================================================

describe('FSRS fixture: default weight and parameter contract', () => {
  it('DEFAULT_FSRS_WEIGHTS has exactly 19 parameters (w0..w18)', () => {
    expect(DEFAULT_FSRS_WEIGHTS.w).toHaveLength(19);
  });

  it('all weights are finite numbers', () => {
    for (const w of DEFAULT_FSRS_WEIGHTS.w) {
      expect(typeof w).toBe('number');
      expect(Number.isFinite(w)).toBe(true);
    }
  });

  it('w15 < 1 (Hard penalty reduces stability)', () => {
    expect(DEFAULT_FSRS_WEIGHTS.w[15]).toBeLessThan(1);
  });

  it('w16 > 1 (Easy bonus increases stability)', () => {
    expect(DEFAULT_FSRS_WEIGHTS.w[16]).toBeGreaterThan(1);
  });

  it('w7 = 0 (mean-reversion disabled in defaults)', () => {
    expect(DEFAULT_FSRS_WEIGHTS.w[7]).toBe(0);
  });

  it('DEFAULT_TARGET_RETENTION = 0.9', () => {
    expect(DEFAULT_TARGET_RETENTION).toBe(0.9);
  });

  it('w0..w3 match published FSRS-5 defaults', () => {
    const w = DEFAULT_FSRS_WEIGHTS.w;
    expect(w[0]).toBeCloseTo(0.4072, 4);
    expect(w[1]).toBeCloseTo(1.1829, 4);
    expect(w[2]).toBeCloseTo(3.1262, 4);
    expect(w[3]).toBeCloseTo(15.4722, 4);
  });
});
