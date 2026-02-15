# Production Deployment Guide

## Prerequisites

- Docker ≥ 24 and Docker Compose v2
- Access to a PostgreSQL 15+ database
- Valid JWT secret (≥32 bytes random)
- Google and Apple OAuth client credentials

---

## Infrastructure Overview

`infrastructure/docker-compose.prod.yml` defines four services:

| Service | Port | Description |
|---------|------|-------------|
| `api` | 3001 | Hono API server |
| `web` | 3000 | Next.js frontend |
| `prometheus` | 9090 | Metrics collection |
| `grafana` | 3003 | Metrics dashboard |

All services communicate over the `hemisphere-net` bridge network.

---

## Required Environment Variables

Create a `.env.prod` file (never commit this):

```env
# API
PORT=3001
DATABASE_URL=postgresql://user:pass@host:5432/hemisphere
JWT_SECRET=<32+ random bytes, base64-encoded>
GOOGLE_CLIENT_ID=<from Google Cloud Console>
APPLE_CLIENT_ID=<from Apple Developer Portal>

# Web
NEXT_PUBLIC_API_URL=https://api.yourdomain.com

# Grafana
GF_SECURITY_ADMIN_PASSWORD=<strong password>
```

---

## Building Images

```bash
docker compose -f infrastructure/docker-compose.prod.yml build
```

---

## Database Migrations

Hemisphere uses Drizzle ORM. Run migrations before starting services:

```bash
# From the repo root
pnpm --filter @hemisphere/db migrate
```

Migrations are idempotent — safe to run on every deploy.

---

## Starting Services

```bash
docker compose -f infrastructure/docker-compose.prod.yml --env-file .env.prod up -d
```

Verify all containers are healthy:

```bash
docker compose -f infrastructure/docker-compose.prod.yml ps
```

---

## Health Checks

| Endpoint | Expected |
|----------|---------|
| `GET /health` | `{ "status": "ok" }` |
| `GET /metrics` | Prometheus text format |
| `GET /api/me` (with JWT) | `{ "user": { … } }` |

---

## Scaling

**Horizontal scaling** — increase API replicas:

```bash
docker compose -f infrastructure/docker-compose.prod.yml up -d --scale api=3
```

**Kubernetes** — see `infrastructure/kubernetes/`:
- `api-deployment.yaml`: 2 replicas, resource limits
- `web-deployment.yaml`: 2 replicas
- `hpa.yaml`: HorizontalPodAutoscaler targeting CPU 70%

---

## Rollback Procedure

1. Identify the last stable image tag from CI.
2. Update image tags in `docker-compose.prod.yml`.
3. Re-run `docker compose up -d` — zero-downtime rolling update.
4. If the schema changed, restore from the pre-migration database snapshot.

---

## Related Documentation

- [MONITORING.md](./MONITORING.md) — Grafana dashboards and alert thresholds
- [INCIDENT-RUNBOOK.md](./INCIDENT-RUNBOOK.md) — On-call escalation procedures
- [SECURITY.md](./SECURITY.md) — OWASP audit and hardening notes
- [BETA-PROGRAM.md](./BETA-PROGRAM.md) — 4-week beta rollout plan
