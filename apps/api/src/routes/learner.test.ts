import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { SignJWT } from 'jose';
import { learnerRoutes } from './learner.js';

const { mockSelectResults } = vi.hoisted(() => ({
  mockSelectResults: vi.fn(),
}));

vi.mock('@hemisphere/db', () => {
  const buildWhere = () =>
    new Proxy(mockSelectResults, {
      get(target, prop) {
        if (prop === 'limit') {
          return () => target();
        }
        if (prop === 'then') {
          return (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
            target().then(resolve, reject);
        }
        return undefined;
      },
      apply(target, thisArg, args) {
        return target.apply(thisArg, args);
      },
    });

  const buildSelectQuery = () => {
    const query = {
      innerJoin: vi.fn(() => query),
      leftJoin: vi.fn(() => query),
      orderBy: vi.fn(() => query),
      groupBy: vi.fn(() => query),
      where: buildWhere,
    };
    return query;
  };

  const buildSelect = () => ({
    from: vi.fn(() => buildSelectQuery()),
  });

  return {
    db: {
      select: vi.fn(buildSelect),
    },
    schema: {
      users: {
        id: 'id',
        email: 'email',
        displayName: 'display_name',
        role: 'role',
        isActive: 'is_active',
      },
      learnerKcState: {
        userId: 'user_id',
        kcId: 'kc_id',
        masteryLevel: 'mastery_level',
        difficultyTier: 'difficulty_tier',
        lhAccuracy: 'lh_accuracy',
        lhAttempts: 'lh_attempts',
        rhScore: 'rh_score',
        rhAttempts: 'rh_attempts',
        integratedScore: 'integrated_score',
        lastPracticed: 'last_practiced',
        updatedAt: 'updated_at',
      },
      learnerTopicProficiency: {
        userId: 'user_id',
        topicId: 'topic_id',
        overallProficiency: 'overall_proficiency',
        kcCount: 'kc_count',
        kcMastered: 'kc_mastered',
        kcInProgress: 'kc_in_progress',
        kcNotStarted: 'kc_not_started',
        sessionsCompleted: 'sessions_completed',
        updatedAt: 'updated_at',
      },
      learnerBehavioralState: {
        userId: 'user_id',
      },
      learnerCognitiveProfile: {
        userId: 'user_id',
      },
      learnerMotivationalState: {
        userId: 'user_id',
      },
      knowledgeComponents: {
        id: 'id',
        name: 'name',
        slug: 'slug',
        topicId: 'topic_id',
      },
      topics: {
        id: 'id',
        name: 'name',
        slug: 'slug',
      },
      fsrsMemoryState: {
        userId: 'user_id',
        itemId: 'item_id',
        kcId: 'kc_id',
        stability: 'stability',
        difficulty: 'difficulty',
        retrievability: 'retrievability',
        state: 'state',
        nextReview: 'next_review',
        lastReview: 'last_review',
        reviewCount: 'review_count',
        lapseCount: 'lapse_count',
        stageType: 'stage_type',
      },
      contentItems: {
        id: 'id',
        itemType: 'item_type',
        stage: 'stage',
        difficultyLevel: 'difficulty_level',
        bloomLevel: 'bloom_level',
        estimatedDurationS: 'estimated_duration_s',
        body: 'body',
        isActive: 'is_active',
      },
    },
  };
});

const SECRET = new TextEncoder().encode('hemisphere-dev-secret-change-in-production');

async function signAccessToken(payload: Record<string, unknown>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(SECRET);
}

function makeApp(): Hono {
  const app = new Hono();
  app.route('/api/learner', learnerRoutes);
  return app;
}

describe('GET /api/learner/knowledge-state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns four-layer learner model with persisted rows', async () => {
    const app = makeApp();

    mockSelectResults.mockResolvedValueOnce([
      {
        id: 'user-1',
        email: 'learner@example.com',
        displayName: 'Learner',
        role: 'learner',
        isActive: true,
      },
    ]);
    mockSelectResults.mockResolvedValueOnce([
      {
        kcId: 'kc-1',
        kcName: 'KC One',
        kcSlug: 'kc-one',
        topicId: 'topic-1',
        masteryLevel: 0.62,
        difficultyTier: 2,
        lhAccuracy: 0.7,
        lhAttempts: 10,
        rhScore: 0.54,
        rhAttempts: 8,
        integratedScore: 0.62,
        lastPracticed: new Date('2026-02-13T10:00:00Z'),
        updatedAt: new Date('2026-02-13T10:05:00Z'),
      },
    ]);
    mockSelectResults.mockResolvedValueOnce([
      {
        topicId: 'topic-1',
        topicName: 'Topic One',
        topicSlug: 'topic-one',
        overallProficiency: 0.58,
        kcCount: 6,
        kcMastered: 2,
        kcInProgress: 3,
        kcNotStarted: 1,
        sessionsCompleted: 9,
        updatedAt: new Date('2026-02-13T10:05:00Z'),
      },
    ]);
    mockSelectResults.mockResolvedValueOnce([
      {
        totalSessions: 18,
        averageLatencyMs: 2200,
        latencyByType: { multiple_choice: 1900 },
        helpTypeDistribution: { show_hint: 0.4 },
        updatedAt: new Date('2026-02-13T10:05:00Z'),
      },
    ]);
    mockSelectResults.mockResolvedValueOnce([
      {
        hemisphereBalanceScore: 0.11,
        hbsHistory: [{ date: '2026-02-13', value: 0.11 }],
        hbsTrend: 0.02,
        modalityPreferences: { visual: 0.4, textual: 0.3 },
        metacognitiveAccuracy: 0.65,
        metacognitiveTrend: 0.01,
        learningVelocity: 0.04,
        velocityByDifficulty: { tier_1: 0.03 },
        velocityTrend: 0.005,
        strongestAssessmentTypes: ['multiple_choice'],
        weakestAssessmentTypes: ['free_text'],
        strongestTopics: ['topic-1'],
        weakestTopics: ['topic-2'],
        updatedAt: new Date('2026-02-13T10:05:00Z'),
      },
    ]);
    mockSelectResults.mockResolvedValueOnce([
      {
        engagementTrend: 'stable',
        engagementScore: 0.58,
        engagementHistory: [{ week: '2026-02-10', score: 0.58 }],
        topicChoiceRate: 0.4,
        explorationRate: 0.2,
        preferredSessionType: 'standard',
        challengeTolerance: 0.63,
        sessionAbandonmentRate: 0.08,
        abandonmentStage: { encounter: 0.5, analysis: 0.5, return: 0 },
        lastActive: new Date('2026-02-13T10:05:00Z'),
        daysSinceLastSession: 1,
        dropoutRisk: 'low',
        burnoutRisk: 'low',
        updatedAt: new Date('2026-02-13T10:05:00Z'),
      },
    ]);

    const token = await signAccessToken({
      userId: 'user-1',
      email: 'learner@example.com',
      role: 'learner',
    });

    const res = await app.request('/api/learner/knowledge-state', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toHaveProperty('knowledge');
    expect(body).toHaveProperty('behavioral');
    expect(body).toHaveProperty('cognitive');
    expect(body).toHaveProperty('motivational');
  });

  it('returns safe defaults when behavioral/cognitive/motivational rows are missing', async () => {
    const app = makeApp();

    mockSelectResults.mockResolvedValueOnce([
      {
        id: 'user-2',
        email: 'new@example.com',
        displayName: 'New User',
        role: 'learner',
        isActive: true,
      },
    ]);
    mockSelectResults.mockResolvedValueOnce([]);
    mockSelectResults.mockResolvedValueOnce([]);
    mockSelectResults.mockResolvedValueOnce([]);
    mockSelectResults.mockResolvedValueOnce([]);
    mockSelectResults.mockResolvedValueOnce([]);

    const token = await signAccessToken({
      userId: 'user-2',
      email: 'new@example.com',
      role: 'learner',
    });

    const res = await app.request('/api/learner/knowledge-state', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect((body.behavioral as Record<string, unknown>).totalSessions).toBe(0);
    expect((body.cognitive as Record<string, unknown>).metacognitiveAccuracy).toBe(0.5);
    expect((body.motivational as Record<string, unknown>).engagementTrend).toBe('stable');
  });
});
