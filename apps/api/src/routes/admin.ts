import { Hono } from 'hono';
import { db, schema } from '@hemisphere/db';
import { sql } from 'drizzle-orm';
import { authMiddleware, requireRole, type AppEnv } from '../middleware/auth.js';

export const adminRoutes = new Hono<AppEnv>();

// All admin routes require authentication + admin role
adminRoutes.use('*', authMiddleware, requireRole('admin'));

/**
 * GET /admin/stats/overview
 * Returns high-level platform statistics for the admin dashboard.
 */
adminRoutes.get('/stats/overview', async (c) => {
  try {
    // Total registered users
    const [usersRow] = await db
      .select({ totalUsers: sql`count(*)::int` })
      .from(schema.users);

    // Active users in the last 7 days (logged in or had a session)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [activeRow] = await db
      .select({ activeUsersLast7Days: sql`count(*)::int` })
      .from(schema.users)
      .where(sql`${schema.users.lastLoginAt} >= ${sevenDaysAgo}`);

    // Total sessions
    const [sessionsRow] = await db
      .select({ totalSessions: sql`count(*)::int` })
      .from(schema.sessions);

    // Total review events (assessment_events)
    const [reviewsRow] = await db
      .select({ totalReviews: sql`count(*)::int` })
      .from(schema.assessmentEvents);

    // Average accuracy (retention proxy) across all completed sessions
    // TODO: compute a more sophisticated retention rate from FSRS stability data
    const [retentionRow] = await db
      .select({ avgRetentionRate: sql`coalesce(avg(accuracy), 0)` })
      .from(schema.sessions)
      .where(sql`accuracy is not null`);

    return c.json({
      totalUsers: Number(usersRow?.totalUsers ?? 0),
      activeUsersLast7Days: Number(activeRow?.activeUsersLast7Days ?? 0),
      totalSessions: Number(sessionsRow?.totalSessions ?? 0),
      totalReviews: Number(reviewsRow?.totalReviews ?? 0),
      avgRetentionRate: Number(retentionRow?.avgRetentionRate ?? 0),
    });
  } catch (err) {
    console.error('admin/stats/overview error:', err);
    return c.json({ error: 'Internal Server Error', message: 'Failed to fetch overview stats' }, 500);
  }
});

/**
 * GET /admin/stats/experiments
 * Returns active experiment assignments with variant distribution.
 * TODO: persist experiment definitions and assignments to the database.
 */
adminRoutes.get('/stats/experiments', (c) => {
  return c.json({ experiments: [] });
});

/**
 * GET /admin/stats/retention
 * Returns daily active user counts for the last 30 days.
 * A "daily active user" is defined as a user who started at least one session that day.
 */
adminRoutes.get('/stats/retention', async (c) => {
  try {
    // Generate the last 30 calendar dates
    const dates: string[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      dates.push(d.toISOString().slice(0, 10)); // YYYY-MM-DD
    }

    // Query session counts grouped by day for the past 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const rows = await db
      .select({
        day: sql`date_trunc('day', ${schema.sessions.startedAt})::date::text`,
        count: sql`count(distinct ${schema.sessions.userId})::int`,
      })
      .from(schema.sessions)
      .where(sql`${schema.sessions.startedAt} >= ${thirtyDaysAgo}`)
      .groupBy(sql`date_trunc('day', ${schema.sessions.startedAt})`);

    // Build a lookup map and fill in zeros for days with no activity
    const countByDay: Record<string, number> = {};
    for (const row of rows) {
      countByDay[String(row.day)] = Number(row.count);
    }

    const counts = dates.map((d) => countByDay[d] ?? 0);

    return c.json({ dates, counts });
  } catch (err) {
    console.error('admin/stats/retention error:', err);
    return c.json({ error: 'Internal Server Error', message: 'Failed to fetch retention data' }, 500);
  }
});
