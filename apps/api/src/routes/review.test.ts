/**
 * Integration tests for review routes, focused on GET /api/review/queue.
 *
 * Strategy:
 * - Mount reviewRoutes directly under /api/review on a lightweight Hono app.
 * - Mock @hemisphere/db entirely with vi.mock() — no live database required.
 * - Use the real `jose` library so JWT signing/verification is genuine.
 *
 * The mock must handle two distinct Drizzle query shapes:
 *   1. authMiddleware:    db.select().from().where().limit()
 *   2. /queue route:      db.select().from().where()          (no .limit())
 *
 * We track calls with a counter so each invocation of db.select() routes to
 * the appropriate mock return value via mockResolvedValueOnce.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { SignJWT } from 'jose';
import { reviewRoutes } from './review.js';

// ─── Hoisted mock handles ─────────────────────────────────────────────────────
//
// We need a single mockSelect that works for BOTH call shapes:
//   shape A (auth):   .select().from().where().limit()   → mockSelectLimit
//   shape B (route):  .select().from().where()            → mockSelectWhere
//
// We use a call-count approach: the Nth call to db.select() routes to a
// different builder chain depending on a shared queue of mock resolvers.
// The simplest pattern: use a single mockResolvedValueOnce queue via a
// unified mock and always expose both .limit() and the promise interface
// from .where().

const { mockSelectResults, mockUpdate } = vi.hoisted(() => ({
  // A queue of resolved values — each call to the innermost function pops one.
  mockSelectResults: vi.fn(),
  mockUpdate: vi.fn(),
}));

// ─── DB mock ──────────────────────────────────────────────────────────────────
//
// The .where() step returns an object that:
//   - Is itself thenable / awaitable (for routes that call .where() as final step)
//   - Also has a .limit() method (for authMiddleware which calls .limit() after .where())
//
// We achieve this by returning a custom object whose .then() method delegates
// to the mockSelectResults promise, and whose .limit() method also delegates to it.

vi.mock('@hemisphere/db', () => {
  const buildWhere = () =>
    new Proxy(mockSelectResults, {
      get(target, prop) {
        if (prop === 'limit') {
          // authMiddleware pattern: .where().limit(n) — same underlying mock
          return () => target();
        }
        // Make it thenable so await works when .where() is the final step
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

  const buildSelect = () => ({
    from: vi.fn(() => ({
      where: buildWhere,
    })),
  });

  const buildUpdate = () => ({
    set: vi.fn(() => ({
      where: mockUpdate,
    })),
  });

  return {
    db: {
      select: vi.fn(buildSelect),
      update: vi.fn(buildUpdate),
    },
    schema: {
      fsrsMemoryState: {
        userId: 'user_id',
        itemId: 'item_id',
        kcId: 'kc_id',
        stability: 'stability',
        difficulty: 'difficulty',
        retrievability: 'retrievability',
        state: 'state',
        lastReview: 'last_review',
        nextReview: 'next_review',
        reviewCount: 'review_count',
        lapseCount: 'lapse_count',
        updatedAt: 'updated_at',
      },
      fsrsParameters: {
        userId: 'user_id',
        weights: 'weights',
        targetRetention: 'target_retention',
        reviewCount: 'review_count',
        updatedAt: 'updated_at',
      },
      users: {
        id: 'id',
        email: 'email',
        displayName: 'display_name',
        role: 'role',
        isActive: 'is_active',
      },
    },
  };
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SECRET = new TextEncoder().encode('hemisphere-dev-secret-change-in-production');

async function signAccessToken(
  payload: Record<string, unknown>,
  expiresIn: string = '15m'
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(SECRET);
}

async function json(res: Response): Promise<Record<string, unknown>> {
  return res.json() as Promise<Record<string, unknown>>;
}

function get(app: Hono, path: string, token?: string): Promise<Response> {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return app.request(path, { method: 'GET', headers });
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const BASE_USER = {
  id: 'user-uuid-1',
  email: 'alice@example.com',
  displayName: 'Alice',
  role: 'learner' as const,
  isActive: true,
};

// A memory state row representing a NEW card (never reviewed).
const NEW_CARD_ROW = {
  itemId: 'item-uuid-1',
  kcId: 'kc-uuid-1',
  stability: 1,
  difficulty: 0.5,
  retrievability: 1,
  state: 'new',
  lastReview: null,
  nextReview: null,
  reviewCount: 0,
  lapseCount: 0,
};

// A memory state row representing a REVIEWED card that is overdue.
const OVERDUE_CARD_ROW = {
  itemId: 'item-uuid-2',
  kcId: 'kc-uuid-2',
  stability: 10,
  difficulty: 0.5,
  retrievability: 0.7,
  state: 'review',
  lastReview: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
  nextReview: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),  // 5 days overdue
  reviewCount: 3,
  lapseCount: 0,
};

// ─── App factory ──────────────────────────────────────────────────────────────

function makeApp(): Hono {
  const app = new Hono();
  app.route('/api/review', reviewRoutes);
  return app;
}

// ─── Module-level setup ───────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockUpdate.mockResolvedValue([]);
});

// =============================================================================
// GET /api/review/queue
// =============================================================================

describe('GET /api/review/queue', () => {
  let app: Hono;

  beforeEach(() => {
    app = makeApp();
  });

  // ── 401 without auth ────────────────────────────────────────────────────────

  it('401 – rejects request with no Authorization header', async () => {
    const res = await get(app, '/api/review/queue');

    expect(res.status).toBe(401);
    const body = await json(res);
    expect(body.error).toBe('Unauthorized');
  });

  it('401 – rejects request with a malformed token', async () => {
    const res = await get(app, '/api/review/queue', 'not-a-valid-jwt');

    expect(res.status).toBe(401);
    const body = await json(res);
    expect(body.error).toBe('Unauthorized');
  });

  it('401 – rejects an expired token', async () => {
    const token = await signAccessToken(
      { userId: BASE_USER.id, email: BASE_USER.email, role: BASE_USER.role },
      '-1s'
    );

    const res = await get(app, '/api/review/queue', token);

    expect(res.status).toBe(401);
    const body = await json(res);
    expect(body.error).toBe('Unauthorized');
  });

  // ── Correct shape with empty queue ──────────────────────────────────────────

  it('200 – returns correct shape with empty queue for a new user', async () => {
    // Call 1 (authMiddleware user lookup): returns the user row
    mockSelectResults.mockResolvedValueOnce([{ ...BASE_USER }]);
    // Call 2 (/queue route memory-state query): returns no items
    mockSelectResults.mockResolvedValueOnce([]);

    const token = await signAccessToken({
      userId: BASE_USER.id,
      email: BASE_USER.email,
      role: BASE_USER.role,
    });

    const res = await get(app, '/api/review/queue', token);

    expect(res.status).toBe(200);
    const body = await json(res);

    // Top-level keys present
    expect(body).toHaveProperty('queue');
    expect(body).toHaveProperty('meta');

    // Queue is empty
    expect(Array.isArray(body.queue)).toBe(true);
    expect((body.queue as unknown[]).length).toBe(0);

    // Meta shape and values for empty queue
    const meta = body.meta as Record<string, unknown>;
    expect(typeof meta.total).toBe('number');
    expect(typeof meta.newCount).toBe('number');
    expect(typeof meta.dueCount).toBe('number');
    expect(typeof meta.generatedAt).toBe('string');
    expect(meta.total).toBe(0);
    expect(meta.newCount).toBe(0);
    expect(meta.dueCount).toBe(0);

    // generatedAt is a valid ISO 8601 date string
    expect(() => new Date(meta.generatedAt as string).toISOString()).not.toThrow();
  });

  // ── Correct shape with items ─────────────────────────────────────────────────

  it('200 – returns well-formed queue items with all required fields', async () => {
    mockSelectResults.mockResolvedValueOnce([{ ...BASE_USER }]);
    mockSelectResults.mockResolvedValueOnce([{ ...NEW_CARD_ROW }]);

    const token = await signAccessToken({
      userId: BASE_USER.id,
      email: BASE_USER.email,
      role: BASE_USER.role,
    });

    const res = await get(app, '/api/review/queue', token);

    expect(res.status).toBe(200);
    const body = await json(res);
    const queue = body.queue as Array<Record<string, unknown>>;

    expect(queue.length).toBe(1);
    const item = queue[0]!;

    // All required contract fields present with correct types
    expect(typeof item.itemId).toBe('string');
    expect(typeof item.kcId).toBe('string');
    expect(typeof item.dueDate).toBe('string');
    expect(typeof item.retrievability).toBe('number');
    expect(typeof item.overdueDays).toBe('number');
    expect(typeof item.isNew).toBe('boolean');
    expect(typeof item.priority).toBe('number');

    // Values for a new card
    expect(item.itemId).toBe(NEW_CARD_ROW.itemId);
    expect(item.kcId).toBe(NEW_CARD_ROW.kcId);
    expect(item.isNew).toBe(true);
    expect(item.overdueDays).toBe(0);
    expect(item.retrievability).toBe(1); // new card: full retrievability

    // dueDate is a valid ISO 8601 string
    expect(() => new Date(item.dueDate as string).toISOString()).not.toThrow();

    // Priority for a new card: overdueDays * 10 + (1 - retrievability) * 5 + 1
    // = 0 * 10 + (1 - 1) * 5 + 1 = 1
    expect(item.priority).toBe(1);

    // Meta counts
    const meta = body.meta as Record<string, unknown>;
    expect(meta.total).toBe(1);
    expect(meta.newCount).toBe(1);
    expect(meta.dueCount).toBe(0);
  });

  it('200 – correctly categorises new vs due cards in meta', async () => {
    mockSelectResults.mockResolvedValueOnce([{ ...BASE_USER }]);
    mockSelectResults.mockResolvedValueOnce([{ ...NEW_CARD_ROW }, { ...OVERDUE_CARD_ROW }]);

    const token = await signAccessToken({
      userId: BASE_USER.id,
      email: BASE_USER.email,
      role: BASE_USER.role,
    });

    const res = await get(app, '/api/review/queue', token);

    expect(res.status).toBe(200);
    const body = await json(res);
    const meta = body.meta as Record<string, unknown>;

    expect(meta.total).toBe(2);
    expect(meta.newCount).toBe(1);
    expect(meta.dueCount).toBe(1);
  });

  it('200 – sorts queue by priority descending (highest priority first)', async () => {
    mockSelectResults.mockResolvedValueOnce([{ ...BASE_USER }]);
    // Return both cards — overdue should have higher priority than new
    mockSelectResults.mockResolvedValueOnce([{ ...NEW_CARD_ROW }, { ...OVERDUE_CARD_ROW }]);

    const token = await signAccessToken({
      userId: BASE_USER.id,
      email: BASE_USER.email,
      role: BASE_USER.role,
    });

    const res = await get(app, '/api/review/queue', token);

    expect(res.status).toBe(200);
    const body = await json(res);
    const queue = body.queue as Array<Record<string, unknown>>;

    expect(queue.length).toBe(2);

    // Overdue card should come first (higher priority due to overdueDays)
    expect(queue[0]!.itemId).toBe(OVERDUE_CARD_ROW.itemId);
    expect(queue[1]!.itemId).toBe(NEW_CARD_ROW.itemId);

    // Priorities are in descending order
    expect(queue[0]!.priority as number).toBeGreaterThan(queue[1]!.priority as number);
  });

  // ── ?limit param ────────────────────────────────────────────────────────────

  it('200 – respects ?limit param and returns at most N items', async () => {
    const manyRows = Array.from({ length: 10 }, (_, i) => ({
      ...NEW_CARD_ROW,
      itemId: `item-uuid-${i}`,
      kcId: `kc-uuid-${i}`,
    }));

    mockSelectResults.mockResolvedValueOnce([{ ...BASE_USER }]);
    mockSelectResults.mockResolvedValueOnce(manyRows);

    const token = await signAccessToken({
      userId: BASE_USER.id,
      email: BASE_USER.email,
      role: BASE_USER.role,
    });

    const res = await get(app, '/api/review/queue?limit=3', token);

    expect(res.status).toBe(200);
    const body = await json(res);
    const queue = body.queue as Array<Record<string, unknown>>;

    // Only 3 items returned in the queue
    expect(queue.length).toBe(3);

    // meta.total reflects the full candidate count (before limit)
    const meta = body.meta as Record<string, unknown>;
    expect(meta.total).toBe(10);
  });

  it('200 – clamps ?limit to 50 (max allowed)', async () => {
    const manyRows = Array.from({ length: 60 }, (_, i) => ({
      ...NEW_CARD_ROW,
      itemId: `item-uuid-${i}`,
      kcId: `kc-uuid-${i}`,
    }));

    mockSelectResults.mockResolvedValueOnce([{ ...BASE_USER }]);
    mockSelectResults.mockResolvedValueOnce(manyRows);

    const token = await signAccessToken({
      userId: BASE_USER.id,
      email: BASE_USER.email,
      role: BASE_USER.role,
    });

    // Request limit beyond max — silently clamped to 50
    const res = await get(app, '/api/review/queue?limit=100', token);

    expect(res.status).toBe(200);
    const body = await json(res);
    const queue = body.queue as Array<Record<string, unknown>>;

    expect(queue.length).toBeLessThanOrEqual(50);
  });

  it('200 – applies default limit of 20 when no ?limit is supplied', async () => {
    const manyRows = Array.from({ length: 30 }, (_, i) => ({
      ...NEW_CARD_ROW,
      itemId: `item-uuid-${i}`,
      kcId: `kc-uuid-${i}`,
    }));

    mockSelectResults.mockResolvedValueOnce([{ ...BASE_USER }]);
    mockSelectResults.mockResolvedValueOnce(manyRows);

    const token = await signAccessToken({
      userId: BASE_USER.id,
      email: BASE_USER.email,
      role: BASE_USER.role,
    });

    const res = await get(app, '/api/review/queue', token);

    expect(res.status).toBe(200);
    const body = await json(res);
    const queue = body.queue as Array<Record<string, unknown>>;

    // Default limit is 20
    expect(queue.length).toBe(20);
  });
});
