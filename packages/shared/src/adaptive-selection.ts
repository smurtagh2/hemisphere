/**
 * Rule-based adaptive topic/item selection for difficulty levels 1-2.
 *
 * This module implements MVP adaptive selection logic that uses the learner's
 * FSRS memory states to decide which items to present, in what order, and
 * whether to advance the learner to the next difficulty level.
 *
 * Difficulty levels:
 *   Level 1 – Conservative introduction. Only add new items when the learner
 *              has fewer than 3 items in learning. Prioritise existing reviews.
 *              Session cap: 5 items.
 *
 *   Level 2 – Accelerated pace. Up to 5 new items per session. Mix of reviews
 *              and new items at a 60/40 ratio. Unlocked when the average
 *              retrievability across all level-1 items exceeds 0.7.
 *
 * Scoring formula (higher score = higher priority):
 *   score = overdueBonus + lowRetrievabilityBoost + newItemBaseScore
 *
 *   overdueBonus           = overdueDays * 10
 *   lowRetrievabilityBoost = (1 - retrievability) * 5
 *   newItemBaseScore       = 1   (for items that have never been reviewed)
 *
 * The resulting score is recorded in SelectedItem.priorityScore so callers
 * can inspect or re-sort if needed.
 */

import { getCurrentRetrievability, type FsrsCard } from './fsrs';

// ============================================================================
// Public types
// ============================================================================

export type DifficultyLevel = 1 | 2;

/**
 * A single content item eligible for adaptive selection.
 *
 * Each item must carry the KC it belongs to so we can look up its FSRS
 * memory state.
 */
export interface TopicItem {
  itemId: string;
  kcId: string;
  topicId: string;
}

/**
 * A topic along with its content items.
 */
export interface TopicWithItems {
  topicId: string;
  items: TopicItem[];
}

/**
 * Input to the adaptive selection function.
 */
export interface AdaptiveSelectionInput {
  userId: string;
  availableTopics: TopicWithItems[];
  /** Map from itemId to the learner's current FSRS card state for that item. */
  memoryStates: Map<string, FsrsCard>;
  currentLevel: DifficultyLevel;
  /** Override for "now". Defaults to new Date() when omitted. */
  now?: Date;
}

/**
 * Reason a particular item was selected.
 *
 * new_item          – never been reviewed before
 * due_review        – scheduled review that is now past due
 * struggling        – low retrievability (<= 0.5) indicating difficulty
 * ready_to_advance  – high retrievability, selected to fill level-2 sessions
 */
export type SelectionReason = 'new_item' | 'due_review' | 'struggling' | 'ready_to_advance';

export interface SelectedItem {
  itemId: string;
  kcId: string;
  topicId: string;
  priorityScore: number;
  reason: SelectionReason;
}

export interface AdaptiveSelectionResult {
  selectedItems: SelectedItem[];
  nextLevel: DifficultyLevel;
  rationale: string;
}

// ============================================================================
// Constants
// ============================================================================

/** Level 1: maximum session size. */
const LEVEL_1_MAX_SESSION = 5;

/** Level 1: maximum number of items currently in the 'learning' state before
 *  new items are no longer introduced. */
const LEVEL_1_MAX_LEARNING = 3;

/** Level 2: maximum new items per session. */
const LEVEL_2_MAX_NEW = 5;

/** Level 2: target ratio of reviews to total items (0.6 = 60 % reviews). */
const LEVEL_2_REVIEW_RATIO = 0.6;

/** Threshold for advancing from level 1 to level 2. */
const LEVEL_UP_RETRIEVABILITY_THRESHOLD = 0.7;

/** Score weights. */
const OVERDUE_WEIGHT = 10;
const LOW_RETRIEVABILITY_WEIGHT = 5;
const NEW_ITEM_BASE_SCORE = 1;

// ============================================================================
// Internal helpers
// ============================================================================

/**
 * Compute the priority score for a single item.
 *
 * score = (overdueDays * OVERDUE_WEIGHT)
 *       + ((1 - retrievability) * LOW_RETRIEVABILITY_WEIGHT)
 *       + (isNew ? NEW_ITEM_BASE_SCORE : 0)
 */
function computeScore(card: FsrsCard | undefined, overdueDays: number): number {
  if (!card || card.state === 'new') {
    // Brand-new item: base score only, no retrievability data available.
    return NEW_ITEM_BASE_SCORE;
  }

  const retrievability = card.retrievability;
  const overdueBonus = overdueDays * OVERDUE_WEIGHT;
  const lowRetrievabilityBoost = (1 - retrievability) * LOW_RETRIEVABILITY_WEIGHT;

  return overdueBonus + lowRetrievabilityBoost;
}

/**
 * Determine the selection reason for an item.
 */
function computeReason(card: FsrsCard | undefined, overdueDays: number): SelectionReason {
  if (!card || card.state === 'new') {
    return 'new_item';
  }
  if (card.retrievability <= 0.5) {
    return 'struggling';
  }
  if (overdueDays > 0) {
    return 'due_review';
  }
  return 'ready_to_advance';
}

// ============================================================================
// Core interface
// ============================================================================

/**
 * Select the next set of items for a learner session.
 *
 * The function applies rule-based logic for difficulty levels 1 and 2 to
 * produce an ordered list of items together with a suggested next level and a
 * human-readable rationale string.
 */
export function selectNextItems(input: AdaptiveSelectionInput): AdaptiveSelectionResult {
  const { availableTopics, memoryStates, currentLevel } = input;
  const now = input.now ?? new Date();

  // ── Flatten all available items ──────────────────────────────────────────
  const allItems: TopicItem[] = availableTopics.flatMap((t) => t.items);

  // ── Categorise items ─────────────────────────────────────────────────────
  const newItems: TopicItem[] = [];
  const reviewItems: TopicItem[] = [];
  const learningItems: TopicItem[] = [];

  for (const item of allItems) {
    const card = memoryStates.get(item.itemId);
    if (!card || card.state === 'new') {
      newItems.push(item);
    } else if (card.state === 'learning' || card.state === 'relearning') {
      learningItems.push(item);
    } else {
      // 'review' state
      reviewItems.push(item);
    }
  }

  // ── Compute overdue days for each reviewed item ──────────────────────────
  function getOverdueDays(item: TopicItem): number {
    const card = memoryStates.get(item.itemId);
    if (!card || card.state === 'new' || card.lastReview === null) {
      return 0;
    }
    const elapsedDays = (now.getTime() - card.lastReview.getTime()) / (1000 * 60 * 60 * 24);
    const currentR = getCurrentRetrievability(card, now);
    // If retrievability has dropped below target (0.9), calculate overdue days
    return currentR < 0.9 ? Math.max(0, elapsedDays - card.stability) : 0;
  }

  // ── Build scored entries for all categories ──────────────────────────────
  type ScoredItem = {
    item: TopicItem;
    score: number;
    reason: SelectionReason;
    overdueDays: number;
  };

  function scoreItem(item: TopicItem): ScoredItem {
    const card = memoryStates.get(item.itemId);
    const overdueDays = getOverdueDays(item);
    const score = computeScore(card, overdueDays);
    const reason = computeReason(card, overdueDays);
    return { item, score, reason, overdueDays };
  }

  // ── Sort review + learning items by priority score (descending) ──────────
  const scoredReview = reviewItems.map(scoreItem).sort((a, b) => b.score - a.score);
  const scoredLearning = learningItems.map(scoreItem).sort((a, b) => b.score - a.score);
  const scoredNew = newItems.map(scoreItem);

  // ── Check level-up eligibility ───────────────────────────────────────────
  // Level 2 is unlocked when average retrievability across ALL items that
  // have been seen at level 1 (learning + review state) exceeds the threshold.
  const seenItems = [...learningItems, ...reviewItems];
  let avgRetrievability: number | null = null;

  if (seenItems.length > 0) {
    const totalR = seenItems.reduce((acc, item) => {
      const card = memoryStates.get(item.itemId);
      return acc + (card ? getCurrentRetrievability(card, now) : 1);
    }, 0);
    avgRetrievability = totalR / seenItems.length;
  }

  const eligibleForLevel2 =
    avgRetrievability !== null && avgRetrievability > LEVEL_UP_RETRIEVABILITY_THRESHOLD;

  const nextLevel: DifficultyLevel =
    currentLevel === 1 && eligibleForLevel2 ? 2 : currentLevel;

  // ── Apply level-specific selection rules ─────────────────────────────────
  const selected: SelectedItem[] = [];

  if (currentLevel === 1) {
    // --- Level 1 rules ---
    //
    // 1. Always prioritise items in learning/relearning and due reviews.
    // 2. Only introduce new items when learning count < LEVEL_1_MAX_LEARNING.
    // 3. Hard cap: LEVEL_1_MAX_SESSION items total.

    // Add learning + review items first (learning items have higher urgency as
    // they represent in-progress consolidation). Sort all by priority score.
    const allExistingSorted: ScoredItem[] = [...scoredLearning, ...scoredReview].sort(
      (a, b) => b.score - a.score
    );

    for (const { item, score, reason } of allExistingSorted) {
      if (selected.length >= LEVEL_1_MAX_SESSION) break;
      selected.push({
        itemId: item.itemId,
        kcId: item.kcId,
        topicId: item.topicId,
        priorityScore: score,
        reason,
      });
    }

    // Add new items only if the learner has room in their learning queue
    if (learningItems.length < LEVEL_1_MAX_LEARNING && selected.length < LEVEL_1_MAX_SESSION) {
      const newSlots = Math.min(
        LEVEL_1_MAX_LEARNING - learningItems.length,
        LEVEL_1_MAX_SESSION - selected.length
      );

      for (const { item, score, reason } of scoredNew.slice(0, newSlots)) {
        selected.push({
          itemId: item.itemId,
          kcId: item.kcId,
          topicId: item.topicId,
          priorityScore: score,
          reason,
        });
      }
    }

    const rationaleFragments: string[] = [
      `Level 1: selected ${selected.length} item(s) (max ${LEVEL_1_MAX_SESSION}).`,
    ];
    if (learningItems.length >= LEVEL_1_MAX_LEARNING) {
      rationaleFragments.push(
        `No new items introduced: ${learningItems.length} item(s) already in learning (limit ${LEVEL_1_MAX_LEARNING}).`
      );
    }
    if (eligibleForLevel2) {
      rationaleFragments.push(
        `Average retrievability ${avgRetrievability!.toFixed(2)} exceeds ${LEVEL_UP_RETRIEVABILITY_THRESHOLD} — advancing to level 2 next session.`
      );
    }

    return {
      selectedItems: selected,
      nextLevel,
      rationale: rationaleFragments.join(' '),
    };
  }

  // --- Level 2 rules ---
  //
  // Mix reviews and new items at a 60/40 ratio.
  // Up to LEVEL_2_MAX_NEW new items per session.
  // Total session size is uncapped by level rules (caller may cap externally).

  const totalReviewAndLearning = scoredReview.length + scoredLearning.length;
  const newSlots = Math.min(LEVEL_2_MAX_NEW, scoredNew.length);

  // Derive review target from ratio: reviewTarget / (reviewTarget + newSlots) = LEVEL_2_REVIEW_RATIO
  // => reviewTarget = newSlots * LEVEL_2_REVIEW_RATIO / (1 - LEVEL_2_REVIEW_RATIO)
  const reviewTarget =
    newSlots === 0
      ? totalReviewAndLearning
      : Math.round((newSlots * LEVEL_2_REVIEW_RATIO) / (1 - LEVEL_2_REVIEW_RATIO));

  const reviewsToTake = Math.min(reviewTarget, totalReviewAndLearning);

  // Collect review items (sorted by priority score)
  const allReviewSorted: ScoredItem[] = [...scoredLearning, ...scoredReview].sort(
    (a, b) => b.score - a.score
  );

  for (const { item, score, reason } of allReviewSorted.slice(0, reviewsToTake)) {
    selected.push({
      itemId: item.itemId,
      kcId: item.kcId,
      topicId: item.topicId,
      priorityScore: score,
      reason,
    });
  }

  // Collect new items
  for (const { item, score, reason } of scoredNew.slice(0, newSlots)) {
    selected.push({
      itemId: item.itemId,
      kcId: item.kcId,
      topicId: item.topicId,
      priorityScore: score,
      reason,
    });
  }

  const rationaleFragments: string[] = [
    `Level 2: selected ${selected.length} item(s) (${reviewsToTake} review(s), ${newSlots} new).`,
    `Target mix: ${Math.round(LEVEL_2_REVIEW_RATIO * 100)}% reviews / ${Math.round((1 - LEVEL_2_REVIEW_RATIO) * 100)}% new.`,
  ];

  return {
    selectedItems: selected,
    nextLevel,
    rationale: rationaleFragments.join(' '),
  };
}
