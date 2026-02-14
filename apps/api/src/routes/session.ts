import { Hono } from 'hono';
import { z } from 'zod';
import { db, schema } from '@hemisphere/db';
import { eq, and, desc, sql } from 'drizzle-orm';
import {
  sessionStateReducer,
  type SessionState,
  type SessionStage,
  type SessionLoopType,
  getSessionConfigForLoop,
  getStageBalanceForLoop,
  planAdaptiveSession,
  resolveSessionLoopType,
  scheduleHemisphereAwareReview,
  createNewCard,
  DEFAULT_FSRS_WEIGHTS,
  type AdaptiveDifficultyLevel,
  type AdaptiveSessionItem,
  type AdaptiveSessionTopic,
  type FsrsCard,
  type FsrsCardState,
  type FsrsRating,
  type FsrsWeights,
} from '@hemisphere/shared';
import { authMiddleware, type AppEnv } from '../middleware/auth.js';

export const sessionRoutes = new Hono<AppEnv>();

// ─── Validation ──────────────────────────────────────────────────────────────

const startSessionSchema = z.object({
  topicId: z.string().uuid('topicId must be a valid UUID'),
  sessionType: z.enum(['quick', 'standard', 'extended']).optional(),
});

const responseSchema = z.object({
  sessionId: z.string().uuid('sessionId must be a valid UUID'),
  itemId: z.string().uuid('itemId must be a valid UUID'),
  response: z.unknown(), // Arbitrary learner response (text, selection, object, etc.)
  responseType: z.enum([
    'multiple_choice',
    'free_text',
    'rating',
    'confidence',
    'drag_drop',
    'hotspot',
    'binary',
  ]),
  correct: z.boolean().nullable().optional(),
  ratingOrConfidence: z.number().int().min(1).max(5).nullable().optional(),
  latencyMs: z.number().int().min(0),
});

const completeSessionSchema = z.object({
  sessionId: z.string().uuid('sessionId must be a valid UUID'),
});

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Shape stored in sessions.adaptiveDecisions to track in-flight session
 * progress.  Created/populated by /start and consumed + mutated by /response.
 */
interface SessionProgress {
  sessionType?: SessionLoopType;
  itemQueue: string[]; // Ordered content-item IDs for the full session
  currentItemIndex: number; // 0-based index of the next item to serve
  currentStage: SessionStage; // Encounter | Analysis | Return
  encounterComplete: boolean;
  analysisComplete: boolean;
  returnComplete: boolean;
  // Sparse timing anchors (Unix ms) — used by state-machine guards
  startedAt: number;
  encounterStartedAt: number | null;
  analysisStartedAt: number | null;
  returnStartedAt: number | null;
  encounterDurationMs: number;
  analysisDurationMs: number;
  returnDurationMs: number;
  completedActivityIds: string[];
  pausedDurationMs: number;
  pausedAt: number | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Map a SessionProgress snapshot to the minimal SessionState required by the
 * shared state-machine reducer.
 */
function progressToState(
  sessionId: string,
  userId: string,
  topicId: string,
  progress: SessionProgress
): SessionState {
  return {
    sessionId,
    userId,
    topicId,
    status: 'in_progress',
    currentStage: progress.currentStage,
    startedAt: progress.startedAt,
    pausedAt: progress.pausedAt,
    completedAt: null,
    encounterStartedAt: progress.encounterStartedAt,
    analysisStartedAt: progress.analysisStartedAt,
    returnStartedAt: progress.returnStartedAt,
    totalDurationMs: 0,
    encounterDurationMs: progress.encounterDurationMs,
    analysisDurationMs: progress.analysisDurationMs,
    returnDurationMs: progress.returnDurationMs,
    pausedDurationMs: progress.pausedDurationMs,
    itemQueue: progress.itemQueue,
    currentItemIndex: progress.currentItemIndex,
    completedActivityIds: progress.completedActivityIds,
    encounterComplete: progress.encounterComplete,
    analysisComplete: progress.analysisComplete,
    returnComplete: progress.returnComplete,
    abandonedAtStage: null,
    abandonmentReason: null,
    sessionType: progress.sessionType ?? 'standard',
    plannedBalance: { newItemCount: 0, reviewItemCount: 0, interleavedCount: 0 },
  };
}

/** Extract a SessionProgress from a post-reducer SessionState. */
function stateToProgress(state: SessionState): SessionProgress {
  return {
    sessionType: resolveSessionLoopType(state.sessionType),
    itemQueue: state.itemQueue,
    currentItemIndex: state.currentItemIndex,
    currentStage: (state.currentStage ?? 'encounter') as SessionStage,
    encounterComplete: state.encounterComplete,
    analysisComplete: state.analysisComplete,
    returnComplete: state.returnComplete,
    startedAt: state.startedAt ?? Date.now(),
    encounterStartedAt: state.encounterStartedAt,
    analysisStartedAt: state.analysisStartedAt,
    returnStartedAt: state.returnStartedAt,
    encounterDurationMs: state.encounterDurationMs,
    analysisDurationMs: state.analysisDurationMs,
    returnDurationMs: state.returnDurationMs,
    completedActivityIds: state.completedActivityIds,
    pausedDurationMs: state.pausedDurationMs,
    pausedAt: state.pausedAt,
  };
}

type SessionStartItem = {
  id: string;
  itemType: string;
  stage: 'encounter' | 'analysis' | 'return';
  hemisphereMode: string;
  topicId: string;
  difficultyLevel: number;
  bloomLevel: string;
  estimatedDurationS: number;
  body: unknown;
  isReviewable: boolean;
  interleaveEligible: boolean;
  similarityTags: string[];
};

function isSessionStageValue(value: string): value is SessionStartItem['stage'] {
  return value === 'encounter' || value === 'analysis' || value === 'return';
}

function dedupeIds(ids: string[]): string[] {
  const seen = new Set<string>();
  return ids.filter((id) => {
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function clampAdaptiveLevel(level: number): AdaptiveDifficultyLevel {
  if (level <= 1) return 1;
  if (level >= 4) return 4;
  return Math.round(level) as AdaptiveDifficultyLevel;
}

function buildItemQueueForSessionType(
  sessionType: SessionLoopType,
  encounterIds: string[],
  analysisIds: string[],
  returnIds: string[],
  reflectionId: string | null
): string[] {
  if (sessionType !== 'quick') {
    return dedupeIds([...encounterIds, ...analysisIds, ...returnIds]);
  }

  // quick loop
  const quickQueue = dedupeIds([
    ...encounterIds.slice(0, 1),
    ...analysisIds,
    ...(reflectionId ? [reflectionId] : []),
  ]);

  return quickQueue;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function ewma(previous: number, next: number, alpha: number = 0.3): number {
  return previous * (1 - alpha) + next * alpha;
}

function pearsonCorrelation(xs: number[], ys: number[]): number {
  if (xs.length < 2 || ys.length < 2 || xs.length !== ys.length) return 0;

  const xMean = average(xs);
  const yMean = average(ys);

  let numerator = 0;
  let xVariance = 0;
  let yVariance = 0;

  for (let i = 0; i < xs.length; i += 1) {
    const xDiff = xs[i] - xMean;
    const yDiff = ys[i] - yMean;
    numerator += xDiff * yDiff;
    xVariance += xDiff * xDiff;
    yVariance += yDiff * yDiff;
  }

  const denominator = Math.sqrt(xVariance * yVariance);
  if (denominator === 0) return 0;
  return numerator / denominator;
}

function getPreferredSessionTime(timestamp: Date): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = timestamp.getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

function asNumberRecord(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      result[key] = raw;
    }
  }
  return result;
}

function asHistoryEntries(value: unknown): Array<{ date: string; value: number }> {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const maybeDate = (entry as { date?: unknown }).date;
      const maybeValue = (entry as { value?: unknown }).value;
      if (typeof maybeDate !== 'string' || typeof maybeValue !== 'number') {
        return null;
      }
      return { date: maybeDate, value: maybeValue };
    })
    .filter((entry): entry is { date: string; value: number } => entry !== null);
}

function asWeeklyEngagementHistory(value: unknown): Array<{ week: string; score: number }> {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const maybeWeek = (entry as { week?: unknown }).week;
      const maybeScore = (entry as { score?: unknown }).score;
      if (typeof maybeWeek !== 'string' || typeof maybeScore !== 'number') {
        return null;
      }
      return { week: maybeWeek, score: maybeScore };
    })
    .filter((entry): entry is { week: string; score: number } => entry !== null);
}

function getWeekStartIso(date: Date): string {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utc.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  utc.setUTCDate(utc.getUTCDate() + diff);
  return utc.toISOString().slice(0, 10);
}

// ─── GET /active ──────────────────────────────────────────────────────────────

/**
 * GET /api/session/active
 *
 * Returns the resumable state for any in_progress session belonging to the
 * authenticated user.  This is the recovery endpoint — the frontend calls it
 * on mount (or after a page refresh / network interruption) to determine
 * whether there is an unfinished session to resume rather than starting a new
 * one from scratch.
 *
 * Response (200) when an active session exists:
 *   {
 *     active:            true,
 *     sessionId:         string (UUID),
 *     topicId:           string (UUID),
 *     stage:             "encounter" | "analysis" | "return",
 *     currentItemIndex:  number,
 *     startedAt:         number (Unix ms),
 *     items: Array<{
 *       id:                  string,
 *       itemType:            string,
 *       stage:               string,
 *       hemisphereMode:      string,
 *       difficultyLevel:     number,
 *       bloomLevel:          string,
 *       estimatedDurationS:  number,
 *       body:                unknown,
 *     }>
 *   }
 *
 * Response (404) when no active session:
 *   { active: false }
 *
 * Errors:
 *   500 – unexpected server error
 */
sessionRoutes.get('/active', authMiddleware, async (c) => {
  const user = c.get('user');

  try {
    // ── 1. Find the most-recently-started in_progress session for this user ──
    const [session] = await db
      .select()
      .from(schema.sessions)
      .where(
        and(
          eq(schema.sessions.userId, user.id),
          eq(schema.sessions.status, 'in_progress')
        )
      )
      .orderBy(sql`${schema.sessions.startedAt} DESC`)
      .limit(1);

    if (!session) {
      return c.json({ active: false }, 404);
    }

    // ── 2. Extract session progress from adaptiveDecisions ───────────────────
    const rawDecisions = session.adaptiveDecisions as unknown;
    if (!rawDecisions || typeof rawDecisions !== 'object') {
      return c.json(
        {
          error: 'Internal Server Error',
          message: 'Active session has no progress state',
        },
        500
      );
    }

    const sessionType = resolveSessionLoopType(
      typeof session.sessionType === 'string' ? session.sessionType : null
    );
    const progress = {
      ...(rawDecisions as SessionProgress),
      sessionType,
    } satisfies SessionProgress;

    if (
      !Array.isArray(progress.itemQueue) ||
      typeof progress.currentItemIndex !== 'number' ||
      !progress.currentStage
    ) {
      return c.json(
        { error: 'Internal Server Error', message: 'Session progress state is malformed' },
        500
      );
    }

    // ── 3. Fetch full item details for every item in the queue ───────────────
    //
    // We fetch all items in the queue (not just remaining ones) so the frontend
    // has the complete picture for progress indicators and any look-ahead
    // rendering.  Items are returned in queue order.
    const itemIds = progress.itemQueue;

    let items: Array<{
      id: string;
      itemType: string;
      stage: string;
      hemisphereMode: string;
      difficultyLevel: number;
      bloomLevel: string;
      estimatedDurationS: number;
      body: unknown;
    }> = [];

    if (itemIds.length > 0) {
      const rows = await db
        .select({
          id: schema.contentItems.id,
          itemType: schema.contentItems.itemType,
          stage: schema.contentItems.stage,
          hemisphereMode: schema.contentItems.hemisphereMode,
          difficultyLevel: schema.contentItems.difficultyLevel,
          bloomLevel: schema.contentItems.bloomLevel,
          estimatedDurationS: schema.contentItems.estimatedDurationS,
          body: schema.contentItems.body,
        })
        .from(schema.contentItems)
        .where(sql`${schema.contentItems.id} = ANY(${itemIds}::uuid[])`);

      // Re-order to match the original queue order (SQL IN/ANY doesn't preserve order)
      const rowById = new Map(rows.map((row) => [row.id, row]));
      items = itemIds
        .map((id) => rowById.get(id))
        .filter((row): row is NonNullable<typeof row> => row !== undefined);
    }

    // ── 4. Return the resumable session payload ──────────────────────────────
    return c.json({
      active: true,
      sessionId: session.id,
      topicId: session.topicId,
      sessionType,
      stage: progress.currentStage,
      currentItemIndex: progress.currentItemIndex,
      startedAt: progress.startedAt,
      items,
    });
  } catch (err) {
    console.error('GET /api/session/active error:', err);
    return c.json(
      { error: 'Internal Server Error', message: 'An unexpected error occurred' },
      500
    );
  }
});

// ─── POST /start ──────────────────────────────────────────────────────────────

/**
 * POST /api/session/start
 *
 * Creates a new learning session for the authenticated user.
 *
 * Request body:
 *   { topicId: string (UUID) }
 *
 * Response (201):
 *   {
 *     sessionId: string,
 *     stage: "encounter",
 *     items: Array<{
 *       id: string,
 *       itemType: string,
 *       stage: string,
 *       hemisphereMode: string,
 *       difficultyLevel: number,
 *       bloomLevel: string,
 *       estimatedDurationS: number,
 *       body: unknown,
 *     }>
 *   }
 *
 * Errors:
 *   400 – validation error or malformed JSON
 *   404 – topic not found
 *   409 – user already has an active (in_progress) session for this topic
 *   500 – unexpected server error
 */
sessionRoutes.post('/start', authMiddleware, async (c) => {
  const user = c.get('user');

  // ── 1. Parse and validate request body ──────────────────────────────────────
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Bad Request', message: 'Request body must be valid JSON' }, 400);
  }

  const parseResult = startSessionSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json(
      {
        error: 'Validation failed',
        details: parseResult.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      },
      400
    );
  }

  const topicId = parseResult.data.topicId;
  const sessionType = resolveSessionLoopType(parseResult.data.sessionType);
  const sessionConfig = getSessionConfigForLoop(sessionType);

  try {
    // ── 2. Verify the topic exists ─────────────────────────────────────────────
    const [topic] = await db
      .select({ id: schema.topics.id })
      .from(schema.topics)
      .where(eq(schema.topics.id, topicId))
      .limit(1);

    if (!topic) {
      return c.json({ error: 'Not Found', message: 'Topic not found' }, 404);
    }

    // ── 3. Guard against an already-active session ─────────────────────────────
    const [existingSession] = await db
      .select({ id: schema.sessions.id })
      .from(schema.sessions)
      .where(
        and(
          eq(schema.sessions.userId, user.id),
          eq(schema.sessions.topicId, topicId),
          eq(schema.sessions.status, 'in_progress')
        )
      )
      .limit(1);

    if (existingSession) {
      return c.json(
        {
          error: 'Conflict',
          message: 'You already have an active session for this topic',
          sessionId: existingSession.id,
        },
        409
      );
    }

    // ── 4. Fetch active content pool (primary + interleaving candidates) ──────
    const allItemRows = await db
      .select({
        id: schema.contentItems.id,
        itemType: schema.contentItems.itemType,
        stage: schema.contentItems.stage,
        hemisphereMode: schema.contentItems.hemisphereMode,
        topicId: schema.contentItems.topicId,
        difficultyLevel: schema.contentItems.difficultyLevel,
        bloomLevel: schema.contentItems.bloomLevel,
        estimatedDurationS: schema.contentItems.estimatedDurationS,
        body: schema.contentItems.body,
        isReviewable: schema.contentItems.isReviewable,
        interleaveEligible: schema.contentItems.interleaveEligible,
        similarityTags: schema.contentItems.similarityTags,
      })
      .from(schema.contentItems)
      .where(eq(schema.contentItems.isActive, true))
      .orderBy(
        schema.contentItems.topicId,
        sql`CASE ${schema.contentItems.stage}
              WHEN 'encounter' THEN 1
              WHEN 'analysis'  THEN 2
              WHEN 'return'    THEN 3
              ELSE 4
            END`,
        schema.contentItems.difficultyLevel
      );

    const allItems: SessionStartItem[] = allItemRows
      .filter((row) => isSessionStageValue(row.stage))
      .map((row) => ({
        id: row.id,
        itemType: row.itemType,
        stage: row.stage,
        hemisphereMode: row.hemisphereMode,
        topicId: row.topicId,
        difficultyLevel: row.difficultyLevel,
        bloomLevel: row.bloomLevel,
        estimatedDurationS: row.estimatedDurationS,
        body: row.body,
        isReviewable: row.isReviewable,
        interleaveEligible: row.interleaveEligible,
        similarityTags: row.similarityTags,
      }));

    const primaryItems = allItems.filter((item) => item.topicId === topicId);
    if (primaryItems.length === 0) {
      return c.json(
        { error: 'Not Found', message: 'No active content available for this topic' },
        404
      );
    }

    const encounterPool = primaryItems.filter((item) => item.stage === 'encounter');
    const primaryAnalysisPool = primaryItems.filter((item) => item.stage === 'analysis');
    const returnPool = primaryItems.filter((item) => item.stage === 'return');

    const analysisPool = allItems.filter(
      (item) =>
        item.stage === 'analysis' &&
        (item.topicId === topicId || item.interleaveEligible)
    );

    const analysisItemIds = analysisPool.map((item) => item.id);
    const itemKcRows = analysisItemIds.length
      ? await db
          .select({
            contentItemId: schema.contentItemKcs.contentItemId,
            kcId: schema.contentItemKcs.kcId,
          })
          .from(schema.contentItemKcs)
          .where(sql`${schema.contentItemKcs.contentItemId} = ANY(${analysisItemIds}::uuid[])`)
      : [];

    const kcByItem = new Map<string, string>();
    for (const row of itemKcRows) {
      if (!kcByItem.has(row.contentItemId)) {
        kcByItem.set(row.contentItemId, row.kcId);
      }
    }

    const adaptiveTopicsMap = new Map<string, AdaptiveSessionItem[]>();
    for (const item of analysisPool) {
      const kcId = kcByItem.get(item.id);
      if (!kcId) continue;
      const bucket = adaptiveTopicsMap.get(item.topicId) ?? [];
      bucket.push({
        itemId: item.id,
        kcId,
        topicId: item.topicId,
        stage: 'analysis',
        difficultyLevel: item.difficultyLevel,
        interleaveEligible: item.interleaveEligible,
        isReviewable: item.isReviewable,
        similarityTags: item.similarityTags,
      });
      adaptiveTopicsMap.set(item.topicId, bucket);
    }

    const adaptiveTopics: AdaptiveSessionTopic[] = [...adaptiveTopicsMap.entries()].map(
      ([adaptiveTopicId, items]) => ({
        topicId: adaptiveTopicId,
        items,
      })
    );

    const memoryRows = analysisItemIds.length
      ? await db
          .select({
            itemId: schema.fsrsMemoryState.itemId,
            stability: schema.fsrsMemoryState.stability,
            difficulty: schema.fsrsMemoryState.difficulty,
            retrievability: schema.fsrsMemoryState.retrievability,
            state: schema.fsrsMemoryState.state,
            lastReview: schema.fsrsMemoryState.lastReview,
            reviewCount: schema.fsrsMemoryState.reviewCount,
            lapseCount: schema.fsrsMemoryState.lapseCount,
          })
          .from(schema.fsrsMemoryState)
          .where(
            and(
              eq(schema.fsrsMemoryState.userId, user.id),
              sql`${schema.fsrsMemoryState.itemId} = ANY(${analysisItemIds}::uuid[])`
            )
          )
      : [];

    const memoryStates = new Map<string, FsrsCard>();
    for (const row of memoryRows) {
      memoryStates.set(row.itemId, {
        stability: row.stability,
        difficulty: row.difficulty,
        retrievability: row.retrievability,
        state: row.state as FsrsCardState,
        lastReview: row.lastReview ?? null,
        reviewCount: row.reviewCount,
        lapseCount: row.lapseCount,
      });
    }

    const primaryKcStates = await db
      .select({
        lhAccuracy: schema.learnerKcState.lhAccuracy,
        rhScore: schema.learnerKcState.rhScore,
        difficultyTier: schema.learnerKcState.difficultyTier,
      })
      .from(schema.learnerKcState)
      .innerJoin(
        schema.knowledgeComponents,
        eq(schema.learnerKcState.kcId, schema.knowledgeComponents.id)
      )
      .where(
        and(
          eq(schema.learnerKcState.userId, user.id),
          eq(schema.knowledgeComponents.topicId, topicId)
        )
      );

    const hemisphereBalanceScore =
      primaryKcStates.length > 0
        ? primaryKcStates.reduce((acc, row) => acc + (row.rhScore - row.lhAccuracy), 0) /
          primaryKcStates.length
        : 0;

    const currentLevel = clampAdaptiveLevel(
      primaryKcStates.length > 0
        ? primaryKcStates.reduce((acc, row) => acc + row.difficultyTier, 0) /
            primaryKcStates.length
        : 1
    );

    const adaptivePlan =
      adaptiveTopics.length > 0
        ? planAdaptiveSession({
            primaryTopicId: topicId,
            availableTopics: adaptiveTopics,
            memoryStates,
            currentLevel,
            sessionType,
            hemisphereBalanceScore,
            now: new Date(),
          })
        : null;

    const selectedAnalysisIds =
      adaptivePlan?.selectedItems.map((item) => item.itemId) ?? [];

    const analysisIds =
      selectedAnalysisIds.length > 0
        ? selectedAnalysisIds
        : primaryAnalysisPool.map((item) => item.id).slice(
            0,
            sessionType === 'quick' ? 8 : sessionType === 'extended' ? 28 : 16
          );

    const reflectionId =
      returnPool.find((item) => item.itemType === 'reflection_prompt')?.id ??
      returnPool[0]?.id ??
      null;

    const itemIds = buildItemQueueForSessionType(
      sessionType,
      encounterPool.map((item) => item.id),
      analysisIds,
      returnPool.map((item) => item.id),
      reflectionId
    );

    if (itemIds.length === 0) {
      return c.json(
        { error: 'Internal Server Error', message: 'Unable to compose a session queue' },
        500
      );
    }

    const itemById = new Map(allItems.map((item) => [item.id, item]));
    const queuedItems = itemIds
      .map((id) => itemById.get(id))
      .filter((item): item is SessionStartItem => item !== undefined);

    const encounterItems = queuedItems.filter((item) => item.stage === 'encounter');

    // Compute planned balance from the selected queue.
    const analysisQueued = queuedItems.filter((item) => item.stage === 'analysis');
    const newItemCount = analysisQueued.filter((item) => {
      const card = memoryStates.get(item.id);
      return !card || card.state === 'new';
    }).length;
    const reviewItemCount = analysisQueued.length - newItemCount;
    const interleavedCount = analysisQueued.filter((item) => item.topicId !== topicId).length;
    const plannedBalance = { newItemCount, reviewItemCount, interleavedCount };

    const stageBalance = adaptivePlan?.stageBalance ?? getStageBalanceForLoop(sessionType);

    // ── 5. Build the initial session progress state ────────────────────────────
    const now = Date.now();
    const initialProgress: SessionProgress = {
      sessionType,
      itemQueue: itemIds,
      currentItemIndex: 0,
      currentStage: 'encounter',
      encounterComplete: false,
      analysisComplete: false,
      returnComplete: false,
      startedAt: now,
      encounterStartedAt: now,
      analysisStartedAt: null,
      returnStartedAt: null,
      encounterDurationMs: 0,
      analysisDurationMs: 0,
      returnDurationMs: 0,
      completedActivityIds: [],
      pausedDurationMs: 0,
      pausedAt: null,
    };

    // ── 6. Insert the new session record ───────────────────────────────────────
    const [newSession] = await db
      .insert(schema.sessions)
      .values({
        userId: user.id,
        topicId,
        sessionType,
        status: 'in_progress',
        plannedBalance,
        itemCount: itemIds.length,
        newItemCount,
        reviewItemCount,
        interleavedCount,
        adaptiveDecisions: initialProgress as unknown as Record<string, unknown>,
      })
      .returning({ id: schema.sessions.id });

    // ── 7. Return session payload (encounter-stage items only) ─────────────────
    return c.json(
      {
        sessionId: newSession.id,
        sessionType,
        stageBalance,
        adaptive: adaptivePlan
          ? {
              level: adaptivePlan.level,
              nextLevel: adaptivePlan.nextLevel,
              rationale: adaptivePlan.rationale,
            }
          : null,
        targetDurationS: Math.round(
          (sessionConfig.targetEncounterDurationMs +
            sessionConfig.targetAnalysisDurationMs +
            sessionConfig.targetReturnDurationMs) / 1000
        ),
        stage: 'encounter' as const,
        items: encounterItems.map((item) => ({
          id: item.id,
          itemType: item.itemType,
          stage: item.stage,
          hemisphereMode: item.hemisphereMode,
          difficultyLevel: item.difficultyLevel,
          bloomLevel: item.bloomLevel,
          estimatedDurationS: item.estimatedDurationS,
          body: item.body,
        })),
      },
      201
    );
  } catch (err) {
    console.error('POST /api/session/start error:', err);
    return c.json(
      {
        error: 'Internal Server Error',
        message: 'An error occurred while starting the session',
      },
      500
    );
  }
});

// ─── POST /response ───────────────────────────────────────────────────────────

/**
 * POST /api/session/response
 *
 * Persists a learner response as an assessment_event, advances the session
 * item pointer through the state machine, evaluates whether the current stage
 * is exhausted (triggering a stage transition), and returns the next item to
 * present — or a sessionComplete signal when the Return stage is done.
 *
 * Request body:
 *   {
 *     sessionId:          string (UUID)
 *     itemId:             string (UUID)
 *     response:           unknown  — arbitrary learner answer payload
 *     responseType:       'multiple_choice' | 'free_text' | 'rating' |
 *                         'confidence' | 'drag_drop' | 'hotspot' | 'binary'
 *     correct?:           boolean | null
 *     ratingOrConfidence?: number (1–5) | null
 *     latencyMs:          number (≥ 0)
 *   }
 *
 * Response (200):
 *   {
 *     nextItem: { id, stage, itemType, body } | null,
 *     stage:          SessionStage,
 *     sessionComplete: boolean
 *   }
 *
 * Errors:
 *   400  – validation failure or malformed JSON
 *   404  – session or content item not found
 *   409  – session not in_progress, or unexpected itemId
 *   500  – state machine / DB error
 */
sessionRoutes.post('/response', authMiddleware, async (c) => {
  const user = c.get('user');

  // ── 1. Parse and validate body ─────────────────────────────────────────────
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Bad Request', message: 'Request body must be valid JSON' }, 400);
  }

  const parseResult = responseSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json(
      {
        error: 'Validation failed',
        details: parseResult.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      },
      400
    );
  }

  const {
    sessionId,
    itemId,
    response,
    responseType,
    correct,
    ratingOrConfidence,
    latencyMs,
  } = parseResult.data;

  try {
    // ── 2. Load session and verify ownership ─────────────────────────────────
    const [session] = await db
      .select()
      .from(schema.sessions)
      .where(
        and(
          eq(schema.sessions.id, sessionId),
          eq(schema.sessions.userId, user.id)
        )
      )
      .limit(1);

    if (!session) {
      return c.json(
        { error: 'Not Found', message: 'Session not found or does not belong to you' },
        404
      );
    }

    if (session.status !== 'in_progress') {
      return c.json(
        {
          error: 'Conflict',
          message: `Session is not in progress (current status: ${session.status})`,
        },
        409
      );
    }

    // ── 3. Load the in-progress state from adaptiveDecisions ─────────────────
    const rawDecisions = session.adaptiveDecisions as unknown;
    if (!rawDecisions || typeof rawDecisions !== 'object') {
      return c.json(
        {
          error: 'Internal Server Error',
          message: 'Session has no progress state — was it started via POST /api/session/start?',
        },
        500
      );
    }

    const sessionType = resolveSessionLoopType(
      typeof session.sessionType === 'string' ? session.sessionType : null
    );
    const sessionConfig = getSessionConfigForLoop(sessionType);
    const progress = {
      ...(rawDecisions as SessionProgress),
      sessionType,
    } satisfies SessionProgress;

    if (
      !Array.isArray(progress.itemQueue) ||
      typeof progress.currentItemIndex !== 'number' ||
      !progress.currentStage
    ) {
      return c.json(
        { error: 'Internal Server Error', message: 'Session progress state is malformed' },
        500
      );
    }

    // ── 4. Verify the item is the expected one in the queue ───────────────────
    const expectedItemId = progress.itemQueue[progress.currentItemIndex];
    if (!expectedItemId) {
      return c.json(
        { error: 'Conflict', message: 'Session queue is already exhausted' },
        409
      );
    }

    if (expectedItemId !== itemId) {
      return c.json(
        {
          error: 'Conflict',
          message: `Unexpected item: expected ${expectedItemId}, received ${itemId}`,
        },
        409
      );
    }

    // ── 5. Verify the content item exists ─────────────────────────────────────
    const [contentItem] = await db
      .select({ id: schema.contentItems.id, difficultyLevel: schema.contentItems.difficultyLevel })
      .from(schema.contentItems)
      .where(eq(schema.contentItems.id, itemId))
      .limit(1);

    if (!contentItem) {
      return c.json({ error: 'Not Found', message: 'Content item not found' }, 404);
    }

    // ── 6. Fetch the primary KC for this item (best-effort) ───────────────────
    const [itemKc] = await db
      .select({ kcId: schema.contentItemKcs.kcId })
      .from(schema.contentItemKcs)
      .where(eq(schema.contentItemKcs.contentItemId, itemId))
      .limit(1);

    // ── 7. Record the assessment_event ────────────────────────────────────────
    const now = new Date();
    const presentedAt = new Date(now.getTime() - latencyMs);

    const [assessmentEvent] = await db
      .insert(schema.assessmentEvents)
      .values({
        userId: user.id,
        sessionId,
        contentItemId: itemId,
        kcId: itemKc?.kcId ?? null,
        responseType,
        learnerResponse: response ?? null,
        isCorrect: correct ?? null,
        score: correct === true ? 1 : correct === false ? 0 : null,
        rawScore: correct === true ? 1 : correct === false ? 0 : null,
        scoringMethod:
          correct !== null && correct !== undefined ? 'auto' : 'pending',
        presentedAt,
        respondedAt: now,
        latencyMs,
        stage: progress.currentStage,
        difficultyLevel: contentItem.difficultyLevel,
        helpRequested: false,
        selfRating:
          responseType === 'rating' && ratingOrConfidence != null
            ? String(ratingOrConfidence)
            : null,
        confidenceRating:
          responseType === 'confidence' && ratingOrConfidence != null
            ? ratingOrConfidence
            : null,
      })
      .returning({ id: schema.assessmentEvents.id });

    if (!assessmentEvent) {
      return c.json(
        { error: 'Internal Server Error', message: 'Failed to record assessment event' },
        500
      );
    }

    // ── 8. Advance item pointer via state machine ─────────────────────────────
    const timestamp = now.getTime();

    let machineState = progressToState(sessionId, user.id, session.topicId, progress);

    // COMPLETE_ACTIVITY increments currentItemIndex and updates stage durations
    const activityResult = sessionStateReducer(
      machineState,
      {
        type: 'COMPLETE_ACTIVITY',
        activityId: itemId,
        timestamp,
      },
      sessionConfig
    );

    if (!activityResult.success) {
      return c.json(
        {
          error: 'Internal Server Error',
          message: `State machine error (COMPLETE_ACTIVITY): ${activityResult.reason}`,
        },
        500
      );
    }

    machineState = activityResult.newState;

    // ── 9. Evaluate stage transition ──────────────────────────────────────────
    //
    // Stage-boundary rule: when the next item in the queue belongs to a
    // different (later) stage — or the queue is fully exhausted — the current
    // stage is complete and we attempt to advance.
    //
    // We query the stage of the item now at the new currentItemIndex.
    let sessionComplete = false;
    const nextIndex = machineState.currentItemIndex;
    const queue = machineState.itemQueue;

    let nextItemStage: string | null = null;
    if (nextIndex < queue.length) {
      const [nextItemRow] = await db
        .select({ stage: schema.contentItems.stage })
        .from(schema.contentItems)
        .where(eq(schema.contentItems.id, queue[nextIndex]))
        .limit(1);
      nextItemStage = nextItemRow?.stage ?? null;
    }

    const currentStageAfterActivity = machineState.currentStage as SessionStage;
    const queueExhausted = nextIndex >= queue.length;
    const stageBoundaryReached =
      queueExhausted ||
      (nextItemStage !== null && nextItemStage !== currentStageAfterActivity);

    if (stageBoundaryReached) {
      // Mark the completed stage as done before attempting transition
      const stageCompleteKey =
        `${currentStageAfterActivity}Complete` as keyof SessionState;
      const stageMarkedComplete: SessionState = {
        ...machineState,
        [stageCompleteKey]: true,
      };

      if (currentStageAfterActivity === 'return') {
        // Attempt to complete the full session (Return stage done)
        const completeResult = sessionStateReducer(
          stageMarkedComplete,
          {
            type: 'COMPLETE_SESSION',
            timestamp,
          },
          sessionConfig
        );

        if (completeResult.success) {
          sessionComplete = true;
          machineState = completeResult.newState;

          // Persist completed session to DB
          await db
            .update(schema.sessions)
            .set({
              status: 'completed',
              completedAt: now,
              durationS: Math.round(
                (now.getTime() - progress.startedAt) / 1000
              ),
              adaptiveDecisions:
                stateToProgress(machineState) as unknown as Record<string, unknown>,
            })
            .where(eq(schema.sessions.id, sessionId));
        } else {
          // Guard failed (e.g. min duration not met) — remain in return stage
          machineState = stageMarkedComplete;
        }
      } else {
        // Attempt Encounter→Analysis or Analysis→Return transition
        const advanceResult = sessionStateReducer(
          stageMarkedComplete,
          {
            type: 'ADVANCE_STAGE',
            timestamp,
          },
          sessionConfig
        );

        if (advanceResult.success) {
          machineState = advanceResult.newState;
        } else {
          // Guard failed — stay in current stage
          machineState = stageMarkedComplete;
        }
      }
    }

    // ── 10. Persist updated progress (unless session just completed above) ────
    if (!sessionComplete) {
      await db
        .update(schema.sessions)
        .set({
          adaptiveDecisions:
            stateToProgress(machineState) as unknown as Record<string, unknown>,
        })
        .where(eq(schema.sessions.id, sessionId));
    }

    // ── 11. Determine next item to serve ──────────────────────────────────────
    let nextItem: {
      id: string;
      stage: string;
      itemType: string;
      body: unknown;
    } | null = null;

    if (!sessionComplete) {
      const newIndex = machineState.currentItemIndex;
      if (newIndex < machineState.itemQueue.length) {
        const nextItemId = machineState.itemQueue[newIndex];
        const [nextItemRow] = await db
          .select({
            id: schema.contentItems.id,
            stage: schema.contentItems.stage,
            itemType: schema.contentItems.itemType,
            body: schema.contentItems.body,
          })
          .from(schema.contentItems)
          .where(eq(schema.contentItems.id, nextItemId))
          .limit(1);

        if (nextItemRow) {
          nextItem = nextItemRow;
        }
      }
    }

    // ── 12. Return response ───────────────────────────────────────────────────
    return c.json({
      nextItem,
      stage: (machineState.currentStage ?? progress.currentStage) as SessionStage,
      sessionComplete,
    });
  } catch (err) {
    console.error('POST /api/session/response error:', err);
    return c.json(
      { error: 'Internal Server Error', message: 'An unexpected error occurred' },
      500
    );
  }
});

// ─── POST /complete ───────────────────────────────────────────────────────────

/**
 * POST /api/session/complete
 *
 * Marks a session as completed, aggregates per-KC scores from the session's
 * assessment events, upserts learner_kc_state mastery scores, and returns a
 * summary of the session outcome.
 *
 * Request body: { sessionId: string (UUID) }
 *
 * Response 200: {
 *   summary: {
 *     totalItems: number,
 *     correct:    number,
 *     accuracy:   number,        // 0–1 fraction, null when totalItems === 0
 *     kcsUpdated: number,
 *   }
 * }
 *
 * Errors:
 *   400  – validation failure
 *   403  – session belongs to a different user
 *   404  – session not found
 *   409  – session is already completed or abandoned
 *   500  – unexpected server error
 */
sessionRoutes.post('/complete', authMiddleware, async (c) => {
  // ── 1. Parse & validate body ──────────────────────────────────────────────
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Bad Request', message: 'Request body must be valid JSON' }, 400);
  }

  const parseResult = completeSessionSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json(
      {
        error: 'Validation failed',
        details: parseResult.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      },
      400
    );
  }

  const { sessionId } = parseResult.data;
  const user = c.get('user');

  try {
    // ── 2. Load the session ─────────────────────────────────────────────────
    const [session] = await db
      .select()
      .from(schema.sessions)
      .where(eq(schema.sessions.id, sessionId))
      .limit(1);

    if (!session) {
      return c.json({ error: 'Not Found', message: 'Session not found' }, 404);
    }

    if (session.userId !== user.id) {
      return c.json(
        { error: 'Forbidden', message: 'You do not have permission to complete this session' },
        403
      );
    }

    if (session.status !== 'in_progress') {
      return c.json(
        {
          error: 'Conflict',
          message: `Session cannot be completed because its status is '${session.status}'`,
        },
        409
      );
    }

    // ── 3. Fetch assessment events for this session ─────────────────────────
    const events = await db
      .select({
        contentItemId: schema.assessmentEvents.contentItemId,
        kcId: schema.assessmentEvents.kcId,
        isCorrect: schema.assessmentEvents.isCorrect,
        score: schema.assessmentEvents.score,
        stage: schema.assessmentEvents.stage,
        responseType: schema.assessmentEvents.responseType,
        latencyMs: schema.assessmentEvents.latencyMs,
        helpRequested: schema.assessmentEvents.helpRequested,
        helpType: schema.assessmentEvents.helpType,
        confidenceRating: schema.assessmentEvents.confidenceRating,
        difficultyLevel: schema.assessmentEvents.difficultyLevel,
      })
      .from(schema.assessmentEvents)
      .where(eq(schema.assessmentEvents.sessionId, sessionId));

    // ── 4. Compute overall session stats ────────────────────────────────────
    const totalItems = events.length;
    const correct = events.filter((e) => e.isCorrect === true).length;
    const accuracy = totalItems > 0 ? correct / totalItems : null;

    // ── 5. Aggregate per-KC scores ──────────────────────────────────────────
    type KcAgg = {
      attempts: number;
      correct: number;
      scoreSum: number;
      scoredCount: number;
    };

    const kcMap = new Map<string, KcAgg>();

    for (const event of events) {
      if (!event.kcId) continue;

      let agg = kcMap.get(event.kcId);
      if (!agg) {
        agg = { attempts: 0, correct: 0, scoreSum: 0, scoredCount: 0 };
        kcMap.set(event.kcId, agg);
      }

      agg.attempts += 1;
      if (event.isCorrect === true) agg.correct += 1;
      if (event.score !== null && event.score !== undefined) {
        agg.scoreSum += event.score;
        agg.scoredCount += 1;
      }
    }

    const kcsUpdated = kcMap.size;
    const now = new Date();
    const kcIds = [...kcMap.keys()];

    const existingKcStates = kcIds.length
      ? await db
          .select({
            kcId: schema.learnerKcState.kcId,
            masteryLevel: schema.learnerKcState.masteryLevel,
            difficultyTier: schema.learnerKcState.difficultyTier,
            lhAccuracy: schema.learnerKcState.lhAccuracy,
            lhAttempts: schema.learnerKcState.lhAttempts,
            rhScore: schema.learnerKcState.rhScore,
            rhAttempts: schema.learnerKcState.rhAttempts,
            firstEncountered: schema.learnerKcState.firstEncountered,
          })
          .from(schema.learnerKcState)
          .where(
            and(
              eq(schema.learnerKcState.userId, user.id),
              sql`${schema.learnerKcState.kcId} = ANY(${kcIds}::uuid[])`
            )
          )
      : [];
    const existingKcStateMap = new Map(existingKcStates.map((row) => [row.kcId, row]));
    const masteryDeltasByKc = new Map<string, number>();
    const deltaByDifficultyKey = new Map<string, number[]>();

    // ── 6. Upsert learner_kc_state for each affected KC ──────────────────────
    for (const [kcId, agg] of kcMap.entries()) {
      const sessionAccuracy = agg.attempts > 0 ? agg.correct / agg.attempts : 0;
      const sessionAvgScore =
        agg.scoredCount > 0 ? agg.scoreSum / agg.scoredCount : sessionAccuracy;
      const sessionPerformance = clamp((sessionAccuracy + sessionAvgScore) / 2, 0, 1);
      const existingState = existingKcStateMap.get(kcId);
      const previousMastery = existingState?.masteryLevel ?? 0;

      const previousLhAttempts = existingState?.lhAttempts ?? 0;
      const nextLhAttempts = previousLhAttempts + agg.attempts;
      const nextLhAccuracy =
        nextLhAttempts > 0
          ? ((existingState?.lhAccuracy ?? 0) * previousLhAttempts + agg.correct) / nextLhAttempts
          : 0;

      const previousRhAttempts = existingState?.rhAttempts ?? 0;
      const nextRhAttempts = previousRhAttempts + agg.attempts;
      const nextRhScore =
        nextRhAttempts > 0
          ? ((existingState?.rhScore ?? 0) * previousRhAttempts + agg.scoreSum) / nextRhAttempts
          : 0;

      const nextIntegratedScore = clamp((nextLhAccuracy + nextRhScore) / 2, 0, 1);
      const nextMastery = clamp(
        existingState ? previousMastery * 0.8 + sessionPerformance * 0.2 : sessionPerformance,
        0,
        1
      );

      let nextDifficultyTier = existingState?.difficultyTier ?? 1;
      if (sessionPerformance >= 0.85 && nextLhAttempts >= 8) {
        nextDifficultyTier = Math.min(4, nextDifficultyTier + 1);
      } else if (sessionPerformance < 0.4 && agg.attempts >= 3) {
        nextDifficultyTier = Math.max(1, nextDifficultyTier - 1);
      }

      await db
        .insert(schema.learnerKcState)
        .values({
          userId: user.id,
          kcId,
          lhAccuracy: nextLhAccuracy,
          lhAttempts: nextLhAttempts,
          lhLastAccuracy: sessionAccuracy,
          rhScore: nextRhScore,
          rhAttempts: nextRhAttempts,
          rhLastScore: sessionAvgScore,
          masteryLevel: nextMastery,
          integratedScore: nextIntegratedScore,
          difficultyTier: nextDifficultyTier,
          firstEncountered: existingState?.firstEncountered ?? now,
          lastPracticed: now,
          lastAssessedLh: now,
          lastAssessedRh: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [schema.learnerKcState.userId, schema.learnerKcState.kcId],
          set: {
            lhAccuracy: nextLhAccuracy,
            lhAttempts: nextLhAttempts,
            lhLastAccuracy: sessionAccuracy,
            rhScore: nextRhScore,
            rhAttempts: nextRhAttempts,
            rhLastScore: sessionAvgScore,
            masteryLevel: nextMastery,
            integratedScore: nextIntegratedScore,
            difficultyTier: nextDifficultyTier,
            lastPracticed: now,
            lastAssessedLh: now,
            lastAssessedRh: now,
            updatedAt: now,
          },
        });

      masteryDeltasByKc.set(kcId, nextMastery - previousMastery);
      const difficultyKey = `tier_${nextDifficultyTier}`;
      const currentDeltas = deltaByDifficultyKey.get(difficultyKey) ?? [];
      currentDeltas.push(nextMastery - previousMastery);
      deltaByDifficultyKey.set(difficultyKey, currentDeltas);
    }

    // ── 7. FSRS scheduling: schedule a review for every (item, KC) touched ──
    //
    // Per-item FSRS scheduling: for each content item that appeared in this
    // session, we compute an FSRS rating from the learner's performance and
    // upsert an fsrs_memory_state row with the new stability, difficulty,
    // retrievability, and nextReview date.
    //
    // Rating mapping:
    //   - No score / null      → 3 (Good)  [encounter/engagement items]
    //   - score >= 0.9         → 4 (Easy)
    //   - score >= 0.7         → 3 (Good)
    //   - score >= 0.4         → 2 (Hard)
    //   - score < 0.4          → 1 (Again)
    //
    // We use the user's personalised fsrs_parameters if they exist, otherwise
    // DEFAULT_FSRS_WEIGHTS is used.

    // Fetch user's FSRS parameters (if they have personalised ones)
    const [userFsrsParams] = await db
      .select({
        weights: schema.fsrsParameters.weights,
        targetRetention: schema.fsrsParameters.targetRetention,
      })
      .from(schema.fsrsParameters)
      .where(eq(schema.fsrsParameters.userId, user.id))
      .limit(1);

    const fsrsWeights: FsrsWeights = userFsrsParams?.weights
      ? { w: userFsrsParams.weights }
      : DEFAULT_FSRS_WEIGHTS;
    const targetRetention = userFsrsParams?.targetRetention ?? 0.9;

    // Build a map: itemId → { kcId, rating } from the session events.
    // When multiple events exist for the same item, we take the last score.
    type ItemFsrsInfo = { kcId: string | null; score: number | null; stage: string };
    const itemMap = new Map<string, ItemFsrsInfo>();
    for (const event of events) {
      itemMap.set(event.contentItemId, {
        kcId: event.kcId,
        score: event.score,
        stage: event.stage,
      });
    }

    // Helper: derive FSRS rating from a 0-1 score
    function scoreToFsrsRating(score: number | null): FsrsRating {
      if (score === null) return 3; // unscored items default to Good
      if (score >= 0.9) return 4;  // Easy
      if (score >= 0.7) return 3;  // Good
      if (score >= 0.4) return 2;  // Hard
      return 1;                    // Again
    }

    // Fetch existing memory states for all items in this session
    const itemIds = [...itemMap.keys()];
    let existingStates: Array<{
      userId: string;
      itemId: string;
      kcId: string;
      stageType: string;
      stability: number;
      difficulty: number;
      retrievability: number;
      state: string;
      lastReview: Date | null;
      reviewCount: number;
      lapseCount: number;
    }> = [];

    if (itemIds.length > 0) {
      existingStates = await db
        .select({
          userId: schema.fsrsMemoryState.userId,
          itemId: schema.fsrsMemoryState.itemId,
          kcId: schema.fsrsMemoryState.kcId,
          stageType: schema.fsrsMemoryState.stageType,
          stability: schema.fsrsMemoryState.stability,
          difficulty: schema.fsrsMemoryState.difficulty,
          retrievability: schema.fsrsMemoryState.retrievability,
          state: schema.fsrsMemoryState.state,
          lastReview: schema.fsrsMemoryState.lastReview,
          reviewCount: schema.fsrsMemoryState.reviewCount,
          lapseCount: schema.fsrsMemoryState.lapseCount,
        })
        .from(schema.fsrsMemoryState)
        .where(
          and(
            eq(schema.fsrsMemoryState.userId, user.id),
            sql`${schema.fsrsMemoryState.itemId} = ANY(${itemIds}::uuid[])`
          )
        );
    }

    const existingStateMap = new Map(existingStates.map((s) => [s.itemId, s]));

    // Fetch the stage of each content item so we can record stageType
    let itemStageRows: Array<{ id: string; stage: string; kcId: string | null }> = [];
    if (itemIds.length > 0) {
      itemStageRows = await db
        .select({
          id: schema.contentItems.id,
          stage: schema.contentItems.stage,
          kcId: schema.contentItemKcs.kcId,
        })
        .from(schema.contentItems)
        .leftJoin(
          schema.contentItemKcs,
          eq(schema.contentItemKcs.contentItemId, schema.contentItems.id)
        )
        .where(sql`${schema.contentItems.id} = ANY(${itemIds}::uuid[])`);
    }
    // Build a map: itemId → { stage, kcId }
    const itemMetaMap = new Map<string, { stage: string; kcId: string | null }>();
    for (const row of itemStageRows) {
      if (!itemMetaMap.has(row.id)) {
        itemMetaMap.set(row.id, { stage: row.stage, kcId: row.kcId });
      }
    }

    const returnKcIds = [...itemMetaMap.values()]
      .filter((meta) => meta.stage === 'return' && meta.kcId !== null)
      .map((meta) => meta.kcId as string);

    const existingReturnStateRows = returnKcIds.length
      ? await db
          .select({
            userId: schema.fsrsMemoryState.userId,
            itemId: schema.fsrsMemoryState.itemId,
            kcId: schema.fsrsMemoryState.kcId,
            stageType: schema.fsrsMemoryState.stageType,
            stability: schema.fsrsMemoryState.stability,
            difficulty: schema.fsrsMemoryState.difficulty,
            retrievability: schema.fsrsMemoryState.retrievability,
            state: schema.fsrsMemoryState.state,
            lastReview: schema.fsrsMemoryState.lastReview,
            reviewCount: schema.fsrsMemoryState.reviewCount,
            lapseCount: schema.fsrsMemoryState.lapseCount,
          })
          .from(schema.fsrsMemoryState)
          .where(
            and(
              eq(schema.fsrsMemoryState.userId, user.id),
              eq(schema.fsrsMemoryState.stageType, 'return'),
              sql`${schema.fsrsMemoryState.kcId} = ANY(${returnKcIds}::uuid[])`
            )
          )
      : [];

    const existingReturnStateByKc = new Map(
      existingReturnStateRows.map((s) => [s.kcId, s])
    );

    // Upsert fsrs_memory_state for each item in the session
    let fsrsRowsUpdated = 0;
    const processedReturnKcs = new Set<string>();
    for (const [itemId, itemInfo] of itemMap.entries()) {
      const meta = itemMetaMap.get(itemId);
      const stageType = meta?.stage ?? itemInfo.stage;
      const kcId = itemInfo.kcId ?? meta?.kcId ?? null;

      // Skip items without a KC (they cannot be tracked in fsrs_memory_state
      // because the schema requires kcId)
      if (!kcId) continue;

      // Return scheduling is concept-level: schedule once per KC, not per prompt.
      if (stageType === 'return' && processedReturnKcs.has(kcId)) {
        continue;
      }

      const conceptReturnState =
        stageType === 'return' ? existingReturnStateByKc.get(kcId) : undefined;
      const memoryItemId = conceptReturnState?.itemId ?? itemId;
      const existing = conceptReturnState ?? existingStateMap.get(itemId);
      const rating = scoreToFsrsRating(itemInfo.score);

      // Build the FsrsCard from existing state, or a new card if first review
      const card: FsrsCard = existing
        ? {
            stability: existing.stability,
            difficulty: existing.difficulty,
            retrievability: existing.retrievability,
            state: existing.state as FsrsCardState,
            lastReview: existing.lastReview,
            reviewCount: existing.reviewCount,
            lapseCount: existing.lapseCount,
          }
        : createNewCard();

      const result = scheduleHemisphereAwareReview(
        card,
        rating,
        now,
        fsrsWeights,
        targetRetention,
        {
          stageType:
            stageType === 'encounter' || stageType === 'analysis' || stageType === 'return'
              ? stageType
              : 'analysis',
        }
      );

      const newReviewCount = (existing?.reviewCount ?? 0) + 1;
      const newLapseCount = (existing?.lapseCount ?? 0) + (rating === 1 ? 1 : 0);

      await db
        .insert(schema.fsrsMemoryState)
        .values({
          userId: user.id,
          itemId: memoryItemId,
          kcId,
          stability: result.stability,
          difficulty: result.difficulty,
          retrievability: result.retrievability,
          stageType,
          lastReview: now,
          nextReview: result.nextDue,
          reviewCount: newReviewCount,
          lapseCount: newLapseCount,
          state: result.state,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [schema.fsrsMemoryState.userId, schema.fsrsMemoryState.itemId],
          set: {
            stability: result.stability,
            difficulty: result.difficulty,
            retrievability: result.retrievability,
            stageType,
            lastReview: now,
            nextReview: result.nextDue,
            reviewCount: sql`${schema.fsrsMemoryState.reviewCount} + 1`,
            lapseCount: sql`${schema.fsrsMemoryState.lapseCount} + ${rating === 1 ? 1 : 0}`,
            state: result.state,
            updatedAt: now,
          },
        });

      if (stageType === 'return') {
        processedReturnKcs.add(kcId);
      }
      fsrsRowsUpdated += 1;
    }

    // ── 8. Mark the session as completed ────────────────────────────────────
    const completedAt = new Date();
    const durationS = Math.round(
      (completedAt.getTime() - session.startedAt.getTime()) / 1000
    );

    await db
      .update(schema.sessions)
      .set({
        status: 'completed',
        completedAt,
        durationS,
        accuracy: accuracy ?? undefined,
      })
      .where(eq(schema.sessions.id, sessionId));

    // ── 9. Update topic proficiency + four-layer learner model ──────────────
    const toEventScore = (event: {
      score: number | null;
      isCorrect: boolean | null;
    }): number | null => {
      if (event.score !== null && event.score !== undefined) return event.score;
      if (event.isCorrect === true) return 1;
      if (event.isCorrect === false) return 0;
      return null;
    };

    const stageScoreAverage = (stage: 'encounter' | 'analysis' | 'return'): number => {
      const scores = events
        .filter((event) => event.stage === stage)
        .map((event) => toEventScore(event))
        .filter((value): value is number => value !== null);
      return average(scores);
    };

    const encounterEngagementScore = stageScoreAverage('encounter');
    const analysisAccuracyScore = stageScoreAverage('analysis');
    const returnEngagementScore = stageScoreAverage('return');

    const topicKcRows = await db
      .select({ kcId: schema.knowledgeComponents.id })
      .from(schema.knowledgeComponents)
      .where(eq(schema.knowledgeComponents.topicId, session.topicId));
    const topicKcIds = topicKcRows.map((row) => row.kcId);

    const topicKcStateRows = topicKcIds.length
      ? await db
          .select({
            kcId: schema.learnerKcState.kcId,
            masteryLevel: schema.learnerKcState.masteryLevel,
          })
          .from(schema.learnerKcState)
          .where(
            and(
              eq(schema.learnerKcState.userId, user.id),
              sql`${schema.learnerKcState.kcId} = ANY(${topicKcIds}::uuid[])`
            )
          )
      : [];
    const topicKcStateMap = new Map(topicKcStateRows.map((row) => [row.kcId, row]));
    const topicMasteries = topicKcIds.map((kcId) => topicKcStateMap.get(kcId)?.masteryLevel ?? 0);
    const overallProficiency = average(topicMasteries);
    const kcMastered = topicMasteries.filter((mastery) => mastery >= 0.8).length;
    const kcInProgress = topicMasteries.filter((mastery) => mastery > 0 && mastery < 0.8).length;
    const kcNotStarted = topicMasteries.length - kcMastered - kcInProgress;

    const [existingTopicProficiency] = await db
      .select({ sessionsCompleted: schema.learnerTopicProficiency.sessionsCompleted })
      .from(schema.learnerTopicProficiency)
      .where(
        and(
          eq(schema.learnerTopicProficiency.userId, user.id),
          eq(schema.learnerTopicProficiency.topicId, session.topicId)
        )
      )
      .limit(1);

    await db
      .insert(schema.learnerTopicProficiency)
      .values({
        userId: user.id,
        topicId: session.topicId,
        overallProficiency,
        kcCount: topicMasteries.length,
        kcMastered,
        kcInProgress,
        kcNotStarted,
        encounterEngagement: encounterEngagementScore,
        analysisAccuracy: analysisAccuracyScore,
        returnQuality: returnEngagementScore,
        lastSession: completedAt,
        sessionsCompleted: (existingTopicProficiency?.sessionsCompleted ?? 0) + 1,
        updatedAt: completedAt,
      })
      .onConflictDoUpdate({
        target: [schema.learnerTopicProficiency.userId, schema.learnerTopicProficiency.topicId],
        set: {
          overallProficiency,
          kcCount: topicMasteries.length,
          kcMastered,
          kcInProgress,
          kcNotStarted,
          encounterEngagement: encounterEngagementScore,
          analysisAccuracy: analysisAccuracyScore,
          returnQuality: returnEngagementScore,
          lastSession: completedAt,
          sessionsCompleted: (existingTopicProficiency?.sessionsCompleted ?? 0) + 1,
          updatedAt: completedAt,
        },
      });

    const [sessionCountsRow, behavioralRows, cognitiveRows, motivationalRows] = await Promise.all([
      db
        .select({
          totalStarted: sql<number>`COUNT(*)::int`,
          totalCompleted: sql<number>`COUNT(*) FILTER (WHERE ${schema.sessions.status} = 'completed')::int`,
          completedLast7Days: sql<number>`COUNT(*) FILTER (WHERE ${schema.sessions.status} = 'completed' AND ${schema.sessions.completedAt} >= ${new Date(completedAt.getTime() - 7 * 24 * 60 * 60 * 1000)})::int`,
          completedLast30Days: sql<number>`COUNT(*) FILTER (WHERE ${schema.sessions.status} = 'completed' AND ${schema.sessions.completedAt} >= ${new Date(completedAt.getTime() - 30 * 24 * 60 * 60 * 1000)})::int`,
          abandonedCount: sql<number>`COUNT(*) FILTER (WHERE ${schema.sessions.status} = 'abandoned')::int`,
        })
        .from(schema.sessions)
        .where(eq(schema.sessions.userId, user.id))
        .then((rows) => rows[0]),
      db
        .select()
        .from(schema.learnerBehavioralState)
        .where(eq(schema.learnerBehavioralState.userId, user.id))
        .limit(1),
      db
        .select()
        .from(schema.learnerCognitiveProfile)
        .where(eq(schema.learnerCognitiveProfile.userId, user.id))
        .limit(1),
      db
        .select()
        .from(schema.learnerMotivationalState)
        .where(eq(schema.learnerMotivationalState.userId, user.id))
        .limit(1),
    ]);

    const previousBehavioral = behavioralRows[0];
    const previousCognitive = cognitiveRows[0];
    const previousMotivational = motivationalRows[0];

    const abandonmentRows = await db
      .select({
        stage: schema.sessions.abandonedAtStage,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(schema.sessions)
      .where(
        and(
          eq(schema.sessions.userId, user.id),
          eq(schema.sessions.status, 'abandoned'),
          sql`${schema.sessions.abandonedAtStage} IS NOT NULL`
        )
      )
      .groupBy(schema.sessions.abandonedAtStage);

    const totalStarted = sessionCountsRow?.totalStarted ?? 0;
    const totalCompleted = sessionCountsRow?.totalCompleted ?? 0;
    const completedLast7Days = sessionCountsRow?.completedLast7Days ?? 0;
    const completedLast30Days = sessionCountsRow?.completedLast30Days ?? 0;
    const abandonedCount = sessionCountsRow?.abandonedCount ?? 0;
    const sessionCompletionRate = totalStarted > 0 ? totalCompleted / totalStarted : 1;

    const previousSessionCount = previousBehavioral?.totalSessions ?? 0;
    const averageSessionDurationS =
      previousSessionCount > 0
        ? (previousBehavioral.averageSessionDurationS * previousSessionCount + durationS) /
          (previousSessionCount + 1)
        : durationS;
    const sessionDurationTrend = previousBehavioral
      ? durationS - previousBehavioral.averageSessionDurationS
      : 0;

    const sessionAverageLatencyMs = average(events.map((event) => event.latencyMs));
    const averageLatencyMs =
      totalItems > 0
        ? previousSessionCount > 0
          ? (previousBehavioral?.averageLatencyMs ?? 0) * (previousSessionCount / (previousSessionCount + 1)) +
            sessionAverageLatencyMs / (previousSessionCount + 1)
          : sessionAverageLatencyMs
        : previousBehavioral?.averageLatencyMs ?? 0;
    const latencyTrend =
      totalItems > 0 && previousBehavioral
        ? sessionAverageLatencyMs - previousBehavioral.averageLatencyMs
        : 0;

    const latencyByTypeSession = new Map<string, number[]>();
    for (const event of events) {
      const values = latencyByTypeSession.get(event.responseType) ?? [];
      values.push(event.latencyMs);
      latencyByTypeSession.set(event.responseType, values);
    }
    const previousLatencyByType = asNumberRecord(previousBehavioral?.latencyByType);
    const latencyByType: Record<string, number> = {};
    const latencyTypeKeys = new Set([
      ...Object.keys(previousLatencyByType),
      ...latencyByTypeSession.keys(),
    ]);
    for (const key of latencyTypeKeys) {
      const sessionValue = average(latencyByTypeSession.get(key) ?? []);
      const previousValue = previousLatencyByType[key] ?? sessionValue;
      latencyByType[key] =
        key in previousLatencyByType ? ewma(previousValue, sessionValue) : sessionValue;
    }

    const helpRequestCount = events.filter((event) => event.helpRequested).length;
    const helpRequestRate = totalItems > 0 ? helpRequestCount / totalItems : 0;
    const smoothedHelpRequestRate = previousBehavioral
      ? ewma(previousBehavioral.helpRequestRate, helpRequestRate)
      : helpRequestRate;
    const helpRequestTrend = previousBehavioral
      ? helpRequestRate - previousBehavioral.helpRequestRate
      : 0;

    const helpTypeSessionCounts: Record<string, number> = {};
    for (const event of events) {
      if (!event.helpRequested || !event.helpType) continue;
      helpTypeSessionCounts[event.helpType] = (helpTypeSessionCounts[event.helpType] ?? 0) + 1;
    }
    const helpTypeSessionTotal = Object.values(helpTypeSessionCounts).reduce((sum, value) => sum + value, 0);
    const helpTypeDistributionSession: Record<string, number> = {};
    if (helpTypeSessionTotal > 0) {
      for (const [key, value] of Object.entries(helpTypeSessionCounts)) {
        helpTypeDistributionSession[key] = value / helpTypeSessionTotal;
      }
    }
    const previousHelpDistribution = asNumberRecord(previousBehavioral?.helpTypeDistribution);
    const helpTypeDistribution: Record<string, number> = {};
    const helpKeys = new Set([
      ...Object.keys(previousHelpDistribution),
      ...Object.keys(helpTypeDistributionSession),
    ]);
    for (const key of helpKeys) {
      const previousValue = previousHelpDistribution[key] ?? 0;
      const sessionValue = helpTypeDistributionSession[key] ?? 0;
      helpTypeDistribution[key] = ewma(previousValue, sessionValue);
    }

    const totalStageDuration =
      (session.encounterDurationS ?? 0) +
      (session.analysisDurationS ?? 0) +
      (session.returnDurationS ?? 0);
    const stageCounts = {
      encounter: events.filter((event) => event.stage === 'encounter').length,
      analysis: events.filter((event) => event.stage === 'analysis').length,
      return: events.filter((event) => event.stage === 'return').length,
    };
    const totalStageCount = stageCounts.encounter + stageCounts.analysis + stageCounts.return;

    const encounterTimeRatio =
      totalStageDuration > 0
        ? (session.encounterDurationS ?? 0) / totalStageDuration
        : totalStageCount > 0
          ? stageCounts.encounter / totalStageCount
          : 0.25;
    const analysisTimeRatio =
      totalStageDuration > 0
        ? (session.analysisDurationS ?? 0) / totalStageDuration
        : totalStageCount > 0
          ? stageCounts.analysis / totalStageCount
          : 0.5;
    const returnTimeRatio =
      totalStageDuration > 0
        ? (session.returnDurationS ?? 0) / totalStageDuration
        : totalStageCount > 0
          ? stageCounts.return / totalStageCount
          : 0.25;

    const confidenceValues: number[] = [];
    const confidenceAccuracyValues: number[] = [];
    for (const event of events) {
      if (event.confidenceRating === null || event.confidenceRating === undefined) continue;
      const score = toEventScore(event);
      if (score === null) continue;
      confidenceValues.push(clamp(event.confidenceRating / 5, 0, 1));
      confidenceAccuracyValues.push(score);
    }
    const confidenceAccuracyCorr =
      confidenceValues.length >= 2
        ? pearsonCorrelation(confidenceValues, confidenceAccuracyValues)
        : previousBehavioral?.confidenceAccuracyCorr ?? 0;
    const calibrationGap =
      confidenceValues.length > 0
        ? average(confidenceValues) - average(confidenceAccuracyValues)
        : previousBehavioral?.calibrationGap ?? 0;

    await db
      .insert(schema.learnerBehavioralState)
      .values({
        userId: user.id,
        totalSessions: totalCompleted,
        sessionsLast7Days: completedLast7Days,
        sessionsLast30Days: completedLast30Days,
        averageSessionDurationS,
        sessionDurationTrend,
        preferredSessionTime: getPreferredSessionTime(completedAt),
        sessionCompletionRate,
        averageLatencyMs,
        latencyByType,
        latencyTrend,
        helpRequestRate: smoothedHelpRequestRate,
        helpTypeDistribution,
        helpRequestTrend,
        encounterTimeRatio,
        analysisTimeRatio,
        returnTimeRatio,
        encounterEngagementScore,
        returnEngagementScore,
        confidenceAccuracyCorr,
        calibrationGap,
        updatedAt: completedAt,
      })
      .onConflictDoUpdate({
        target: [schema.learnerBehavioralState.userId],
        set: {
          totalSessions: totalCompleted,
          sessionsLast7Days: completedLast7Days,
          sessionsLast30Days: completedLast30Days,
          averageSessionDurationS,
          sessionDurationTrend,
          preferredSessionTime: getPreferredSessionTime(completedAt),
          sessionCompletionRate,
          averageLatencyMs,
          latencyByType,
          latencyTrend,
          helpRequestRate: smoothedHelpRequestRate,
          helpTypeDistribution,
          helpRequestTrend,
          encounterTimeRatio,
          analysisTimeRatio,
          returnTimeRatio,
          encounterEngagementScore,
          returnEngagementScore,
          confidenceAccuracyCorr,
          calibrationGap,
          updatedAt: completedAt,
        },
      });

    const userKcRows = await db
      .select({
        lhAccuracy: schema.learnerKcState.lhAccuracy,
        rhScore: schema.learnerKcState.rhScore,
      })
      .from(schema.learnerKcState)
      .where(eq(schema.learnerKcState.userId, user.id));
    const hemisphereBalanceScore = average(
      userKcRows.map((row) => row.rhScore - row.lhAccuracy)
    );

    const previousHbsHistory = asHistoryEntries(previousCognitive?.hbsHistory);
    const hbsHistory = [...previousHbsHistory, { date: completedAt.toISOString(), value: hemisphereBalanceScore }].slice(-30);
    const hbsTrend =
      hbsHistory.length >= 2
        ? (hbsHistory[hbsHistory.length - 1].value - hbsHistory[0].value) / (hbsHistory.length - 1)
        : 0;

    const defaultModality = { visual: 0.25, auditory: 0.25, textual: 0.25, kinesthetic: 0.25 };
    const previousModality = {
      ...defaultModality,
      ...asNumberRecord(previousCognitive?.modalityPreferences),
    };
    const modalityCounts = { visual: 0, auditory: 0, textual: 0, kinesthetic: 0 };
    for (const event of events) {
      if (event.responseType === 'hotspot' || event.responseType === 'drag_drop') {
        modalityCounts.visual += 1;
      }
      if (
        event.responseType === 'multiple_choice' ||
        event.responseType === 'binary' ||
        event.responseType === 'free_text'
      ) {
        modalityCounts.textual += 1;
      }
      if (
        event.responseType === 'drag_drop' ||
        event.responseType === 'rating' ||
        event.responseType === 'confidence'
      ) {
        modalityCounts.kinesthetic += 1;
      }
    }
    const modalityEventTotal =
      modalityCounts.visual + modalityCounts.auditory + modalityCounts.textual + modalityCounts.kinesthetic;
    const modalitySession =
      modalityEventTotal > 0
        ? {
            visual: modalityCounts.visual / modalityEventTotal,
            auditory: modalityCounts.auditory / modalityEventTotal,
            textual: modalityCounts.textual / modalityEventTotal,
            kinesthetic: modalityCounts.kinesthetic / modalityEventTotal,
          }
        : previousModality;
    const rawModalityPreferences = {
      visual: ewma(previousModality.visual, modalitySession.visual),
      auditory: ewma(previousModality.auditory, modalitySession.auditory),
      textual: ewma(previousModality.textual, modalitySession.textual),
      kinesthetic: ewma(previousModality.kinesthetic, modalitySession.kinesthetic),
    };
    const modalitySum =
      rawModalityPreferences.visual +
      rawModalityPreferences.auditory +
      rawModalityPreferences.textual +
      rawModalityPreferences.kinesthetic;
    const modalityPreferences =
      modalitySum > 0
        ? {
            visual: rawModalityPreferences.visual / modalitySum,
            auditory: rawModalityPreferences.auditory / modalitySum,
            textual: rawModalityPreferences.textual / modalitySum,
            kinesthetic: rawModalityPreferences.kinesthetic / modalitySum,
          }
        : defaultModality;

    const metacognitiveAccuracy = clamp(Math.max(0, confidenceAccuracyCorr), 0, 1);
    const metacognitiveTrend = previousCognitive
      ? metacognitiveAccuracy - previousCognitive.metacognitiveAccuracy
      : 0;

    const masteryDeltas = [...masteryDeltasByKc.values()];
    const learningVelocity = average(masteryDeltas);
    const previousVelocityByDifficulty = asNumberRecord(previousCognitive?.velocityByDifficulty);
    const velocityByDifficulty = {
      tier_1: ewma(
        previousVelocityByDifficulty.tier_1 ?? 0,
        average(deltaByDifficultyKey.get('tier_1') ?? [])
      ),
      tier_2: ewma(
        previousVelocityByDifficulty.tier_2 ?? 0,
        average(deltaByDifficultyKey.get('tier_2') ?? [])
      ),
      tier_3: ewma(
        previousVelocityByDifficulty.tier_3 ?? 0,
        average(deltaByDifficultyKey.get('tier_3') ?? [])
      ),
      tier_4: ewma(
        previousVelocityByDifficulty.tier_4 ?? 0,
        average(deltaByDifficultyKey.get('tier_4') ?? [])
      ),
    };
    const velocityTrend = previousCognitive ? learningVelocity - previousCognitive.learningVelocity : 0;

    const responseTypeScores = new Map<string, number[]>();
    for (const event of events) {
      const score = toEventScore(event);
      if (score === null) continue;
      const values = responseTypeScores.get(event.responseType) ?? [];
      values.push(score);
      responseTypeScores.set(event.responseType, values);
    }
    const sortedAssessmentTypes = [...responseTypeScores.entries()]
      .map(([type, values]) => ({ type, score: average(values) }))
      .sort((a, b) => b.score - a.score);
    const strongestAssessmentTypes =
      sortedAssessmentTypes.length > 0
        ? sortedAssessmentTypes.slice(0, 3).map((entry) => entry.type)
        : previousCognitive?.strongestAssessmentTypes ?? [];
    const weakestAssessmentTypes =
      sortedAssessmentTypes.length > 0
        ? [...sortedAssessmentTypes].reverse().slice(0, 3).map((entry) => entry.type)
        : previousCognitive?.weakestAssessmentTypes ?? [];

    const strongestTopicRows = await db
      .select({ topicId: schema.learnerTopicProficiency.topicId })
      .from(schema.learnerTopicProficiency)
      .where(eq(schema.learnerTopicProficiency.userId, user.id))
      .orderBy(desc(schema.learnerTopicProficiency.overallProficiency))
      .limit(3);
    const weakestTopicRows = await db
      .select({ topicId: schema.learnerTopicProficiency.topicId })
      .from(schema.learnerTopicProficiency)
      .where(eq(schema.learnerTopicProficiency.userId, user.id))
      .orderBy(schema.learnerTopicProficiency.overallProficiency)
      .limit(3);

    await db
      .insert(schema.learnerCognitiveProfile)
      .values({
        userId: user.id,
        hemisphereBalanceScore,
        hbsHistory,
        hbsTrend,
        modalityPreferences,
        metacognitiveAccuracy,
        metacognitiveTrend,
        learningVelocity,
        velocityByDifficulty,
        velocityTrend,
        strongestAssessmentTypes,
        weakestAssessmentTypes,
        strongestTopics: strongestTopicRows.map((row) => row.topicId),
        weakestTopics: weakestTopicRows.map((row) => row.topicId),
        updatedAt: completedAt,
      })
      .onConflictDoUpdate({
        target: [schema.learnerCognitiveProfile.userId],
        set: {
          hemisphereBalanceScore,
          hbsHistory,
          hbsTrend,
          modalityPreferences,
          metacognitiveAccuracy,
          metacognitiveTrend,
          learningVelocity,
          velocityByDifficulty,
          velocityTrend,
          strongestAssessmentTypes,
          weakestAssessmentTypes,
          strongestTopics: strongestTopicRows.map((row) => row.topicId),
          weakestTopics: weakestTopicRows.map((row) => row.topicId),
          updatedAt: completedAt,
        },
      });

    const normalizedSessionFrequency = Math.min(1, completedLast7Days / 7);
    const engagementScore = clamp(
      0.4 * normalizedSessionFrequency + 0.3 * sessionCompletionRate + 0.3 * returnEngagementScore,
      0,
      1
    );
    const previousEngagementHistory = asWeeklyEngagementHistory(previousMotivational?.engagementHistory);
    const currentWeek = getWeekStartIso(completedAt);
    const engagementHistory = [
      ...previousEngagementHistory.filter((entry) => entry.week !== currentWeek),
      { week: currentWeek, score: engagementScore },
    ].slice(-8);
    const engagementTrendWindow = engagementHistory.slice(-4).map((entry) => entry.score);
    const engagementSlope =
      engagementTrendWindow.length >= 2
        ? (engagementTrendWindow[engagementTrendWindow.length - 1] - engagementTrendWindow[0]) /
          (engagementTrendWindow.length - 1)
        : 0;
    const engagementTrend =
      engagementSlope > 0.05 ? 'increasing' : engagementSlope < -0.05 ? 'declining' : 'stable';

    const highDifficultyRate =
      totalItems > 0 ? events.filter((event) => event.difficultyLevel >= 3).length / totalItems : 0;
    const sessionChallengeTolerance = clamp(
      0.5 * highDifficultyRate + 0.5 * (accuracy ?? 0),
      0,
      1
    );
    const challengeTolerance = previousMotivational
      ? ewma(previousMotivational.challengeTolerance, sessionChallengeTolerance)
      : sessionChallengeTolerance;

    const abandonmentStage: Record<string, number> = { encounter: 0, analysis: 0, return: 0 };
    for (const row of abandonmentRows) {
      if (!row.stage) continue;
      if (row.stage !== 'encounter' && row.stage !== 'analysis' && row.stage !== 'return') continue;
      abandonmentStage[row.stage] = abandonedCount > 0 ? row.count / abandonedCount : 0;
    }
    const sessionAbandonmentRate = totalStarted > 0 ? abandonedCount / totalStarted : 0;

    const recentAccuracyRows = await db
      .select({ accuracy: schema.sessions.accuracy })
      .from(schema.sessions)
      .where(
        and(
          eq(schema.sessions.userId, user.id),
          eq(schema.sessions.status, 'completed'),
          sql`${schema.sessions.id} <> ${sessionId}`,
          sql`${schema.sessions.accuracy} IS NOT NULL`
        )
      )
      .orderBy(desc(schema.sessions.completedAt))
      .limit(5);
    const recentAccuracyValues = recentAccuracyRows
      .map((row) => row.accuracy)
      .filter((value): value is number => value !== null && value !== undefined);
    const baselineAccuracy = average(recentAccuracyValues);
    const accuracyDeclining = accuracy !== null && recentAccuracyValues.length > 0 && accuracy < baselineAccuracy;
    const latencyIncreasing = previousBehavioral
      ? sessionAverageLatencyMs > previousBehavioral.averageLatencyMs
      : false;
    const frequencySpike =
      completedLast30Days > 0 ? completedLast7Days > 2 * (completedLast30Days / 4) : false;
    const burnoutSignalCount = [frequencySpike, accuracyDeclining, latencyIncreasing].filter(Boolean).length;
    const burnoutRisk =
      burnoutSignalCount === 3 ? 'high' : burnoutSignalCount >= 2 ? 'moderate' : 'low';

    const daysSinceLastSession = 0;
    const dropoutRisk =
      engagementTrend === 'declining' && daysSinceLastSession > 7 && sessionAbandonmentRate > 0.4
        ? 'high'
        : engagementTrend === 'declining' || daysSinceLastSession > 5 || sessionAbandonmentRate > 0.3
          ? 'moderate'
          : 'low';

    await db
      .insert(schema.learnerMotivationalState)
      .values({
        userId: user.id,
        engagementTrend,
        engagementScore,
        engagementHistory,
        topicChoiceRate: previousMotivational?.topicChoiceRate ?? 0,
        explorationRate: previousMotivational?.explorationRate ?? 0,
        preferredSessionType: session.sessionType,
        challengeTolerance,
        sessionAbandonmentRate,
        abandonmentStage,
        lastActive: completedAt,
        daysSinceLastSession,
        dropoutRisk,
        burnoutRisk,
        updatedAt: completedAt,
      })
      .onConflictDoUpdate({
        target: [schema.learnerMotivationalState.userId],
        set: {
          engagementTrend,
          engagementScore,
          engagementHistory,
          topicChoiceRate: previousMotivational?.topicChoiceRate ?? 0,
          explorationRate: previousMotivational?.explorationRate ?? 0,
          preferredSessionType: session.sessionType,
          challengeTolerance,
          sessionAbandonmentRate,
          abandonmentStage,
          lastActive: completedAt,
          daysSinceLastSession,
          dropoutRisk,
          burnoutRisk,
          updatedAt: completedAt,
        },
      });

    // ── 10. Return summary ───────────────────────────────────────────────────
    return c.json({
      summary: {
        totalItems,
        correct,
        accuracy,
        kcsUpdated,
        fsrsRowsUpdated,
      },
    });
  } catch (error) {
    console.error('POST /api/session/complete error:', error);
    return c.json(
      { error: 'Internal Server Error', message: 'An unexpected error occurred' },
      500
    );
  }
});
