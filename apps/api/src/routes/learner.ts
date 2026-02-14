import { Hono } from 'hono';
import { db, schema } from '@hemisphere/db';
import { eq, and, asc, sql } from 'drizzle-orm';
import { authMiddleware, type AppEnv } from '../middleware/auth.js';

export const learnerRoutes = new Hono<AppEnv>();

// ─── GET /kc-states ───────────────────────────────────────────────────────────

/**
 * GET /api/learner/kc-states
 *
 * Returns all KC mastery records for the currently authenticated learner,
 * joined with the knowledge component name and its parent topic.
 *
 * Response (200):
 *   {
 *     kcStates: Array<{
 *       kcId:            string,
 *       kcName:          string,
 *       kcSlug:          string,
 *       topicId:         string,
 *       masteryLevel:    number,
 *       difficultyTier:  number,
 *       lhAccuracy:      number,
 *       lhAttempts:      number,
 *       lhLastAccuracy:  number,
 *       rhScore:         number,
 *       rhAttempts:      number,
 *       rhLastScore:     number,
 *       integratedScore: number,
 *       firstEncountered: string | null,
 *       lastPracticed:   string | null,
 *       updatedAt:       string,
 *     }>
 *   }
 *
 * Errors:
 *   500 – unexpected server error
 */
learnerRoutes.get('/kc-states', authMiddleware, async (c) => {
  const user = c.get('user');

  try {
    const rows = await db
      .select({
        kcId: schema.learnerKcState.kcId,
        kcName: schema.knowledgeComponents.name,
        kcSlug: schema.knowledgeComponents.slug,
        topicId: schema.knowledgeComponents.topicId,
        masteryLevel: schema.learnerKcState.masteryLevel,
        difficultyTier: schema.learnerKcState.difficultyTier,
        lhAccuracy: schema.learnerKcState.lhAccuracy,
        lhAttempts: schema.learnerKcState.lhAttempts,
        lhLastAccuracy: schema.learnerKcState.lhLastAccuracy,
        rhScore: schema.learnerKcState.rhScore,
        rhAttempts: schema.learnerKcState.rhAttempts,
        rhLastScore: schema.learnerKcState.rhLastScore,
        integratedScore: schema.learnerKcState.integratedScore,
        firstEncountered: schema.learnerKcState.firstEncountered,
        lastPracticed: schema.learnerKcState.lastPracticed,
        updatedAt: schema.learnerKcState.updatedAt,
      })
      .from(schema.learnerKcState)
      .innerJoin(
        schema.knowledgeComponents,
        eq(schema.learnerKcState.kcId, schema.knowledgeComponents.id)
      )
      .where(eq(schema.learnerKcState.userId, user.id))
      .orderBy(
        schema.knowledgeComponents.topicId,
        schema.learnerKcState.masteryLevel
      );

    return c.json({
      kcStates: rows.map((row) => ({
        kcId: row.kcId,
        kcName: row.kcName,
        kcSlug: row.kcSlug,
        topicId: row.topicId,
        masteryLevel: row.masteryLevel,
        difficultyTier: row.difficultyTier,
        lhAccuracy: row.lhAccuracy,
        lhAttempts: row.lhAttempts,
        lhLastAccuracy: row.lhLastAccuracy,
        rhScore: row.rhScore,
        rhAttempts: row.rhAttempts,
        rhLastScore: row.rhLastScore,
        integratedScore: row.integratedScore,
        firstEncountered: row.firstEncountered?.toISOString() ?? null,
        lastPracticed: row.lastPracticed?.toISOString() ?? null,
        updatedAt: row.updatedAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error('GET /api/learner/kc-states error:', err);
    return c.json(
      { error: 'Internal Server Error', message: 'An unexpected error occurred' },
      500
    );
  }
});

// ─── GET /due-reviews ─────────────────────────────────────────────────────────

/**
 * GET /api/learner/due-reviews
 *
 * Returns all content items due for review today for the currently
 * authenticated learner.  Items are ordered by priority:
 *
 *   1. Items whose nextReview is overdue (oldest first — most overdue first)
 *   2. Items due today (by nextReview ASC)
 *
 * Items that are in state 'new' or have nextReview <= now are included.
 * The response also includes the current FSRS memory state for each item so
 * the frontend can display stability, retrievability, etc.
 *
 * Response (200):
 *   {
 *     dueReviews: Array<{
 *       itemId:          string,
 *       kcId:            string,
 *       stability:       number,
 *       difficulty:      number,
 *       retrievability:  number,
 *       state:           string,
 *       nextReview:      string | null,
 *       lastReview:      string | null,
 *       reviewCount:     number,
 *       lapseCount:      number,
 *       stageType:       string,
 *       // Content item fields
 *       itemType:        string,
 *       stage:           string,
 *       difficultyLevel: number,
 *       bloomLevel:      string,
 *       estimatedDurationS: number,
 *       body:            unknown,
 *     }>
 *   }
 *
 * Errors:
 *   500 – unexpected server error
 */
learnerRoutes.get('/due-reviews', authMiddleware, async (c) => {
  const user = c.get('user');

  try {
    const now = new Date();

    // Fetch all fsrs_memory_state rows for this user where:
    //   - state = 'new'  (never reviewed), OR
    //   - nextReview <= now  (due or overdue)
    // Joined with content_items for the body / metadata.
    //
    // Priority ordering:
    //   1. Overdue items (nextReview < now) — most overdue first (ASC)
    //   2. New items (state = 'new') — scheduled last as low priority
    //
    // We implement this with a computed priority column:
    //   state = 'new'        → priority 2
    //   nextReview <= now    → priority 1
    const rows = await db
      .select({
        itemId: schema.fsrsMemoryState.itemId,
        kcId: schema.fsrsMemoryState.kcId,
        stability: schema.fsrsMemoryState.stability,
        difficulty: schema.fsrsMemoryState.difficulty,
        retrievability: schema.fsrsMemoryState.retrievability,
        state: schema.fsrsMemoryState.state,
        nextReview: schema.fsrsMemoryState.nextReview,
        lastReview: schema.fsrsMemoryState.lastReview,
        reviewCount: schema.fsrsMemoryState.reviewCount,
        lapseCount: schema.fsrsMemoryState.lapseCount,
        stageType: schema.fsrsMemoryState.stageType,
        // Content item fields
        itemType: schema.contentItems.itemType,
        stage: schema.contentItems.stage,
        difficultyLevel: schema.contentItems.difficultyLevel,
        bloomLevel: schema.contentItems.bloomLevel,
        estimatedDurationS: schema.contentItems.estimatedDurationS,
        body: schema.contentItems.body,
      })
      .from(schema.fsrsMemoryState)
      .innerJoin(
        schema.contentItems,
        and(
          eq(schema.fsrsMemoryState.itemId, schema.contentItems.id),
          eq(schema.contentItems.isActive, true)
        )
      )
      .where(
        and(
          eq(schema.fsrsMemoryState.userId, user.id),
          sql`(
            ${schema.fsrsMemoryState.state} = 'new'
            OR ${schema.fsrsMemoryState.nextReview} <= ${now.toISOString()}
          )`
        )
      )
      .orderBy(
        // Priority 1 (due/overdue) before priority 2 (new)
        sql`CASE WHEN ${schema.fsrsMemoryState.state} = 'new' THEN 2 ELSE 1 END ASC`,
        // Within due/overdue: most overdue first
        asc(schema.fsrsMemoryState.nextReview)
      );

    return c.json({
      dueReviews: rows.map((row) => ({
        itemId: row.itemId,
        kcId: row.kcId,
        stability: row.stability,
        difficulty: row.difficulty,
        retrievability: row.retrievability,
        state: row.state,
        nextReview: row.nextReview?.toISOString() ?? null,
        lastReview: row.lastReview?.toISOString() ?? null,
        reviewCount: row.reviewCount,
        lapseCount: row.lapseCount,
        stageType: row.stageType,
        itemType: row.itemType,
        stage: row.stage,
        difficultyLevel: row.difficultyLevel,
        bloomLevel: row.bloomLevel,
        estimatedDurationS: row.estimatedDurationS,
        body: row.body,
      })),
    });
  } catch (err) {
    console.error('GET /api/learner/due-reviews error:', err);
    return c.json(
      { error: 'Internal Server Error', message: 'An unexpected error occurred' },
      500
    );
  }
});
