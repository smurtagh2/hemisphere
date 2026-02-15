import { Hono } from 'hono';
import { assignVariant } from '@hemisphere/shared';
import { EXPERIMENTS } from '@hemisphere/shared/experiments-catalog';
import type { Experiment } from '@hemisphere/shared';
import type { AppEnv } from '../middleware/auth.js';

export const experimentRoutes = new Hono<AppEnv>();

// ─── In-memory exposure log ───────────────────────────────────────────────────

interface ExposureRecord {
  experimentId: string;
  userId: string;
  variant: string;
  recordedAt: Date;
}

const exposureLog: ExposureRecord[] = [];

function findExperiment(experimentId: string): Experiment | undefined {
  return Object.values(EXPERIMENTS).find((exp: Experiment) => exp.id === experimentId);
}

// ─── GET /api/experiments/:experimentId/variant?userId=... ────────────────────

experimentRoutes.get('/:experimentId/variant', (c) => {
  const experimentId = c.req.param('experimentId');
  const userId = c.req.query('userId');

  if (!userId) return c.json({ variant: null }, 400);

  const experiment = findExperiment(experimentId);
  if (!experiment) return c.json({ variant: null }, 404);

  const variant = assignVariant(userId, experiment);
  return c.json({ variant: variant?.id ?? null });
});

// ─── POST /api/experiments/:experimentId/exposure ─────────────────────────────

experimentRoutes.post('/:experimentId/exposure', async (c) => {
  const experimentId = c.req.param('experimentId');

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  const parsed = body as Partial<{ userId: string; variant: string }>;
  if (typeof parsed.userId !== 'string' || typeof parsed.variant !== 'string') {
    return c.json({ error: 'userId and variant are required strings' }, 400);
  }

  const record: ExposureRecord = {
    experimentId,
    userId: parsed.userId,
    variant: parsed.variant,
    recordedAt: new Date(),
  };
  exposureLog.push(record);
  console.log(`[experiments] exposure: ${experimentId} user=${parsed.userId} variant=${parsed.variant}`);

  return c.json({ ok: true });
});
