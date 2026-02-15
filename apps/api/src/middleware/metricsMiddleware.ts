import type { MiddlewareHandler } from 'hono';
import { recordMetric } from '../routes/metrics.js';

/**
 * Hono middleware that records an http_requests_total observation after every
 * request.  The path is normalised to at most two URL segments so that
 * high-cardinality dynamic route IDs (e.g. UUIDs) do not inflate the label set.
 *
 * Examples of path normalisation:
 *   /                           -> /
 *   /health                     -> /health
 *   /api/auth                   -> /api/auth
 *   /api/review/abc-123         -> /api/review
 *   /api/learner/abc/answers    -> /api/learner
 */
export const metricsMiddleware: MiddlewareHandler = async (c, next) => {
  await next();

  const method = c.req.method;
  const rawPath = new URL(c.req.url).pathname;
  const path = normalisePath(rawPath);
  const status = c.res.status;

  recordMetric(method, path, status);
};

function normalisePath(rawPath: string): string {
  const segments = rawPath.split('/').filter(Boolean);
  if (segments.length === 0) return '/';
  return '/' + segments.slice(0, 2).join('/');
}
