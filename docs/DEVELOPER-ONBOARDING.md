# Developer Onboarding

Welcome to the Hemisphere codebase. This guide covers everything you need to go from a fresh checkout to a running local environment and a working understanding of the project.

---

## Prerequisites

| Tool | Minimum Version | Notes |
|------|----------------|-------|
| Node.js | 20.x | LTS recommended |
| pnpm | 9.x | Workspace manager; do not use npm or yarn |
| Docker | 24.x | Required for the local Postgres instance |

Install pnpm globally if you do not have it:

```bash
npm install -g pnpm@latest
```

---

## Clone and Install

```bash
git clone git@github.com:hemisphere-app/hemisphere.git
cd hemisphere
pnpm install
```

The workspace installs all packages in one pass. `pnpm-workspace.yaml` declares the workspace roots (`apps/*`, `packages/*`). Never run `npm install` inside a sub-package — always install from the root.

---

## Environment Setup

Copy the example env file and fill in the required values:

```bash
cp .env.example .env
```

### Required variables

| Variable | Example | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgres://user:pass@localhost:5432/hemisphere` | Postgres connection string |
| `JWT_SECRET` | 32+ random bytes (hex) | Signing key for access tokens; change before production |
| `PORT` | `3001` | Port the Hono API listens on |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | API base URL exposed to the browser |
| `GOOGLE_CLIENT_ID` | `xxx.apps.googleusercontent.com` | Google OAuth app ID |
| `APPLE_CLIENT_ID` | `com.example.hemisphere` | Apple OAuth service ID |

For local development `GOOGLE_CLIENT_ID` and `APPLE_CLIENT_ID` can be left empty — OAuth flows are not exercised in unit tests. They are required when you need to test the social auth endpoints end-to-end.

### Start the local database

```bash
docker compose -f infrastructure/docker-compose.dev.yml up -d
```

Then run the initial migration and seed:

```bash
pnpm db:seed:dev   # creates schema and seeds development data
```

---

## Running Locally

Open two terminals (or use `pnpm dev` to run everything in parallel via Turborepo):

```bash
# Terminal 1 — Hono API (http://localhost:3001)
pnpm --filter @hemisphere/api dev

# Terminal 2 — Next.js web app (http://localhost:3000)
pnpm --filter @hemisphere/web dev
```

`pnpm dev` at the root runs both in parallel with Turborepo and streams interleaved logs. Use the individual filter commands when you only need one service.

Verify the API is healthy:

```bash
curl http://localhost:3001/health
```

---

## Running Tests

```bash
# Unit tests for the shared package (Vitest)
pnpm --filter @hemisphere/shared test

# End-to-end tests for the web app (Playwright)
pnpm --filter @hemisphere/web test:e2e

# Run all tests from the root
pnpm test
```

---

## Monorepo Structure

```
hemisphere/
├── apps/
│   ├── api/          # Hono HTTP server — auth, sessions, review, admin
│   └── web/          # Next.js 15 App Router — session UI, interactions
├── packages/
│   ├── shared/       # FSRS engine, session state machine, analytics events
│   └── db/           # Drizzle ORM schema and migrations
├── scripts/          # CLI utilities: seed, validate content, FSRS optimise
├── content/          # Curriculum YAML files (topics, items)
├── infrastructure/   # docker-compose files, Kubernetes manifests
└── docs/             # Documentation (you are here)
```

Cross-package imports use workspace package names declared in each `package.json`, for example `import { ... } from '@hemisphere/shared'`.

---

## Key Architectural Patterns

### FSRS Scheduling

All spaced-repetition logic lives in `packages/shared/src/fsrs.ts`. The FSRS-5 algorithm tracks three memory parameters per item per learner:

- **Stability (S)** — days until 90% retention probability drops below threshold
- **Difficulty (D)** — inherent item difficulty, range 1–10
- **Retrievability (R)** — current recall probability, 0–1

When a learner submits a review response the API calls `scheduleHemisphereAwareReview()` from `@hemisphere/shared` to compute the next due date and updated parameters. The review route persists the result back to the `fsrs_cards` table via Drizzle ORM.

### Adaptive Session Engine

`packages/shared/src/adaptive-selection.ts` implements rule-based item selection. It reads each learner's current FSRS states and decides which items to present, in what order, and whether to advance difficulty level. Sessions are planned before they begin; the resulting plan is stored in the session record and consumed item-by-item during the session.

### Hemisphere Model (RH → LH → RH)

Every learning session flows through three stages driven by `packages/shared/src/session-state-machine.ts`:

1. **Encounter** — narrative hook, spatial overview, emotional anchor (right-hemisphere priming)
2. **Analysis** — retrieval practice, categorisation, sequencing (left-hemisphere decomposition)
3. **Return** — reconnection, transfer challenge, creative synthesis (right-hemisphere integration)

The state machine enforces stage ordering, timing constraints, and completion criteria. Session status transitions (`planning → ready → in_progress → completing → completed`) are managed by `sessionStateReducer` in `session-state-reducer.ts`.

---

## Code Conventions

| Area | Convention |
|------|-----------|
| TypeScript | Strict mode enabled (`tsconfig.json` at root); no `any` without a comment explaining why |
| API layer | Hono with typed `AppEnv` context; all route inputs validated with Zod schemas |
| Frontend | Next.js 15 App Router; Server Components by default, `"use client"` only where interactivity requires it |
| Styling | Tailwind CSS; stage-aware theming via CSS custom properties scoped to `data-stage` attribute |
| State | Zustand for ephemeral session state; TanStack Query for server-fetched persistent state |
| Imports | Use workspace package names (`@hemisphere/shared`), not relative `../../` paths across package boundaries |
| File naming | `kebab-case` for modules and utilities; `PascalCase` for React components |
| Tests | Co-locate unit tests in `__tests__/` next to the module being tested |

---

## PR Workflow

1. Branch from `main` using the convention `type/short-description`, e.g. `feat/adaptive-level-3` or `fix/fsrs-lapse-count`.
2. Keep PRs focused — a PR that changes the data model, the API, and the UI simultaneously is hard to review; split it.
3. Run before pushing:
   ```bash
   pnpm typecheck && pnpm lint && pnpm test
   ```
4. Fill in the PR description: what changed, why, and how to test it.
5. Request at least one reviewer. Merge only after approval.
6. Squash commits when merging to keep `main` history clean.

### Review guidelines

- Confirm new API routes have Zod validation for all inputs.
- Confirm new FSRS-related logic includes unit tests in `packages/shared/src/__tests__/`.
- Confirm new interaction types are exported through `apps/web/src/components/interactions/index.ts`.
- Flag any changes to `content-schema.yaml` — these affect validation of the entire content library.

---

## Further Reading

- `docs/ARCHITECTURE.md` — system-level data flow and design decisions
- `docs/CONTENT-AUTHORING.md` — how to add new learning items
- `docs/DEPLOYMENT.md` — production build and release process
- `apps/api/AUTH.md` — auth flow details (JWT, refresh tokens, OAuth)
- `docs/SECURITY.md` — security policies and threat model
