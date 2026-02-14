import { Hono } from 'hono';
import { z } from 'zod';
import { db, schema } from '@hemisphere/db';
import { eq, and, sql } from 'drizzle-orm';
import {
  scheduleReview,
  applyScheduleResult,
  getCurrentRetrievability,
  isCardDue,
  DEFAULT_FSRS_WEIGHTS,
  type FsrsCard,
  type FsrsRating,
  type FsrsWeights,
} from '@hemisphere/shared';
import { authMiddleware, type AppEnv } from '../middleware/auth.js';

export const reviewRoutes = new Hono<AppEnv>();

// ─── Validation ──────────────────────────────────────────────────────────────

const scheduleReviewSchema = z.object({
  itemId: z.string().uuid('itemId must be a valid UUID'),
  rating: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
  ]),
});

// ─── GET /due ────────────────────────────────────────────────────────────────

/**
 * GET /api/review/due
 *
 * Returns items due for review for the authenticated user, ordered by
 * priority:
 *   1. Overdue items first (nextReview < now), sorted by how overdue they are
 *      (most overdue first)
 *   2. Among equally-due items, lowest retrievability first
 *
 * Response (200):
 *   {
 *     items: Array<{
 *       itemId:        string,
 *       kcId:          string,
 *       dueDate:       string (ISO 8601),
 *       retrievability: number,
 *       overdueDays:   number,
 *     }>
 *   }
 *
 * Errors:
 *   401 – not authenticated
 *   500 – unexpected server error
 */
reviewRoutes.get('/due', authMiddleware, async (c) => {
  const user = c.get('user');
  const now = new Date();

  try {
    // Fetch all memory states with a scheduled next review date that is due
    // now, or any new cards (state = 'new' which have no nextReview set).
    // We also include 'relearning' cards that are past due.
    const rows = await db
      .select({
        itemId: schema.fsrsMemoryState.itemId,
        kcId: schema.fsrsMemoryState.kcId,
        stability: schema.fsrsMemoryState.stability,
        difficulty: schema.fsrsMemoryState.difficulty,
        retrievability: schema.fsrsMemoryState.retrievability,
        state: schema.fsrsMemoryState.state,
        lastReview: schema.fsrsMemoryState.lastReview,
        nextReview: schema.fsrsMemoryState.nextReview,
        reviewCount: schema.fsrsMemoryState.reviewCount,
        lapseCount: schema.fsrsMemoryState.lapseCount,
      })
      .from(schema.fsrsMemoryState)
      .where(
        and(
          eq(schema.fsrsMemoryState.userId, user.id),
          // Include: new cards (no nextReview), or cards whose nextReview <= now
          sql`(${schema.fsrsMemoryState.nextReview} IS NULL OR ${schema.fsrsMemoryState.nextReview} <= ${now})`
        )
      );

    // Build prioritized list: compute live retrievability and overdue days,
    // then sort by (overdueDays DESC, retrievability ASC).
    const items = rows
      .map((row) => {
        const card: FsrsCard = {
          stability: row.stability,
          difficulty: row.difficulty,
          retrievability: row.retrievability,
          state: row.state as FsrsCard['state'],
          lastReview: row.lastReview ?? null,
          reviewCount: row.reviewCount,
          lapseCount: row.lapseCount,
        };

        const dueDate = row.nextReview ?? now;
        const due = isCardDue(card, dueDate, now);

        // Only include cards that are actually due
        if (!due) return null;

        const liveRetrievability = getCurrentRetrievability(card, now);

        // overdueDays: positive means past due, 0 for new cards / due today
        const overdueDays =
          row.state === 'new' || row.nextReview === null
            ? 0
            : Math.max(0, (now.getTime() - row.nextReview.getTime()) / (1000 * 60 * 60 * 24));

        return {
          itemId: row.itemId,
          kcId: row.kcId,
          dueDate: dueDate.toISOString(),
          retrievability: liveRetrievability,
          overdueDays,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      // Primary sort: most overdue first; secondary sort: lowest retrievability first
      .sort((a, b) => {
        const overdueDiff = b.overdueDays - a.overdueDays;
        if (Math.abs(overdueDiff) > 1e-6) return overdueDiff;
        return a.retrievability - b.retrievability;
      });

    return c.json({ items });
  } catch (err) {
    console.error('GET /api/review/due error:', err);
    return c.json(
      { error: 'Internal Server Error', message: 'An unexpected error occurred' },
      500
    );
  }
});

// ─── POST /schedule ───────────────────────────────────────────────────────────

/**
 * POST /api/review/schedule
 *
 * Accepts a review rating for an item, runs the FSRS scheduling algorithm,
 * and persists the updated memory state.
 *
 * Request body:
 *   { itemId: string (UUID), rating: 1 | 2 | 3 | 4 }
 *
 * Response (200):
 *   {
 *     itemId:         string,
 *     nextDue:        string (ISO 8601),
 *     interval:       number (days),
 *     stability:      number,
 *     difficulty:     number,
 *     retrievability: number,
 *     state:          string,
 *   }
 *
 * Errors:
 *   400 – validation failure or malformed JSON
 *   404 – no memory state found for this item
 *   500 – unexpected server error
 */
reviewRoutes.post('/schedule', authMiddleware, async (c) => {
  const user = c.get('user');

  // ── 1. Parse and validate body ────────────────────────────────────────────
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Bad Request', message: 'Request body must be valid JSON' }, 400);
  }

  const parseResult = scheduleReviewSchema.safeParse(body);
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

  const { itemId, rating } = parseResult.data;
  const now = new Date();

  try {
    // ── 2. Load the current memory state for this user + item ────────────────
    const [memState] = await db
      .select()
      .from(schema.fsrsMemoryState)
      .where(
        and(
          eq(schema.fsrsMemoryState.userId, user.id),
          eq(schema.fsrsMemoryState.itemId, itemId)
        )
      )
      .limit(1);

    if (!memState) {
      return c.json(
        { error: 'Not Found', message: 'No memory state found for this item' },
        404
      );
    }

    // ── 3. Load user-specific FSRS parameters (fall back to defaults) ────────
    const [fsrsParams] = await db
      .select()
      .from(schema.fsrsParameters)
      .where(eq(schema.fsrsParameters.userId, user.id))
      .limit(1);

    const weights: FsrsWeights = fsrsParams?.weights
      ? { w: fsrsParams.weights as number[] }
      : DEFAULT_FSRS_WEIGHTS;

    const targetRetention = fsrsParams?.targetRetention ?? 0.9;

    // ── 4. Build the FsrsCard from the stored memory state ───────────────────
    const card: FsrsCard = {
      stability: memState.stability,
      difficulty: memState.difficulty,
      retrievability: memState.retrievability,
      state: memState.state as FsrsCard['state'],
      lastReview: memState.lastReview ?? null,
      reviewCount: memState.reviewCount,
      lapseCount: memState.lapseCount,
    };

    // ── 5. Run the FSRS scheduling algorithm ─────────────────────────────────
    const fsrsRating = rating as FsrsRating;
    const result = scheduleReview(card, fsrsRating, now, weights, targetRetention);
    const updatedCard = applyScheduleResult(card, result, fsrsRating, now);

    // ── 6. Persist the updated memory state ──────────────────────────────────
    await db
      .update(schema.fsrsMemoryState)
      .set({
        stability: updatedCard.stability,
        difficulty: updatedCard.difficulty,
        retrievability: updatedCard.retrievability,
        state: updatedCard.state,
        lastReview: updatedCard.lastReview ?? now,
        nextReview: result.nextDue,
        reviewCount: updatedCard.reviewCount,
        lapseCount: updatedCard.lapseCount,
        updatedAt: now,
      })
      .where(
        and(
          eq(schema.fsrsMemoryState.userId, user.id),
          eq(schema.fsrsMemoryState.itemId, itemId)
        )
      );

    // ── 7. Optionally increment the review count on fsrs_parameters ──────────
    if (fsrsParams) {
      await db
        .update(schema.fsrsParameters)
        .set({
          reviewCount: sql`${schema.fsrsParameters.reviewCount} + 1`,
          updatedAt: now,
        })
        .where(eq(schema.fsrsParameters.userId, user.id));
    }

    return c.json({
      itemId,
      nextDue: result.nextDue.toISOString(),
      interval: result.interval,
      stability: result.stability,
      difficulty: result.difficulty,
      retrievability: result.retrievability,
      state: result.state,
    });
  } catch (err) {
    console.error('POST /api/review/schedule error:', err);
    return c.json(
      { error: 'Internal Server Error', message: 'An unexpected error occurred' },
      500
    );
  }
});

// ─── GET /stats ───────────────────────────────────────────────────────────────

/**
 * GET /api/review/stats
 *
 * Returns review statistics for the authenticated user.
 *
 * Response (200):
 *   {
 *     dueToday:         number,
 *     dueThisWeek:      number,
 *     averageRetention: number | null,
 *   }
 *
 * Errors:
 *   401 – not authenticated
 *   500 – unexpected server error
 */
reviewRoutes.get('/stats', authMiddleware, async (c) => {
  const user = c.get('user');
  const now = new Date();

  // End-of-today boundary: midnight at the end of the current calendar day (UTC)
  const endOfToday = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      23, 59, 59, 999
    )
  );

  // End-of-week boundary: 7 days from now (rolling week)
  const endOfWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  try {
    // Fetch all memory states for this user in one query
    const rows = await db
      .select({
        stability: schema.fsrsMemoryState.stability,
        difficulty: schema.fsrsMemoryState.difficulty,
        retrievability: schema.fsrsMemoryState.retrievability,
        state: schema.fsrsMemoryState.state,
        lastReview: schema.fsrsMemoryState.lastReview,
        nextReview: schema.fsrsMemoryState.nextReview,
        reviewCount: schema.fsrsMemoryState.reviewCount,
        lapseCount: schema.fsrsMemoryState.lapseCount,
      })
      .from(schema.fsrsMemoryState)
      .where(eq(schema.fsrsMemoryState.userId, user.id));

    let dueToday = 0;
    let dueThisWeek = 0;
    let retentionSum = 0;
    let retentionCount = 0;

    for (const row of rows) {
      const card: FsrsCard = {
        stability: row.stability,
        difficulty: row.difficulty,
        retrievability: row.retrievability,
        state: row.state as FsrsCard['state'],
        lastReview: row.lastReview ?? null,
        reviewCount: row.reviewCount,
        lapseCount: row.lapseCount,
      };

      const dueDate = row.nextReview ?? now;

      // Due today: new cards + cards with nextReview <= end of today
      if (isCardDue(card, dueDate, endOfToday)) {
        dueToday++;
      }

      // Due this week: new cards + cards with nextReview <= end of week
      if (isCardDue(card, dueDate, endOfWeek)) {
        dueThisWeek++;
      }

      // Average retention: only consider non-new cards that have been reviewed
      if (card.state !== 'new' && card.lastReview !== null && card.stability > 0) {
        retentionSum += getCurrentRetrievability(card, now);
        retentionCount++;
      }
    }

    const averageRetention = retentionCount > 0 ? retentionSum / retentionCount : null;

    return c.json({
      dueToday,
      dueThisWeek,
      averageRetention,
    });
  } catch (err) {
    console.error('GET /api/review/stats error:', err);
    return c.json(
      { error: 'Internal Server Error', message: 'An unexpected error occurred' },
      500
    );
  }
});
