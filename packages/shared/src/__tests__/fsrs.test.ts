/**
 * FSRS-5 Scheduling Service Tests
 *
 * Tests the core FSRS-5 algorithm:
 * - Initial card creation
 * - First review (new card)
 * - Repeat review scheduling
 * - Rating effects on stability/difficulty
 * - Retrievability calculation
 * - Lapse handling
 * - Interval calculation
 */

import { describe, it, expect } from 'vitest';
import {
  createNewCard,
  scheduleReview,
  applyScheduleResult,
  calculateRetrievability,
  getCurrentRetrievability,
  isCardDue,
  nextInterval,
  DEFAULT_FSRS_WEIGHTS,
  DEFAULT_TARGET_RETENTION,
  type FsrsCard,
  type FsrsRating,
} from '../fsrs';

// ============================================================================
// Helpers
// ============================================================================

/** Create a date offset by N days from a reference date */
function daysFromNow(days: number, from: Date = new Date('2025-01-01T00:00:00Z')): Date {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}

const BASE_DATE = new Date('2025-01-01T00:00:00Z');

// ============================================================================
// createNewCard
// ============================================================================

describe('createNewCard', () => {
  it('should return a card in the new state', () => {
    const card = createNewCard();
    expect(card.state).toBe('new');
  });

  it('should have zero review and lapse counts', () => {
    const card = createNewCard();
    expect(card.reviewCount).toBe(0);
    expect(card.lapseCount).toBe(0);
  });

  it('should have no last review date', () => {
    const card = createNewCard();
    expect(card.lastReview).toBeNull();
  });

  it('should have full retrievability', () => {
    const card = createNewCard();
    expect(card.retrievability).toBe(1);
  });
});

// ============================================================================
// scheduleReview - first review (new card)
// ============================================================================

describe('scheduleReview - first review (new card)', () => {
  const newCard = createNewCard();

  it('should produce a valid schedule for each rating', () => {
    const ratings: FsrsRating[] = [1, 2, 3, 4];
    for (const rating of ratings) {
      const result = scheduleReview(newCard, rating, BASE_DATE);
      expect(result.interval).toBeGreaterThanOrEqual(1);
      expect(result.stability).toBeGreaterThan(0);
      expect(result.difficulty).toBeGreaterThanOrEqual(1);
      expect(result.difficulty).toBeLessThanOrEqual(10);
      expect(result.nextDue).toBeInstanceOf(Date);
      expect(result.nextDue.getTime()).toBeGreaterThan(BASE_DATE.getTime());
    }
  });

  it('should produce increasing stability for higher ratings', () => {
    const s_again = scheduleReview(newCard, 1, BASE_DATE).stability;
    const s_hard  = scheduleReview(newCard, 2, BASE_DATE).stability;
    const s_good  = scheduleReview(newCard, 3, BASE_DATE).stability;
    const s_easy  = scheduleReview(newCard, 4, BASE_DATE).stability;

    expect(s_hard).toBeGreaterThan(s_again);
    expect(s_good).toBeGreaterThan(s_hard);
    expect(s_easy).toBeGreaterThan(s_good);
  });

  it('should produce increasing intervals for higher ratings', () => {
    const i_again = scheduleReview(newCard, 1, BASE_DATE).interval;
    const i_hard  = scheduleReview(newCard, 2, BASE_DATE).interval;
    const i_good  = scheduleReview(newCard, 3, BASE_DATE).interval;
    const i_easy  = scheduleReview(newCard, 4, BASE_DATE).interval;

    expect(i_hard).toBeGreaterThanOrEqual(i_again);
    expect(i_good).toBeGreaterThanOrEqual(i_hard);
    expect(i_easy).toBeGreaterThanOrEqual(i_good);
  });

  it('should set state to learning for Again rating on new card', () => {
    const result = scheduleReview(newCard, 1, BASE_DATE);
    expect(result.state).toBe('learning');
  });

  it('should set state to review for Good/Easy rating on new card', () => {
    const resultGood = scheduleReview(newCard, 3, BASE_DATE);
    const resultEasy = scheduleReview(newCard, 4, BASE_DATE);
    expect(resultGood.state).toBe('review');
    expect(resultEasy.state).toBe('review');
  });

  it('should set retrievability to 1 for a new card', () => {
    const result = scheduleReview(newCard, 3, BASE_DATE);
    expect(result.retrievability).toBe(1);
  });

  it('nextDue should be approximately interval days after now', () => {
    const result = scheduleReview(newCard, 3, BASE_DATE);
    const expectedDue = daysFromNow(result.interval, BASE_DATE);
    // Allow 1 second tolerance for floating point
    expect(Math.abs(result.nextDue.getTime() - expectedDue.getTime())).toBeLessThan(1000);
  });

  it('should produce difficulty in valid range [1, 10] for all ratings', () => {
    const ratings: FsrsRating[] = [1, 2, 3, 4];
    for (const rating of ratings) {
      const result = scheduleReview(newCard, rating, BASE_DATE);
      expect(result.difficulty).toBeGreaterThanOrEqual(1);
      expect(result.difficulty).toBeLessThanOrEqual(10);
    }
  });
});

// ============================================================================
// scheduleReview - repeat reviews
// ============================================================================

describe('scheduleReview - repeat reviews', () => {
  /** Build a card that has been reviewed once with Good */
  function makeReviewedCard(rating: FsrsRating = 3): FsrsCard {
    const card = createNewCard();
    const result = scheduleReview(card, rating, BASE_DATE);
    return applyScheduleResult(card, result, rating, BASE_DATE);
  }

  it('should increase stability on a Good repeat review', () => {
    const card = makeReviewedCard(3);
    const reviewDate = daysFromNow(card.stability * 0.9, BASE_DATE);
    const result = scheduleReview(card, 3, reviewDate);
    expect(result.stability).toBeGreaterThan(card.stability);
  });

  it('should decrease stability on an Again (lapse) review', () => {
    const card = makeReviewedCard(3);
    const reviewDate = daysFromNow(card.stability * 0.9, BASE_DATE);
    const result = scheduleReview(card, 1, reviewDate);
    expect(result.stability).toBeLessThan(card.stability);
  });

  it('should set state to relearning on lapse', () => {
    const card = makeReviewedCard(3);
    const reviewDate = daysFromNow(1, BASE_DATE);
    const result = scheduleReview(card, 1, reviewDate);
    expect(result.state).toBe('relearning');
  });

  it('should set state to review on successful recall', () => {
    const card = makeReviewedCard(3);
    const reviewDate = daysFromNow(card.stability * 0.9, BASE_DATE);
    const resultHard = scheduleReview(card, 2, reviewDate);
    const resultGood = scheduleReview(card, 3, reviewDate);
    const resultEasy = scheduleReview(card, 4, reviewDate);
    expect(resultHard.state).toBe('review');
    expect(resultGood.state).toBe('review');
    expect(resultEasy.state).toBe('review');
  });

  it('should give Easy a higher stability than Good on repeat', () => {
    const card = makeReviewedCard(3);
    const reviewDate = daysFromNow(card.stability, BASE_DATE);
    const resultGood = scheduleReview(card, 3, reviewDate);
    const resultEasy = scheduleReview(card, 4, reviewDate);
    expect(resultEasy.stability).toBeGreaterThan(resultGood.stability);
  });

  it('should give Hard a lower stability than Good on repeat', () => {
    const card = makeReviewedCard(3);
    const reviewDate = daysFromNow(card.stability, BASE_DATE);
    const resultHard = scheduleReview(card, 2, reviewDate);
    const resultGood = scheduleReview(card, 3, reviewDate);
    expect(resultHard.stability).toBeLessThan(resultGood.stability);
  });

  it('should increase difficulty after an Again rating', () => {
    const card = makeReviewedCard(3); // starts at mid difficulty
    const initialDiff = card.difficulty;
    const reviewDate = daysFromNow(1, BASE_DATE);
    const result = scheduleReview(card, 1, reviewDate);
    expect(result.difficulty).toBeGreaterThan(initialDiff);
  });

  it('should decrease difficulty after an Easy rating', () => {
    const card = makeReviewedCard(1); // start with hard card (Again first review)
    const initialDiff = card.difficulty;
    const reviewDate = daysFromNow(1, BASE_DATE);
    const result = scheduleReview(card, 4, reviewDate);
    expect(result.difficulty).toBeLessThan(initialDiff);
  });

  it('should calculate retrievability based on elapsed time', () => {
    const card = makeReviewedCard(3);
    // Review immediately: high retrievability
    const immediateResult = scheduleReview(card, 3, BASE_DATE);
    // Review after a long time: lower retrievability
    const lateDate = daysFromNow(card.stability * 3, BASE_DATE);
    const lateResult = scheduleReview(card, 3, lateDate);
    expect(immediateResult.retrievability).toBeGreaterThan(lateResult.retrievability);
  });

  it('should keep difficulty within [1, 10] after many lapses', () => {
    let card: FsrsCard = createNewCard();
    let reviewDate = BASE_DATE;
    // Simulate 20 consecutive lapses
    for (let i = 0; i < 20; i++) {
      const result = scheduleReview(card, 1, reviewDate);
      card = applyScheduleResult(card, result, 1, reviewDate);
      reviewDate = daysFromNow(1, reviewDate);
      expect(card.difficulty).toBeGreaterThanOrEqual(1);
      expect(card.difficulty).toBeLessThanOrEqual(10);
    }
  });

  it('should keep difficulty within [1, 10] after many easy reviews', () => {
    let card: FsrsCard = createNewCard();
    let reviewDate = BASE_DATE;
    // Simulate 20 consecutive easy reviews
    for (let i = 0; i < 20; i++) {
      const result = scheduleReview(card, 4, reviewDate);
      card = applyScheduleResult(card, result, 4, reviewDate);
      reviewDate = daysFromNow(result.interval, reviewDate);
      expect(card.difficulty).toBeGreaterThanOrEqual(1);
      expect(card.difficulty).toBeLessThanOrEqual(10);
    }
  });
});

// ============================================================================
// applyScheduleResult
// ============================================================================

describe('applyScheduleResult', () => {
  it('should increment reviewCount by 1', () => {
    const card = createNewCard();
    const result = scheduleReview(card, 3, BASE_DATE);
    const updated = applyScheduleResult(card, result, 3, BASE_DATE);
    expect(updated.reviewCount).toBe(1);
  });

  it('should increment lapseCount on Again rating', () => {
    const card = createNewCard();
    const result = scheduleReview(card, 1, BASE_DATE);
    const updated = applyScheduleResult(card, result, 1, BASE_DATE);
    expect(updated.lapseCount).toBe(1);
  });

  it('should not increment lapseCount on non-Again ratings', () => {
    const card = createNewCard();
    const ratings: FsrsRating[] = [2, 3, 4];
    for (const rating of ratings) {
      const result = scheduleReview(card, rating, BASE_DATE);
      const updated = applyScheduleResult(card, result, rating, BASE_DATE);
      expect(updated.lapseCount).toBe(0);
    }
  });

  it('should set lastReview to the provided now date', () => {
    const card = createNewCard();
    const result = scheduleReview(card, 3, BASE_DATE);
    const updated = applyScheduleResult(card, result, 3, BASE_DATE);
    expect(updated.lastReview).toEqual(BASE_DATE);
  });

  it('should not mutate the original card', () => {
    const card = createNewCard();
    const originalCount = card.reviewCount;
    const result = scheduleReview(card, 3, BASE_DATE);
    applyScheduleResult(card, result, 3, BASE_DATE);
    expect(card.reviewCount).toBe(originalCount);
  });

  it('should apply stability and difficulty from schedule result', () => {
    const card = createNewCard();
    const result = scheduleReview(card, 3, BASE_DATE);
    const updated = applyScheduleResult(card, result, 3, BASE_DATE);
    expect(updated.stability).toBe(result.stability);
    expect(updated.difficulty).toBe(result.difficulty);
  });
});

// ============================================================================
// calculateRetrievability
// ============================================================================

describe('calculateRetrievability', () => {
  it('should return 1 when elapsed days is 0', () => {
    const r = calculateRetrievability(0, 10);
    expect(r).toBeCloseTo(1, 5);
  });

  it('should return approximately target retention at t = stability days', () => {
    // At t = S, R should equal ~0.9 (the target retention built into the formula)
    // R(S, S) = (1 + 19/81)^(-0.5) ≈ 0.9
    const stability = 10;
    const r = calculateRetrievability(stability, stability);
    expect(r).toBeCloseTo(0.9, 1);
  });

  it('should decrease as elapsed days increase', () => {
    const stability = 10;
    const r1 = calculateRetrievability(1, stability);
    const r5 = calculateRetrievability(5, stability);
    const r10 = calculateRetrievability(10, stability);
    const r20 = calculateRetrievability(20, stability);

    expect(r1).toBeGreaterThan(r5);
    expect(r5).toBeGreaterThan(r10);
    expect(r10).toBeGreaterThan(r20);
  });

  it('should always be in range [0, 1]', () => {
    const testCases = [
      { elapsed: 0, s: 1 },
      { elapsed: 100, s: 1 },
      { elapsed: 1, s: 1000 },
      { elapsed: 365, s: 30 },
    ];
    for (const { elapsed, s } of testCases) {
      const r = calculateRetrievability(elapsed, s);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(1);
    }
  });

  it('should give higher retrievability for larger stability at same elapsed time', () => {
    const elapsed = 5;
    const r_low  = calculateRetrievability(elapsed, 5);
    const r_high = calculateRetrievability(elapsed, 20);
    expect(r_high).toBeGreaterThan(r_low);
  });
});

// ============================================================================
// getCurrentRetrievability
// ============================================================================

describe('getCurrentRetrievability', () => {
  it('should return 1 for new card', () => {
    const card = createNewCard();
    expect(getCurrentRetrievability(card, BASE_DATE)).toBe(1);
  });

  it('should return 1 for card with no last review', () => {
    const card: FsrsCard = { ...createNewCard(), state: 'review', stability: 10 };
    expect(getCurrentRetrievability(card, BASE_DATE)).toBe(1);
  });

  it('should return decreasing retrievability over time', () => {
    const card = createNewCard();
    const first = scheduleReview(card, 3, BASE_DATE);
    const reviewedCard = applyScheduleResult(card, first, 3, BASE_DATE);

    const r1 = getCurrentRetrievability(reviewedCard, daysFromNow(1, BASE_DATE));
    const r5 = getCurrentRetrievability(reviewedCard, daysFromNow(5, BASE_DATE));
    expect(r1).toBeGreaterThan(r5);
  });
});

// ============================================================================
// nextInterval
// ============================================================================

describe('nextInterval', () => {
  it('should return at least 1 day', () => {
    expect(nextInterval(0.1, 0.9)).toBeGreaterThanOrEqual(1);
    expect(nextInterval(0, 0.9)).toBeGreaterThanOrEqual(1);
  });

  it('should increase with higher stability', () => {
    const i5  = nextInterval(5, 0.9);
    const i10 = nextInterval(10, 0.9);
    const i30 = nextInterval(30, 0.9);
    expect(i10).toBeGreaterThan(i5);
    expect(i30).toBeGreaterThan(i10);
  });

  it('should equal stability at default 90% retention target', () => {
    // At target retention = 0.9, interval should ≈ stability
    const stability = 15;
    const interval = nextInterval(stability, DEFAULT_TARGET_RETENTION);
    // interval should be close to stability (within 1 day due to rounding)
    expect(Math.abs(interval - stability)).toBeLessThanOrEqual(1);
  });

  it('should be shorter with higher target retention', () => {
    const stability = 10;
    const i_90 = nextInterval(stability, 0.9);
    const i_95 = nextInterval(stability, 0.95);
    expect(i_90).toBeGreaterThan(i_95);
  });

  it('should return an integer number of days', () => {
    const interval = nextInterval(7, 0.9);
    expect(interval).toBe(Math.round(interval));
  });
});

// ============================================================================
// isCardDue
// ============================================================================

describe('isCardDue', () => {
  it('should always return true for new cards', () => {
    const card = createNewCard();
    const futureDate = daysFromNow(100, BASE_DATE);
    expect(isCardDue(card, futureDate, BASE_DATE)).toBe(true);
  });

  it('should return true when now >= dueDate', () => {
    const card: FsrsCard = { ...createNewCard(), state: 'review' };
    const dueDate = BASE_DATE;
    const now = daysFromNow(1, BASE_DATE);
    expect(isCardDue(card, dueDate, now)).toBe(true);
  });

  it('should return false when now < dueDate', () => {
    const card: FsrsCard = { ...createNewCard(), state: 'review' };
    const dueDate = daysFromNow(5, BASE_DATE);
    const now = BASE_DATE;
    expect(isCardDue(card, dueDate, now)).toBe(false);
  });
});

// ============================================================================
// Integration: full review cycle
// ============================================================================

describe('Full review cycle integration', () => {
  it('should grow stability over multiple successful reviews', () => {
    let card = createNewCard();
    let reviewDate = BASE_DATE;
    const stabilityHistory: number[] = [];

    // Simulate 5 Good reviews
    for (let i = 0; i < 5; i++) {
      const result = scheduleReview(card, 3, reviewDate);
      stabilityHistory.push(result.stability);
      card = applyScheduleResult(card, result, 3, reviewDate);
      reviewDate = daysFromNow(result.interval, reviewDate);
    }

    // Stability should generally grow with each review
    for (let i = 1; i < stabilityHistory.length; i++) {
      expect(stabilityHistory[i]).toBeGreaterThan(stabilityHistory[i - 1]);
    }
  });

  it('should track lapse count correctly over mixed reviews', () => {
    let card = createNewCard();
    let reviewDate = BASE_DATE;

    // Good
    let result = scheduleReview(card, 3, reviewDate);
    card = applyScheduleResult(card, result, 3, reviewDate);
    reviewDate = daysFromNow(1, reviewDate);
    expect(card.lapseCount).toBe(0);

    // Again (lapse)
    result = scheduleReview(card, 1, reviewDate);
    card = applyScheduleResult(card, result, 1, reviewDate);
    reviewDate = daysFromNow(1, reviewDate);
    expect(card.lapseCount).toBe(1);

    // Good (recovery)
    result = scheduleReview(card, 3, reviewDate);
    card = applyScheduleResult(card, result, 3, reviewDate);
    reviewDate = daysFromNow(1, reviewDate);
    expect(card.lapseCount).toBe(1);
    expect(card.reviewCount).toBe(3);
  });

  it('should respect DEFAULT_FSRS_WEIGHTS structure', () => {
    expect(DEFAULT_FSRS_WEIGHTS.w).toHaveLength(19);
    for (const weight of DEFAULT_FSRS_WEIGHTS.w) {
      expect(typeof weight).toBe('number');
      expect(Number.isFinite(weight)).toBe(true);
    }
  });

  it('should work with custom weights', () => {
    const customWeights = {
      w: [
        0.5, 1.5, 3.5, 16.0,
        7.5, 0.5, 1.0, 0.0,
        1.5, 0.1, 1.0, 2.0,
        0.1, 0.3, 2.0, 0.2,
        3.0, 0.5, 0.6,
      ] as const,
    };
    const card = createNewCard();
    const result = scheduleReview(card, 3, BASE_DATE, customWeights);
    expect(result.stability).toBeGreaterThan(0);
    expect(result.interval).toBeGreaterThanOrEqual(1);
  });
});
