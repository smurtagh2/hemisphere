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
import {
  getStageBalanceForLoop,
  type SessionLoopType,
  type SessionStageBalance,
} from './session-state-machine';

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

// ============================================================================
// Full adaptive engine (Phase 3)
// ============================================================================

export type AdaptiveDifficultyLevel = 1 | 2 | 3 | 4;

export interface AdaptiveSessionItem {
  itemId: string;
  kcId: string;
  topicId: string;
  stage: 'encounter' | 'analysis' | 'return';
  difficultyLevel: number;
  interleaveEligible: boolean;
  isReviewable: boolean;
  similarityTags?: string[];
}

export interface AdaptiveSessionTopic {
  topicId: string;
  items: AdaptiveSessionItem[];
}

export interface AdaptiveSessionPlanInput {
  primaryTopicId: string;
  availableTopics: AdaptiveSessionTopic[];
  memoryStates: Map<string, FsrsCard>;
  currentLevel: AdaptiveDifficultyLevel;
  sessionType: SessionLoopType;
  hemisphereBalanceScore: number; // -1 (LH) .. +1 (RH)
  analysisItemBudget?: number;
  now?: Date;
}

export type AdaptivePlanReason =
  | 'overdue_review'
  | 'due_review'
  | 'new_primary'
  | 'interleaved_related'
  | 'fill';

export interface AdaptivePlannedItem {
  itemId: string;
  topicId: string;
  kcId: string;
  reason: AdaptivePlanReason;
  isInterleaved: boolean;
  retrievability: number;
  priorityScore: number;
}

export interface AdaptiveSessionPlan {
  level: AdaptiveDifficultyLevel;
  nextLevel: AdaptiveDifficultyLevel;
  stageBalance: SessionStageBalance;
  selectedItems: AdaptivePlannedItem[];
  rationale: string;
}

const REVIEW_RATIO_BY_LEVEL: Record<AdaptiveDifficultyLevel, number> = {
  1: 0.7,
  2: 0.6,
  3: 0.55,
  4: 0.5,
};

const INTERLEAVE_RATIO_BY_LEVEL: Record<AdaptiveDifficultyLevel, number> = {
  1: 0.1,
  2: 0.2,
  3: 0.25,
  4: 0.35,
};

const NEXT_LEVEL_RETRIEVABILITY_THRESHOLD: Record<1 | 2 | 3, number> = {
  1: 0.72,
  2: 0.8,
  3: 0.86,
};

function clampLevel(level: number): AdaptiveDifficultyLevel {
  if (level <= 1) return 1;
  if (level >= 4) return 4;
  return Math.round(level) as AdaptiveDifficultyLevel;
}

function clamp01(value: number): number {
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

function clampSigned(value: number): number {
  if (value <= -1) return -1;
  if (value >= 1) return 1;
  return value;
}

function overlapScore(a: string[] | undefined, b: Set<string>): number {
  if (!a || a.length === 0 || b.size === 0) return 0;
  let overlap = 0;
  for (const tag of a) {
    if (b.has(tag)) overlap++;
  }
  return overlap / Math.max(a.length, b.size);
}

function buildPrimaryTagSet(primaryTopicId: string, topics: AdaptiveSessionTopic[]): Set<string> {
  const tags = new Set<string>();
  for (const topic of topics) {
    if (topic.topicId !== primaryTopicId) continue;
    for (const item of topic.items) {
      for (const tag of item.similarityTags ?? []) {
        tags.add(tag);
      }
    }
  }
  return tags;
}

function getAnalysisBudget(
  sessionType: SessionLoopType,
  explicitBudget?: number
): number {
  if (explicitBudget && explicitBudget > 0) return Math.floor(explicitBudget);
  if (sessionType === 'quick') return 8;
  if (sessionType === 'extended') return 28;
  return 16;
}

function getStageBalanceWithHbs(
  loopType: SessionLoopType,
  hbsRaw: number
): SessionStageBalance {
  if (loopType === 'quick') {
    return getStageBalanceForLoop('quick');
  }

  const hbs = clampSigned(hbsRaw);
  if (hbs < -0.3) {
    return { encounter: 0.3, analysis: 0.4, return: 0.3 };
  }
  if (hbs < -0.1) {
    return { encounter: 0.27, analysis: 0.46, return: 0.27 };
  }
  if (hbs <= 0.1) {
    return getStageBalanceForLoop(loopType);
  }
  if (hbs <= 0.3) {
    return { encounter: 0.22, analysis: 0.56, return: 0.22 };
  }
  return { encounter: 0.2, analysis: 0.6, return: 0.2 };
}

export function planAdaptiveSession(input: AdaptiveSessionPlanInput): AdaptiveSessionPlan {
  const now = input.now ?? new Date();
  const level = clampLevel(input.currentLevel);
  const stageBalance = getStageBalanceWithHbs(
    input.sessionType,
    input.hemisphereBalanceScore
  );
  const analysisBudget = getAnalysisBudget(input.sessionType, input.analysisItemBudget);
  const reviewTarget = Math.max(0, Math.round(analysisBudget * REVIEW_RATIO_BY_LEVEL[level]));

  let interleaveRatio = INTERLEAVE_RATIO_BY_LEVEL[level];
  if (input.sessionType === 'quick') interleaveRatio = Math.min(interleaveRatio, 0.15);
  if (input.sessionType === 'extended') interleaveRatio = Math.min(0.4, interleaveRatio + 0.05);
  const interleaveTarget = Math.max(0, Math.round(analysisBudget * interleaveRatio));

  const primaryTags = buildPrimaryTagSet(input.primaryTopicId, input.availableTopics);

  type Candidate = {
    item: AdaptiveSessionItem;
    topicId: string;
    isPrimary: boolean;
    isNew: boolean;
    isDue: boolean;
    isOverdue: boolean;
    retrievability: number;
    priorityScore: number;
    similarity: number;
  };

  const candidates: Candidate[] = [];
  for (const topic of input.availableTopics) {
    for (const item of topic.items) {
      if (item.stage !== 'analysis') continue;
      if (item.difficultyLevel > level) continue;

      const card = input.memoryStates.get(item.itemId);
      const isNew = !card || card.state === 'new';
      const retrievability = card ? getCurrentRetrievability(card, now) : 1;
      const isDue =
        !isNew &&
        (card.state === 'learning' ||
          card.state === 'relearning' ||
          retrievability < 0.9);
      const isOverdue = isDue && retrievability < 0.7;
      const similarity = overlapScore(item.similarityTags, primaryTags);
      const overdueBoost = isOverdue ? (0.7 - retrievability) * 100 : 0;
      const dueBoost = isDue ? (1 - retrievability) * 20 : 0;
      const noveltyPenalty = isNew ? -2 : 0;
      const interleaveBoost =
        topic.topicId !== input.primaryTopicId ? similarity * 8 : 0;

      candidates.push({
        item,
        topicId: topic.topicId,
        isPrimary: topic.topicId === input.primaryTopicId,
        isNew,
        isDue,
        isOverdue,
        retrievability,
        priorityScore: overdueBoost + dueBoost + interleaveBoost + noveltyPenalty,
        similarity,
      });
    }
  }

  const byPriority = [...candidates].sort((a, b) => b.priorityScore - a.priorityScore);
  const overdue = byPriority.filter((c) => c.isOverdue);
  const due = byPriority.filter((c) => c.isDue && !c.isOverdue);
  const newPrimary = byPriority.filter((c) => c.isNew && c.isPrimary);
  const relatedInterleave = byPriority.filter(
    (c) =>
      !c.isPrimary &&
      c.item.interleaveEligible &&
      c.similarity >= 0.5 &&
      // no cold topics: only interleave related items that have been seen
      !c.isNew
  );
  const fallbackPool = byPriority.filter((c) => !c.isOverdue && !c.isDue);

  const selected = new Map<string, AdaptivePlannedItem>();

  function pushFrom(pool: Candidate[], count: number, reason: AdaptivePlanReason): number {
    if (count <= 0) return 0;
    let taken = 0;
    for (const c of pool) {
      if (taken >= count) break;
      if (selected.has(c.item.itemId)) continue;

      selected.set(c.item.itemId, {
        itemId: c.item.itemId,
        topicId: c.topicId,
        kcId: c.item.kcId,
        reason,
        isInterleaved: c.topicId !== input.primaryTopicId,
        retrievability: clamp01(c.retrievability),
        priorityScore: c.priorityScore,
      });
      taken++;
    }
    return taken;
  }

  const maxOverdueSlice = Math.round(analysisBudget * 0.25);
  pushFrom(overdue, Math.min(maxOverdueSlice, analysisBudget), 'overdue_review');
  const reviewsSelected = selected.size;
  pushFrom(due, Math.max(0, reviewTarget - reviewsSelected), 'due_review');
  pushFrom(newPrimary, Math.max(0, analysisBudget - selected.size - interleaveTarget), 'new_primary');
  pushFrom(relatedInterleave, Math.max(0, interleaveTarget), 'interleaved_related');
  pushFrom(fallbackPool, Math.max(0, analysisBudget - selected.size), 'fill');

  const selectedItems = [...selected.values()];

  // Keep interleaved items distributed through the queue.
  const interleaved = selectedItems.filter((item) => item.isInterleaved);
  const core = selectedItems.filter((item) => !item.isInterleaved);
  const ordered: AdaptivePlannedItem[] = [];
  if (interleaved.length === 0) {
    ordered.push(...selectedItems.sort((a, b) => b.priorityScore - a.priorityScore));
  } else {
    core.sort((a, b) => b.priorityScore - a.priorityScore);
    interleaved.sort((a, b) => b.priorityScore - a.priorityScore);
    const interval = Math.max(1, Math.floor(core.length / interleaved.length));
    let coreIdx = 0;
    let intIdx = 0;
    while (coreIdx < core.length || intIdx < interleaved.length) {
      for (let i = 0; i < interval && coreIdx < core.length; i++) {
        ordered.push(core[coreIdx++]);
      }
      if (intIdx < interleaved.length) {
        ordered.push(interleaved[intIdx++]);
      }
    }
  }

  // Promote level only when primary reviewed items show strong retention.
  const reviewedPrimary = candidates.filter(
    (c) => c.isPrimary && !c.isNew && Number.isFinite(c.retrievability)
  );
  const averagePrimaryRetrievability =
    reviewedPrimary.length > 0
      ? reviewedPrimary.reduce((acc, c) => acc + c.retrievability, 0) / reviewedPrimary.length
      : null;

  let nextLevel: AdaptiveDifficultyLevel = level;
  if (level < 4 && averagePrimaryRetrievability !== null) {
    const threshold = NEXT_LEVEL_RETRIEVABILITY_THRESHOLD[level as 1 | 2 | 3];
    if (averagePrimaryRetrievability >= threshold) {
      nextLevel = (level + 1) as AdaptiveDifficultyLevel;
    }
  }

  const rationale = [
    `Level ${level} plan with budget ${analysisBudget} (selected ${ordered.length}).`,
    `Stage balance E/A/R = ${stageBalance.encounter.toFixed(2)}/${stageBalance.analysis.toFixed(2)}/${stageBalance.return.toFixed(2)}.`,
    `Review target ${reviewTarget}, interleave target ${interleaveTarget}.`,
    `HBS ${clampSigned(input.hemisphereBalanceScore).toFixed(2)}.`,
    averagePrimaryRetrievability === null
      ? 'No reviewed primary items yet; keeping current level.'
      : `Primary retrievability ${averagePrimaryRetrievability.toFixed(2)} (next level ${nextLevel}).`,
  ].join(' ');

  return {
    level,
    nextLevel,
    stageBalance,
    selectedItems: ordered.slice(0, analysisBudget),
    rationale,
  };
}
