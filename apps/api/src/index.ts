import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { healthRoutes } from './routes/health.js';
import { authRoutes } from './routes/auth.js';
import { sessionRoutes } from './routes/session.js';
import { reviewRoutes } from './routes/review.js';
import { learnerRoutes } from './routes/learner.js';
import { scoringRoutes } from './routes/scoring.js';
import { authMiddleware, requireRole, requireAuth, type AppEnv } from './middleware/auth.js';

const app = new Hono<AppEnv>();

// ─── Public routes ────────────────────────────────────────────────────────────

app.get('/', (c) => {
  return c.json({ service: 'hemisphere-api', status: 'ok' });
});

app.route('/health', healthRoutes);
app.route('/api/auth', authRoutes);
app.route('/api/session', sessionRoutes);
app.route('/api/review', reviewRoutes);
app.route('/api/learner', learnerRoutes);
app.route('/api/scoring', scoringRoutes);

// ─── Protected routes (authentication required) ───────────────────────────────

/**
 * GET /api/me
 * Returns the currently authenticated user's profile.
 * Demonstrates using authMiddleware as a standalone guard.
 */
app.get('/api/me', authMiddleware, (c) => {
  const user = c.get('user');
  return c.json({ user });
});

/**
 * GET /api/admin
 * Accessible only to users with the "admin" role.
 * Demonstrates chaining authMiddleware → requireRole.
 */
app.get('/api/admin', authMiddleware, requireRole('admin'), (c) => {
  const user = c.get('user');
  return c.json({ message: 'Admin access granted', user });
});

/**
 * GET /api/staff
 * Accessible to "admin" or "moderator" roles.
 * Demonstrates requireRole accepting multiple roles.
 */
app.get('/api/staff', authMiddleware, requireRole('admin', 'moderator'), (c) => {
  const user = c.get('user');
  return c.json({ message: 'Staff access granted', user });
});

/**
 * GET /api/learner/dashboard
 * Accessible to authenticated users of any role.
 * Demonstrates using requireAuth() guards via app.use before the route handler.
 */
app.use('/api/learner/dashboard', ...requireAuth());
app.get('/api/learner/dashboard', (c) => {
  const user = c.get('user');
  return c.json({ message: 'Welcome to your dashboard', user });
});

// ─── Server ───────────────────────────────────────────────────────────────────

const port = Number(process.env.PORT ?? 3001);

serve({
  fetch: app.fetch,
  port,
});

console.log(`Hemisphere API listening on http://localhost:${port}`);

export default app;
