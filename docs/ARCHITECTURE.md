# System Architecture

## High-Level Diagram

```
┌─────────────────────────────────────────────────────┐
│                      Browser                        │
│  Next.js 15 App Router  ·  React 19  ·  Tailwind    │
│  Framer Motion  ·  @dnd-kit  ·  Web Audio API       │
│  PWA (sw.js + IndexedDB offline queue)              │
└────────────────────┬────────────────────────────────┘
                     │ HTTPS / REST
┌────────────────────▼────────────────────────────────┐
│                  Hono API (Node.js)                  │
│  JWT auth  ·  Rate limiting  ·  Security headers    │
│  Routes: auth, session, review, learner, scoring,   │
│          admin, experiments, metrics                │
└────────────────────┬────────────────────────────────┘
                     │ Drizzle ORM
┌────────────────────▼────────────────────────────────┐
│              PostgreSQL 15+                         │
│  items, learner_profiles, fsrs_cards, sessions,     │
│  reviews, subjects                                  │
└─────────────────────────────────────────────────────┘
```

---

## Component Breakdown

### `packages/shared`

Shared logic used by both API and web:

| Module | Purpose |
|--------|---------|
| `fsrs.ts` | FSRS-5 algorithm: `scheduleFsrs`, `getCurrentRetrievability` |
| `fsrs-optimization.ts` | Batch parameter optimisation via gradient descent |
| `adaptive-selection.ts` | Adaptive session composition engine — selects items by hemisphere, difficulty, and learner state |
| `session-state-machine.ts` | XState-style session state machine (IDLE → LOADING → ACTIVE → etc.) |
| `session-state-reducer.ts` | Pure reducer for session state transitions |
| `learner-edge-cases.ts` | `detectZombieItems`, `planRemediation`, `detectLearnerProtocol` (cold_start / stuck / bored / normal) |
| `analytics-events.ts` | Typed event definitions and `eventFromAdaptivePlan` helper |
| `experiments.ts` | `assignVariant`, `hashToFloat` — deterministic A/B assignment |
| `experiments-catalog.ts` | Named catalog of experiments (`EXPERIMENT_1`, `EXPERIMENTS`) |
| `zombie-detection.ts` | Item health scoring for retirement decisions |

### `apps/api`

Hono server at port 3001:

| Route | Description |
|-------|-------------|
| `POST /api/auth/signup` | Register + issue JWT |
| `POST /api/auth/login` | Authenticate + issue JWT |
| `POST /api/auth/oauth/google` | Google OIDC token → JWT |
| `POST /api/auth/oauth/apple` | Apple identity token → JWT |
| `GET /api/session` | Generate adaptive session plan |
| `POST /api/review` | Record a review result |
| `GET /api/learner` | Learner profile and stats |
| `GET /api/scoring` | Hemisphere score computation |
| `GET /api/experiments/:id/variant` | Variant assignment |
| `POST /api/experiments/:id/exposure` | Record exposure event |
| `GET /metrics` | Prometheus metrics |

Middleware stack (applied globally): `securityHeaders → metricsMiddleware → [authMiddleware]`

### `apps/web`

Next.js 15 App Router at port 3000:

| Directory | Contents |
|-----------|----------|
| `src/app/session/` | Main session loop UI |
| `src/app/dashboard/analytics/` | Analytics dashboard |
| `src/components/interactions/` | 6 interaction components (MultipleChoice, ShortAnswer, CategorizationDnD, SequencingDnD, CreativeSynthesis, ConnectionMapping) |
| `src/hooks/` | `useExperiment`, client hooks |
| `src/lib/motion.ts` | Framer Motion stage-aware variants |
| `src/lib/sound.ts` | Web Audio API procedural sound system |
| `src/lib/offline-db.ts` | IndexedDB outbox for offline review submissions |
| `public/sw.js` | Service worker (cache-first static, network-first API, background sync) |

---

## Data Flow: Review Session

```
1. Schedule   GET /api/session
              → adaptive-selection.ts picks items by:
                 hemisphere balance, retrievability, difficulty, session type

2. Select     Client receives session plan
              → useExperiment assigns variant (rh-lh-rh vs lh-only)
              → Items ordered by stage: encounter → analysis → return

3. Present    Interaction component renders (CategorizationDnD, etc.)
              → Framer Motion animates stage transitions
              → Sound events fire on correct/incorrect

4. Record     POST /api/review  { itemId, rating, responseMs }
              → FSRS updates stability + difficulty
              → reviewOutcome analytics event emitted
              → If offline: queued to IndexedDB, synced via background sync

5. Update     LearnerProfile updated:
              → hemisphereScore adjusted ±
              → masteredItems / reviewQueue updated
              → zombieDetection runs — flags items with ≥3 failures
```

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **FSRS-5** | State-of-the-art spaced repetition; outperforms SM-2 on retention benchmarks; open algorithm |
| **Hemisphere model** | Differentiates encounter (RH) / analysis (LH) / return (RH) stages — core product differentiator |
| **Hono.js** | Ultra-lightweight, TypeScript-first, works on Node/edge/Cloudflare Workers |
| **Next.js App Router** | Server components for fast initial load; 'use client' only where interactivity is needed |
| **Drizzle ORM** | Type-safe SQL; no magic; migrations are plain SQL |
| **Deterministic A/B** | `hashToFloat(userId + experimentId)` — no DB needed for variant assignment, fully reproducible |

---

## Extension Points

**New interaction type:**
1. Add type to `ItemType` union in `packages/shared/src/types.ts`
2. Create component in `apps/web/src/components/interactions/`
3. Export from `apps/web/src/components/interactions/lazy.ts`
4. Handle the type in the session page switcher

**New experiment:**
1. Add `ExperimentConfig` to `packages/shared/src/experiments-catalog.ts`
2. Reference in `useExperiment` hook or API `/variant` endpoint
3. Log exposure events via `POST /api/experiments/:id/exposure`

**New analytics event:**
1. Add typed event interface to `packages/shared/src/analytics-events.ts`
2. Add to `AnyAnalyticsEvent` union
3. Call `emitter.emit(createEvent(...))` at the relevant point
