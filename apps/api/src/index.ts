import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { healthRoutes } from './routes/health.js';
import { authRoutes } from './routes/auth.js';

const app = new Hono();

app.get('/', (c) => {
  return c.json({ service: 'hemisphere-api', status: 'ok' });
});

app.route('/health', healthRoutes);
app.route('/api/auth', authRoutes);

const port = Number(process.env.PORT ?? 3001);

serve({
  fetch: app.fetch,
  port,
});

console.log(`Hemisphere API listening on http://localhost:${port}`);

export default app;
