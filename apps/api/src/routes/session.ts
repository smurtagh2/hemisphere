import { Hono } from 'hono';
import { z } from 'zod';
import { db, schema } from '@hemisphere/db';
import { eq, and, sql } from 'drizzle-orm';
import {
  sessionStateReducer,
  type SessionState,
  type SessionStage,
} from '@hemisphere/shared';
import { authMiddleware, type AppEnv } from '../middleware/auth.js';

export const sessionRoutes = new Hono<AppEnv>();

// ─── Validation ──────────────────────────────────────────────────────────────

const startSessionSchema = z.object({
  topicId: z.string().uuid('topicId must be a valid UUID'),
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
    sessionType: 'standard',
    plannedBalance: { newItemCount: 0, reviewItemCount: 0, interleavedCount: 0 },
  };
}

/** Extract a SessionProgress from a post-reducer SessionState. */
function stateToProgress(state: SessionState): SessionProgress {
  return {
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

  const { topicId } = parseResult.data;

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

    // ── 4. Fetch all content items for this topic, ordered by stage ────────────
    //
    // The ordering encodes the learning arc: encounter → analysis → return.
    // Within each stage items are ordered by difficulty to scaffold learning.
    const allItems = await db
      .select({
        id: schema.contentItems.id,
        itemType: schema.contentItems.itemType,
        stage: schema.contentItems.stage,
        hemisphereMode: schema.contentItems.hemisphereMode,
        difficultyLevel: schema.contentItems.difficultyLevel,
        bloomLevel: schema.contentItems.bloomLevel,
        estimatedDurationS: schema.contentItems.estimatedDurationS,
        body: schema.contentItems.body,
        isReviewable: schema.contentItems.isReviewable,
        interleaveEligible: schema.contentItems.interleaveEligible,
      })
      .from(schema.contentItems)
      .where(
        and(
          eq(schema.contentItems.topicId, topicId),
          eq(schema.contentItems.isActive, true)
        )
      )
      .orderBy(
        sql`CASE ${schema.contentItems.stage}
              WHEN 'encounter' THEN 1
              WHEN 'analysis'  THEN 2
              WHEN 'return'    THEN 3
              ELSE 4
            END`,
        schema.contentItems.difficultyLevel
      );

    const encounterItems = allItems.filter((item) => item.stage === 'encounter');
    const itemIds = allItems.map((item) => item.id);

    // Compute planned balance from the full item set
    const newItemCount = allItems.filter((item) => !item.isReviewable).length;
    const reviewItemCount = allItems.filter((item) => item.isReviewable).length;
    const interleavedCount = allItems.filter((item) => item.interleaveEligible).length;
    const plannedBalance = { newItemCount, reviewItemCount, interleavedCount };

    // ── 5. Build the initial session progress state ────────────────────────────
    const now = Date.now();
    const initialProgress: SessionProgress = {
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
        sessionType: 'standard',
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

    const progress = rawDecisions as SessionProgress;

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
    const activityResult = sessionStateReducer(machineState, {
      type: 'COMPLETE_ACTIVITY',
      activityId: itemId,
      timestamp,
    });

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
        const completeResult = sessionStateReducer(stageMarkedComplete, {
          type: 'COMPLETE_SESSION',
          timestamp,
        });

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
        const advanceResult = sessionStateReducer(stageMarkedComplete, {
          type: 'ADVANCE_STAGE',
          timestamp,
        });

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
        kcId: schema.assessmentEvents.kcId,
        isCorrect: schema.assessmentEvents.isCorrect,
        score: schema.assessmentEvents.score,
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

    // ── 6. Upsert learner_kc_state for each affected KC ──────────────────────
    for (const [kcId, agg] of kcMap.entries()) {
      const sessionAccuracy = agg.attempts > 0 ? agg.correct / agg.attempts : 0;
      const sessionAvgScore = agg.scoredCount > 0 ? agg.scoreSum / agg.scoredCount : 0;

      await db
        .insert(schema.learnerKcState)
        .values({
          userId: user.id,
          kcId,
          lhAccuracy: sessionAccuracy,
          lhAttempts: agg.attempts,
          lhLastAccuracy: sessionAccuracy,
          rhScore: sessionAvgScore,
          rhAttempts: agg.attempts,
          rhLastScore: sessionAvgScore,
          masteryLevel: 0,
          integratedScore: sessionAvgScore,
          firstEncountered: now,
          lastPracticed: now,
          lastAssessedLh: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [schema.learnerKcState.userId, schema.learnerKcState.kcId],
          set: {
            lhAccuracy: sql`
              (${schema.learnerKcState.lhAccuracy} * ${schema.learnerKcState.lhAttempts}
               + ${agg.correct}::real)
              / NULLIF(${schema.learnerKcState.lhAttempts} + ${agg.attempts}::int, 0)
            `,
            lhAttempts: sql`${schema.learnerKcState.lhAttempts} + ${agg.attempts}::int`,
            lhLastAccuracy: sessionAccuracy,
            rhScore: sql`
              (${schema.learnerKcState.rhScore} * ${schema.learnerKcState.rhAttempts}
               + ${agg.scoreSum}::real)
              / NULLIF(${schema.learnerKcState.rhAttempts} + ${agg.attempts}::int, 0)
            `,
            rhAttempts: sql`${schema.learnerKcState.rhAttempts} + ${agg.attempts}::int`,
            rhLastScore: sessionAvgScore,
            integratedScore: sql`
              (${schema.learnerKcState.rhScore} * ${schema.learnerKcState.rhAttempts}
               + ${agg.scoreSum}::real)
              / NULLIF(${schema.learnerKcState.rhAttempts} + ${agg.attempts}::int, 0)
            `,
            lastPracticed: now,
            lastAssessedLh: now,
            updatedAt: now,
          },
        });
    }

    // ── 7. Mark the session as completed ────────────────────────────────────
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

    // ── 8. Return summary ────────────────────────────────────────────────────
    return c.json({
      summary: {
        totalItems,
        correct,
        accuracy,
        kcsUpdated,
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
