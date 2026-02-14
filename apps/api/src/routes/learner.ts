import { Hono } from 'hono';
import { db, schema } from '@hemisphere/db';
import { eq, and, asc, sql } from 'drizzle-orm';
import { authMiddleware, type AppEnv } from '../middleware/auth.js';

export const learnerRoutes = new Hono<AppEnv>();

const DEFAULT_MODALITY_PREFERENCES = {
  visual: 0.25,
  auditory: 0.25,
  textual: 0.25,
  kinesthetic: 0.25,
} as const;

const DEFAULT_ABANDONMENT_STAGE = {
  encounter: 0,
  analysis: 0,
  return: 0,
} as const;

function toNumberMap(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const result: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      result[key] = raw;
    }
  }
  return result;
}

function toArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

// ─── GET /knowledge-state ────────────────────────────────────────────────────

/**
 * GET /api/learner/knowledge-state
 *
 * Returns the full four-layer learner model for the authenticated user:
 * knowledge, behavioral, cognitive, and motivational state.
 */
learnerRoutes.get('/knowledge-state', authMiddleware, async (c) => {
  const user = c.get('user');

  try {
    const [kcRows, topicRows, behavioralRows, cognitiveRows, motivationalRows] = await Promise.all([
      db
        .select({
          kcId: schema.learnerKcState.kcId,
          kcName: schema.knowledgeComponents.name,
          kcSlug: schema.knowledgeComponents.slug,
          topicId: schema.knowledgeComponents.topicId,
          masteryLevel: schema.learnerKcState.masteryLevel,
          difficultyTier: schema.learnerKcState.difficultyTier,
          lhAccuracy: schema.learnerKcState.lhAccuracy,
          lhAttempts: schema.learnerKcState.lhAttempts,
          rhScore: schema.learnerKcState.rhScore,
          rhAttempts: schema.learnerKcState.rhAttempts,
          integratedScore: schema.learnerKcState.integratedScore,
          lastPracticed: schema.learnerKcState.lastPracticed,
          updatedAt: schema.learnerKcState.updatedAt,
        })
        .from(schema.learnerKcState)
        .innerJoin(
          schema.knowledgeComponents,
          eq(schema.learnerKcState.kcId, schema.knowledgeComponents.id)
        )
        .where(eq(schema.learnerKcState.userId, user.id)),
      db
        .select({
          topicId: schema.learnerTopicProficiency.topicId,
          topicName: schema.topics.name,
          topicSlug: schema.topics.slug,
          overallProficiency: schema.learnerTopicProficiency.overallProficiency,
          kcCount: schema.learnerTopicProficiency.kcCount,
          kcMastered: schema.learnerTopicProficiency.kcMastered,
          kcInProgress: schema.learnerTopicProficiency.kcInProgress,
          kcNotStarted: schema.learnerTopicProficiency.kcNotStarted,
          sessionsCompleted: schema.learnerTopicProficiency.sessionsCompleted,
          updatedAt: schema.learnerTopicProficiency.updatedAt,
        })
        .from(schema.learnerTopicProficiency)
        .innerJoin(schema.topics, eq(schema.learnerTopicProficiency.topicId, schema.topics.id))
        .where(eq(schema.learnerTopicProficiency.userId, user.id)),
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

    const behavioral = behavioralRows[0];
    const cognitive = cognitiveRows[0];
    const motivational = motivationalRows[0];

    return c.json({
      knowledge: {
        topics: topicRows.map((row) => ({
          topicId: row.topicId,
          topicName: row.topicName,
          topicSlug: row.topicSlug,
          overallProficiency: row.overallProficiency,
          kcCount: row.kcCount,
          kcMastered: row.kcMastered,
          kcInProgress: row.kcInProgress,
          kcNotStarted: row.kcNotStarted,
          sessionsCompleted: row.sessionsCompleted,
          updatedAt: row.updatedAt.toISOString(),
        })),
        kcStates: kcRows.map((row) => ({
          kcId: row.kcId,
          kcName: row.kcName,
          kcSlug: row.kcSlug,
          topicId: row.topicId,
          masteryLevel: row.masteryLevel,
          difficultyTier: row.difficultyTier,
          lhAccuracy: row.lhAccuracy,
          lhAttempts: row.lhAttempts,
          rhScore: row.rhScore,
          rhAttempts: row.rhAttempts,
          integratedScore: row.integratedScore,
          lastPracticed: row.lastPracticed?.toISOString() ?? null,
          updatedAt: row.updatedAt.toISOString(),
        })),
      },
      behavioral: behavioral
        ? {
            totalSessions: behavioral.totalSessions,
            sessionsLast7Days: behavioral.sessionsLast7Days,
            sessionsLast30Days: behavioral.sessionsLast30Days,
            averageSessionDurationS: behavioral.averageSessionDurationS,
            sessionDurationTrend: behavioral.sessionDurationTrend,
            preferredSessionTime: behavioral.preferredSessionTime,
            sessionCompletionRate: behavioral.sessionCompletionRate,
            averageLatencyMs: behavioral.averageLatencyMs,
            latencyByType: toNumberMap(behavioral.latencyByType),
            latencyTrend: behavioral.latencyTrend,
            helpRequestRate: behavioral.helpRequestRate,
            helpTypeDistribution: toNumberMap(behavioral.helpTypeDistribution),
            helpRequestTrend: behavioral.helpRequestTrend,
            encounterTimeRatio: behavioral.encounterTimeRatio,
            analysisTimeRatio: behavioral.analysisTimeRatio,
            returnTimeRatio: behavioral.returnTimeRatio,
            encounterEngagementScore: behavioral.encounterEngagementScore,
            returnEngagementScore: behavioral.returnEngagementScore,
            confidenceAccuracyCorr: behavioral.confidenceAccuracyCorr,
            calibrationGap: behavioral.calibrationGap,
            updatedAt: behavioral.updatedAt.toISOString(),
          }
        : {
            totalSessions: 0,
            sessionsLast7Days: 0,
            sessionsLast30Days: 0,
            averageSessionDurationS: 0,
            sessionDurationTrend: 0,
            preferredSessionTime: 'evening',
            sessionCompletionRate: 1,
            averageLatencyMs: 0,
            latencyByType: {},
            latencyTrend: 0,
            helpRequestRate: 0,
            helpTypeDistribution: {},
            helpRequestTrend: 0,
            encounterTimeRatio: 0.25,
            analysisTimeRatio: 0.5,
            returnTimeRatio: 0.25,
            encounterEngagementScore: 0,
            returnEngagementScore: 0,
            confidenceAccuracyCorr: 0,
            calibrationGap: 0,
            updatedAt: null,
          },
      cognitive: cognitive
        ? {
            hemisphereBalanceScore: cognitive.hemisphereBalanceScore,
            hbsHistory: toArray(cognitive.hbsHistory),
            hbsTrend: cognitive.hbsTrend,
            modalityPreferences: {
              ...DEFAULT_MODALITY_PREFERENCES,
              ...toNumberMap(cognitive.modalityPreferences),
            },
            metacognitiveAccuracy: cognitive.metacognitiveAccuracy,
            metacognitiveTrend: cognitive.metacognitiveTrend,
            learningVelocity: cognitive.learningVelocity,
            velocityByDifficulty: toNumberMap(cognitive.velocityByDifficulty),
            velocityTrend: cognitive.velocityTrend,
            strongestAssessmentTypes: cognitive.strongestAssessmentTypes,
            weakestAssessmentTypes: cognitive.weakestAssessmentTypes,
            strongestTopics: cognitive.strongestTopics,
            weakestTopics: cognitive.weakestTopics,
            updatedAt: cognitive.updatedAt.toISOString(),
          }
        : {
            hemisphereBalanceScore: 0,
            hbsHistory: [],
            hbsTrend: 0,
            modalityPreferences: DEFAULT_MODALITY_PREFERENCES,
            metacognitiveAccuracy: 0.5,
            metacognitiveTrend: 0,
            learningVelocity: 0,
            velocityByDifficulty: {},
            velocityTrend: 0,
            strongestAssessmentTypes: [],
            weakestAssessmentTypes: [],
            strongestTopics: [],
            weakestTopics: [],
            updatedAt: null,
          },
      motivational: motivational
        ? {
            engagementTrend: motivational.engagementTrend,
            engagementScore: motivational.engagementScore,
            engagementHistory: toArray(motivational.engagementHistory),
            topicChoiceRate: motivational.topicChoiceRate,
            explorationRate: motivational.explorationRate,
            preferredSessionType: motivational.preferredSessionType,
            challengeTolerance: motivational.challengeTolerance,
            sessionAbandonmentRate: motivational.sessionAbandonmentRate,
            abandonmentStage: {
              ...DEFAULT_ABANDONMENT_STAGE,
              ...toNumberMap(motivational.abandonmentStage),
            },
            lastActive: motivational.lastActive?.toISOString() ?? null,
            daysSinceLastSession: motivational.daysSinceLastSession,
            dropoutRisk: motivational.dropoutRisk,
            burnoutRisk: motivational.burnoutRisk,
            updatedAt: motivational.updatedAt.toISOString(),
          }
        : {
            engagementTrend: 'stable',
            engagementScore: 0.5,
            engagementHistory: [],
            topicChoiceRate: 0,
            explorationRate: 0,
            preferredSessionType: 'standard',
            challengeTolerance: 0.5,
            sessionAbandonmentRate: 0,
            abandonmentStage: DEFAULT_ABANDONMENT_STAGE,
            lastActive: null,
            daysSinceLastSession: 0,
            dropoutRisk: 'low',
            burnoutRisk: 'low',
            updatedAt: null,
          },
    });
  } catch (err) {
    console.error('GET /api/learner/knowledge-state error:', err);
    return c.json(
      { error: 'Internal Server Error', message: 'An unexpected error occurred' },
      500
    );
  }
});

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
