/**
 * Learner edge-case protocols: zombie item detection, remediation routing,
 * and fallback logic for cold-start / stuck / bored learners.
 *
 * These utilities are consumed by the adaptive session engine to handle
 * non-standard learning patterns that the main scoring pipeline doesn't
 * address.
 */

import { getCurrentRetrievability, type FsrsCard } from './fsrs';

// ============================================================================
// Zombie item detection (hemisphere-49o.3.7)
// ============================================================================

/** Minimum consecutive 'Again' ratings to be labelled a zombie. */
const ZOMBIE_CONSECUTIVE_FAILURES = 3;

/** Zombies never exceed this retrievability ceiling. */
const ZOMBIE_MAX_RETRIEVABILITY = 0.4;

/** Items with this many consecutive failures are flagged 'at risk'. */
const AT_RISK_CONSECUTIVE_FAILURES = 2;

export interface ZombieItem {
  itemId: string;
  kcId: string;
  /** Number of consecutive 'Again' (rating 1) responses. */
  consecutiveFailures: number;
  /** Current retrievability at detection time. */
  avgRetrievability: number;
  lastSeen: Date;
}

export interface ZombieDetectionInput {
  memoryStates: Map<string, FsrsCard>;
  /** Map from itemId → number of consecutive 'Again' ratings. */
  consecutiveAgainCounts: Map<string, number>;
  items: Array<{ itemId: string; kcId: string }>;
  now?: Date;
}

export interface ZombieDetectionResult {
  zombies: ZombieItem[];
  /** Items approaching the zombie threshold (≥ AT_RISK_CONSECUTIVE_FAILURES). */
  atRisk: ZombieItem[];
}

/**
 * Detect items that a learner chronically misses.
 *
 * An item is a zombie when:
 *   - consecutiveAgainCounts ≥ ZOMBIE_CONSECUTIVE_FAILURES, AND
 *   - current retrievability ≤ ZOMBIE_MAX_RETRIEVABILITY
 *
 * An item is at-risk when:
 *   - consecutiveAgainCounts ≥ AT_RISK_CONSECUTIVE_FAILURES (but below zombie threshold)
 */
export function detectZombieItems(input: ZombieDetectionInput): ZombieDetectionResult {
  const now = input.now ?? new Date();
  const zombies: ZombieItem[] = [];
  const atRisk: ZombieItem[] = [];

  for (const { itemId, kcId } of input.items) {
    const failures = input.consecutiveAgainCounts.get(itemId) ?? 0;
    if (failures < AT_RISK_CONSECUTIVE_FAILURES) continue;

    const card = input.memoryStates.get(itemId);
    const retrievability = card ? getCurrentRetrievability(card, now) : 1;
    const lastSeen = card?.lastReview ?? now;

    const entry: ZombieItem = {
      itemId,
      kcId,
      consecutiveFailures: failures,
      avgRetrievability: retrievability,
      lastSeen,
    };

    if (failures >= ZOMBIE_CONSECUTIVE_FAILURES && retrievability <= ZOMBIE_MAX_RETRIEVABILITY) {
      zombies.push(entry);
    } else {
      atRisk.push(entry);
    }
  }

  return { zombies, atRisk };
}

// ============================================================================
// Remediation routing (hemisphere-49o.3.7)
// ============================================================================

export type RemediationStrategy =
  | 'simplify'    // Route to easier sub-items or prerequisites
  | 'rest'        // Remove from rotation for N days
  | 'restructure' // Flag for content review (question may be poorly written)
  | 'retire';     // Permanently remove from learner's deck

export interface RemediationPlan {
  itemId: string;
  strategy: RemediationStrategy;
  /** Only set when strategy === 'rest'. */
  restDays?: number;
  reason: string;
}

/**
 * Choose a remediation strategy for a zombie item based on how many
 * consecutive times the learner has failed it.
 *
 *   3-4 failures  → rest (7 days) or simplify
 *   5-6 failures  → restructure (content may be flawed)
 *   7+  failures  → retire
 */
export function planRemediation(
  zombie: ZombieItem,
  consecutiveFailures: number
): RemediationPlan {
  if (consecutiveFailures >= 7) {
    return {
      itemId: zombie.itemId,
      strategy: 'retire',
      reason: `Item failed ${consecutiveFailures} times in a row with retrievability ${zombie.avgRetrievability.toFixed(2)}. Retiring from learner's deck.`,
    };
  }

  if (consecutiveFailures >= 5) {
    return {
      itemId: zombie.itemId,
      strategy: 'restructure',
      reason: `Item failed ${consecutiveFailures} consecutive times. Flagging for content review — question may be poorly worded or missing prerequisites.`,
    };
  }

  // 3-4 failures: prefer rest over simplify when retrievability is very low
  if (zombie.avgRetrievability < 0.2) {
    return {
      itemId: zombie.itemId,
      strategy: 'rest',
      restDays: 7,
      reason: `Very low retrievability (${zombie.avgRetrievability.toFixed(2)}) after ${consecutiveFailures} failures. Resting for 7 days.`,
    };
  }

  return {
    itemId: zombie.itemId,
    strategy: 'simplify',
    reason: `Item failed ${consecutiveFailures} times. Routing to simpler prerequisites or sub-items.`,
  };
}

// ============================================================================
// Edge-case learner protocols (hemisphere-49o.3.8)
// ============================================================================

export type LearnerProtocol = 'cold_start' | 'stuck' | 'bored' | 'normal';

export interface LearnerProtocolInput {
  memoryStates: Map<string, FsrsCard>;
  /** All item IDs the learner has ever been assigned. */
  allItemIds: string[];
  /** Total sessions completed. */
  sessionCount: number;
  /** Average score in the last 3 sessions (0..1), null if fewer than 3. */
  recentAverageScore: number | null;
  /** Average items per session in the last 3 sessions. */
  recentItemsPerSession: number | null;
  now?: Date;
}

export interface LearnerProtocolResult {
  protocol: LearnerProtocol;
  reason: string;
  /** cold_start: how many new items to introduce this session. */
  coldStartItemBudget?: number;
  /** stuck: how many days to back off review pressure. */
  stuckBackoffDays?: number;
  /** bored: inject novel/challenge items to re-engage. */
  boredShouldInjectChallenge?: boolean;
}

/** Threshold: fewer sessions than this → cold start. */
const COLD_START_MIN_SESSIONS = 3;

/** Threshold: average score below this is 'struggling'. */
const STUCK_SCORE_THRESHOLD = 0.5;

/** Threshold: average items per session below this is 'low engagement'. */
const STUCK_ITEMS_THRESHOLD = 5;

/** Threshold: average score above this is 'doing well'. */
const BORED_SCORE_THRESHOLD = 0.85;

/** Threshold: items per session above this is 'high engagement'. */
const BORED_ITEMS_THRESHOLD = 15;

/**
 * Classify the learner's current state and return a protocol with
 * fallback parameters for the adaptive engine to act on.
 *
 * Priority order (checked in sequence):
 *   1. cold_start
 *   2. stuck
 *   3. bored
 *   4. normal
 */
export function detectLearnerProtocol(input: LearnerProtocolInput): LearnerProtocolResult {
  // ── Cold start ────────────────────────────────────────────────────────────
  const allUnseen = input.allItemIds.every((id) => {
    const card = input.memoryStates.get(id);
    return !card || card.state === 'new';
  });

  if (input.sessionCount < COLD_START_MIN_SESSIONS || allUnseen) {
    return {
      protocol: 'cold_start',
      reason:
        input.sessionCount < COLD_START_MIN_SESSIONS
          ? `Only ${input.sessionCount} session(s) completed — using conservative cold-start introduction.`
          : 'All assigned items are unseen — starting fresh with a conservative introduction.',
      coldStartItemBudget: 3,
    };
  }

  // ── Stuck learner ─────────────────────────────────────────────────────────
  if (
    input.recentAverageScore !== null &&
    input.recentAverageScore < STUCK_SCORE_THRESHOLD &&
    input.recentItemsPerSession !== null &&
    input.recentItemsPerSession < STUCK_ITEMS_THRESHOLD
  ) {
    return {
      protocol: 'stuck',
      reason: `Recent average score ${input.recentAverageScore.toFixed(2)} < ${STUCK_SCORE_THRESHOLD} and only ${input.recentItemsPerSession.toFixed(1)} items/session — learner appears stuck.`,
      stuckBackoffDays: 3,
    };
  }

  // ── Bored learner ─────────────────────────────────────────────────────────
  if (
    input.recentAverageScore !== null &&
    input.recentAverageScore > BORED_SCORE_THRESHOLD &&
    input.recentItemsPerSession !== null &&
    input.recentItemsPerSession > BORED_ITEMS_THRESHOLD
  ) {
    return {
      protocol: 'bored',
      reason: `Recent average score ${input.recentAverageScore.toFixed(2)} > ${BORED_SCORE_THRESHOLD} across ${input.recentItemsPerSession.toFixed(1)} items/session — learner may be under-challenged.`,
      boredShouldInjectChallenge: true,
    };
  }

  // ── Normal ────────────────────────────────────────────────────────────────
  return {
    protocol: 'normal',
    reason: 'Learning pattern is within normal parameters.',
  };
}
