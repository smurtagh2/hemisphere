import type { MiddlewareHandler } from 'hono';

interface RateLimitOptions {
  windowMs: number;   // time window in ms
  max: number;        // max requests per window
  message?: string;
}

// Simple in-memory rate limiter (replace with Redis in production)
const requests = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(options: RateLimitOptions): MiddlewareHandler {
  const { windowMs, max, message = 'Too many requests, please try again later.' } = options;

  return async (c, next) => {
    const ip = c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? 'unknown';
    const key = `${ip}:${c.req.path}`;
    const now = Date.now();

    const record = requests.get(key);
    if (!record || now > record.resetAt) {
      requests.set(key, { count: 1, resetAt: now + windowMs });
    } else if (record.count >= max) {
      return c.json({ error: 'Rate limit exceeded', message }, 429);
    } else {
      record.count++;
    }

    await next();
  };
}
