import { Hono } from 'hono';

// ─── In-memory counters ────────────────────────────────────────────────────────

// Map key format: "METHOD|/normalised/path|STATUS"
const httpRequestsTotal = new Map<string, number>();

const startEpochSeconds = Date.now() / 1000;

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Record a single HTTP request observation.
 * Called by metricsMiddleware after each request completes.
 */
export function recordMetric(method: string, path: string, status: number): void {
  const key = `${method.toUpperCase()}|${path}|${String(status)}`;
  const current = httpRequestsTotal.get(key) ?? 0;
  httpRequestsTotal.set(key, current + 1);
}

// ─── Exposition helpers ────────────────────────────────────────────────────────

function escapeLabel(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

function buildPrometheusOutput(): string {
  const lines: string[] = [];

  // ── http_requests_total ──────────────────────────────────────────────────────
  lines.push('# HELP http_requests_total Total number of HTTP requests received.');
  lines.push('# TYPE http_requests_total counter');
  for (const [key, count] of httpRequestsTotal) {
    const [method, path, status] = key.split('|');
    lines.push(
      `http_requests_total{method="${escapeLabel(method)}",path="${escapeLabel(path)}",status="${escapeLabel(status)}"} ${count}`,
    );
  }

  // ── process_uptime_seconds ───────────────────────────────────────────────────
  const uptimeSeconds = Date.now() / 1000 - startEpochSeconds;
  lines.push('');
  lines.push('# HELP process_uptime_seconds Number of seconds the process has been running.');
  lines.push('# TYPE process_uptime_seconds gauge');
  lines.push(`process_uptime_seconds ${uptimeSeconds.toFixed(3)}`);

  // ── nodejs_heap_used_bytes ───────────────────────────────────────────────────
  const heapUsed = process.memoryUsage().heapUsed;
  lines.push('');
  lines.push('# HELP nodejs_heap_used_bytes V8 heap memory used in bytes.');
  lines.push('# TYPE nodejs_heap_used_bytes gauge');
  lines.push(`nodejs_heap_used_bytes ${heapUsed}`);

  // Prometheus text format requires a trailing newline.
  lines.push('');
  return lines.join('\n');
}

// ─── Route ────────────────────────────────────────────────────────────────────

export const metricsRoutes = new Hono();

/**
 * GET /metrics
 * Returns current metrics in Prometheus text exposition format (version 0.0.4).
 * This endpoint is intentionally unauthenticated; restrict at the network layer
 * (e.g. only allow the Prometheus scraper IP via Docker/K8s network policy).
 */
metricsRoutes.get('/', (c) => {
  const body = buildPrometheusOutput();
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
    },
  });
});
