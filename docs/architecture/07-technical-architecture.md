# Technical Architecture: The Hemisphere Learning App

**Version:** 1.0
**Date:** 2026-02-10
**Purpose:** Define the complete technology stack, system architecture, data model, API design, MVP scope, and development roadmap for the Hemisphere Learning App
**Dependencies:** [01-neuroscience-foundation.md](../research/01-neuroscience-foundation.md), [02-pedagogy-and-learning-science.md](../research/02-pedagogy-and-learning-science.md), [03-instructional-design.md](../design/03-instructional-design.md), [04-ui-ux-design.md](../design/04-ui-ux-design.md), [05-sample-content.md](../content/05-sample-content.md), [06-assessment-analytics.md](../design/06-assessment-analytics.md)

---

## Table of Contents

1. [Tech Stack Decision Document](#1-tech-stack-decision-document)
2. [System Architecture](#2-system-architecture)
3. [Data Model Specification](#3-data-model-specification)
4. [API Design Document](#4-api-design-document)
5. [MVP Feature Scope](#5-mvp-feature-scope)
6. [Development Roadmap](#6-development-roadmap)

---

## 1. Tech Stack Decision Document

### 1.1 Frontend Framework: Next.js 15 (React 19)

**Choice:** Next.js 15 with the App Router, running React 19 with Server Components.

**Why chosen over alternatives:**

| Alternative | Why Not |
|------------|---------|
| Vue/Nuxt | Smaller ecosystem for the audio/animation/canvas libraries we need. React's concurrent features (Suspense, Transitions) map directly to our stage-transition system where content streams in progressively. |
| Svelte/SvelteKit | Excellent performance but less mature ecosystem for complex interactive widgets (drag-and-drop categorization, force-directed graphs, drawing canvas). The team would need to build more from scratch. |
| Remix | Strong data-loading patterns, but lacks Next.js's static generation for content pages and its Vercel-optimized deployment pipeline. |
| Vanilla SPA (Vite + React) | No SSR/SSG means worse initial load performance and SEO for marketing pages. Next.js gives us both static content pages and dynamic app pages in one framework. |

**Why Next.js specifically:**
- **Server Components** keep the content delivery fast. Encounter narratives, concept cards, and static media can be server-rendered and cached at the edge, while interactive widgets (drag-and-drop, chord builder, drawing canvas) load as client components.
- **App Router** with nested layouts maps naturally to our screen hierarchy: root layout (auth, theme provider) > dashboard layout (bottom nav) > session layout (stage transitions) > stage-specific content.
- **Route Groups** let us separate the marketing site, the learning app, and the admin dashboard into independent layout trees.
- **Image Optimization** via `next/image` handles our illustration and photography assets (responsive sizing, WebP conversion, lazy loading).
- **Edge Runtime** support enables low-latency API routes for the session engine in regions close to the learner.

**Risks:**
- Next.js App Router is still evolving. Breaking changes between minor versions require ongoing maintenance. Mitigation: pin exact versions, use a monorepo lockfile, run upgrade checks monthly.
- Server Components add complexity to the mental model. Mitigation: establish clear conventions (see Section 2.1) for what is a Server vs. Client Component.

---

### 1.2 Styling: Tailwind CSS 4 + CSS Custom Properties

**Choice:** Tailwind CSS v4 for utility-first styling, with CSS custom properties for the design token system (stage-aware colors, typography, spacing).

**Why chosen over alternatives:**

| Alternative | Why Not |
|------------|---------|
| CSS-in-JS (Emotion, styled-components) | Runtime overhead in a performance-sensitive app. Incompatible with Server Components without additional configuration. |
| CSS Modules | Good isolation but verbose for the scale of stage-specific theming we need. Every component would need conditional class mappings for three visual modes. |
| Vanilla Extract | Zero-runtime CSS-in-TS is appealing, but Tailwind's utility approach is faster for the iterative prototyping phase and produces smaller CSS bundles for our design system. |

**Why Tailwind + Custom Properties:**
- The UI design doc (04) defines a complete token system with three visual modes (Encounter, Analysis, Return). We encode these as CSS custom properties scoped to data attributes:
  ```css
  [data-stage="encounter"] { --bg-primary: #1C1612; --accent: #E8913A; ... }
  [data-stage="analysis"]  { --bg-primary: #0F1419; --accent: #4A9EDE; ... }
  [data-stage="return"]    { --bg-primary: #18121C; --accent: #D4724A; ... }
  ```
- Tailwind classes reference these properties (`bg-[var(--bg-primary)]`), so switching stages only requires changing a single `data-stage` attribute on a container element. All child components adapt automatically.
- Tailwind v4's native CSS integration (no PostCSS config needed) simplifies the build pipeline.
- Stage-transition crossfades are handled by CSS `transition` on the custom properties, with JavaScript controlling timing.

**Risks:**
- Large class strings in JSX can reduce readability. Mitigation: extract repeated patterns into `@apply`-based component classes or use `clsx`/`cva` for conditional class composition.

---

### 1.3 State Management: Zustand + React Query (TanStack Query)

**Choice:** Zustand for client-side application state. TanStack Query for server state (data fetching, caching, synchronization).

**Why chosen over alternatives:**

| Alternative | Why Not |
|------------|---------|
| Redux Toolkit | More boilerplate than Zustand for equivalent functionality. The action/reducer pattern adds ceremony without proportional benefit for our state shape. |
| Jotai/Recoil | Atomic state is excellent for simple cases but becomes hard to reason about for our complex, interdependent session state (current stage, item queue, FSRS calculations, adaptive engine decisions). |
| Context API alone | Performance issues with frequent updates (every learner response triggers state changes in multiple consumers). Context re-renders all consumers; Zustand uses selector-based subscriptions. |

**Why this combination:**
- **Zustand** stores the session engine state: current stage (encounter/analysis/return), item queue, current item index, response history, FSRS state for items in the current session, timer state, and transition state. This is complex, interdependent, and updated frequently (every few seconds during Analysis). Zustand's selector subscriptions prevent unnecessary re-renders.
- **TanStack Query** manages all server-fetched data: learner profile, content items, knowledge state, review queue, analytics data. Its built-in caching, background refetching, and optimistic updates handle the "submit response, update local state immediately, sync to server in background" pattern that makes the app feel responsive.
- The two systems have clean separation: Zustand owns ephemeral session state that exists only while a session is active; TanStack Query owns persistent state that lives on the server.

**Risks:**
- Two state systems increase conceptual overhead. Mitigation: establish a clear boundary (documented in the codebase) between session state (Zustand) and persistent state (TanStack Query). No overlap allowed.

---

### 1.4 Backend: Node.js (TypeScript) on Hono + Serverless

**Choice:** Hono framework running on serverless functions (Vercel Functions / AWS Lambda), with a dedicated long-running process for batch jobs (FSRS optimization, analytics aggregation).

**Why chosen over alternatives:**

| Alternative | Why Not |
|------------|---------|
| Python/FastAPI | Excellent for ML/data work, but introduces a second language in the stack. Our FSRS calculations and adaptive engine logic are algorithmic (not ML training), and TypeScript can handle them efficiently. The LLM integration is HTTP-based and language-agnostic. |
| Go | Performance advantages for concurrent workloads, but our bottleneck is LLM API latency, not server compute. Go's compilation and deployment friction would slow iteration speed in early phases. |
| Express.js | Battle-tested but shows its age. Hono is faster (based on Web Standards APIs), has better TypeScript inference, and runs natively on edge runtimes. |
| tRPC | Excellent type safety between frontend and backend, but couples the API to the React frontend. We want the API to be consumable by future mobile clients (React Native, Flutter) without TypeScript dependency. |

**Why Hono + Serverless:**
- **Hono** is a lightweight, Web Standards-based framework that runs on Vercel Edge Functions, AWS Lambda, Cloudflare Workers, and Node.js. This gives us deployment flexibility without vendor lock-in.
- **Serverless** for the API layer means zero-config scaling. A session-start request that triggers content selection and FSRS calculations scales automatically during peak usage.
- **Shared TypeScript types** between frontend and backend via a shared package in the monorepo. Types for API requests/responses, content items, learner state, and FSRS parameters are defined once and used everywhere.
- A **dedicated worker process** (deployed as a cron-triggered Lambda or a small always-on container) handles weekly batch jobs: FSRS parameter optimization per learner, zombie item detection, analytics aggregation, and LLM scoring queue processing.

**Risks:**
- Cold starts on serverless functions can add 200-500ms latency. Mitigation: use Vercel Edge Functions (which have near-zero cold starts) for latency-sensitive endpoints (session/next-item). Use standard Lambda for less time-sensitive operations (analytics, content management).
- Serverless has a 10-second execution limit on Vercel Edge. FSRS parameter optimization can exceed this. Mitigation: batch jobs run on standard Lambda with a 15-minute timeout, not on Edge.

---

### 1.5 Database: PostgreSQL (Neon) + Redis (Upstash)

**Choice:** PostgreSQL (hosted on Neon) as the primary relational database. Redis (hosted on Upstash) for caching, session state, and real-time features.

**Why chosen over alternatives:**

| Alternative | Why Not |
|------------|---------|
| MongoDB | The learner model, content graph, and FSRS state have deeply relational structures (prerequisites, topic hierarchies, content relationships, per-item-per-learner state). Document databases make these queries expensive. Our data is fundamentally relational. |
| PlanetScale (MySQL) | Good option, but PostgreSQL's JSONB columns give us document-style flexibility where needed (storing content item metadata, adaptive engine configs) alongside relational integrity for the core data model. |
| Supabase | Supabase wraps PostgreSQL and adds auth/storage/realtime. Tempting for rapid development, but introduces an abstraction layer that may conflict with our custom FSRS implementation and batch processing needs. We prefer direct database access for critical paths. |
| CockroachDB | Distributed SQL is overkill for our initial scale. Neon provides connection pooling, branching, and serverless scaling without the complexity of distributed transactions. |

**Why PostgreSQL + Redis:**
- **PostgreSQL on Neon** provides:
  - Relational integrity for the content graph (prerequisite chains, topic hierarchies, content relationships defined in the instructional design doc Section 5.5).
  - JSONB columns for semi-structured data (content item metadata, learner cognitive profile, adaptive engine configs) where schema flexibility is needed.
  - Full-text search for content management (topic search, content item search).
  - Neon's serverless driver enables HTTP-based queries from Edge Functions without persistent connections.
  - Branching for safe schema migrations and preview environments.
- **Redis on Upstash** provides:
  - Session state caching: the active session plan (item queue, current stage, progress) is stored in Redis with a TTL. If the learner refreshes the page or loses connection, the session resumes from Redis.
  - FSRS retrievability cache: retrievability scores (computed from `R(t) = (1 + t / (9 * S))^(-1)`) change continuously but are queried frequently for the review queue. We cache per-item retrievability with a 1-hour TTL and recompute on access if expired.
  - Rate limiting for LLM API calls (per-learner, per-hour limits to control costs).
  - Upstash's REST API works from Edge Functions without TCP connections.

**Risks:**
- PostgreSQL connection limits with serverless functions. Mitigation: Neon's connection pooler handles this natively. We also use Neon's HTTP driver for simple queries from Edge Functions, which does not consume persistent connections.
- Redis data loss on restart. Mitigation: Redis is used only for caching and ephemeral state. All critical data (learner model, FSRS state, assessment events) is persisted to PostgreSQL. Redis loss causes a brief cache-miss penalty, not data loss.

---

### 1.6 AI/LLM Integration: Claude API (Anthropic) with Caching Layer

**Choice:** Anthropic's Claude API (Claude 3.5 Sonnet for scoring, Claude 3.5 Haiku for lightweight tasks) for RH assessment scoring and Socratic dialogue.

**Why chosen over alternatives:**

| Alternative | Why Not |
|------------|---------|
| OpenAI GPT-4o | Comparable quality for rubric scoring, but higher cost per token. Claude's longer context window (200K) is useful for feeding full rubrics + learner history + model answers in a single call. |
| Open-source models (Llama, Mistral) | Self-hosting introduces infrastructure burden (GPU instances, model serving, scaling). The cost savings are marginal at our initial scale, and quality for nuanced rubric scoring is not yet competitive. |
| Google Gemini | Good alternative. Claude is preferred for its instruction-following precision, which matters for consistent rubric-based scoring where the model must assign a specific 0-4 score with justification. |

**LLM usage patterns:**

1. **RH Assessment Scoring** (Claude 3.5 Sonnet): Receives the rubric, the learner's response, a model answer, and the concept definition. Returns a score (0-4) and a 1-2 sentence justification. Estimated ~500 tokens per call. Cost: ~$0.003 per scoring event.
2. **Socratic Follow-up Questions** (Claude 3.5 Haiku): After a teaching prompt or transfer challenge, generates a contextual follow-up question. Lower-quality model is acceptable here because the output is a single question, not a nuanced evaluation. Estimated ~200 tokens per call. Cost: ~$0.0002 per call.
3. **Zombie Item Elaboration Scoring** (Claude 3.5 Sonnet): When a zombie item is detected, the learner is asked to elaborate. The LLM scores the elaboration. Same cost as RH assessment scoring.

**Cost management:**
- **Prompt caching:** Claude supports prompt caching. The rubric, model answer, and concept definition are static per content item. We structure prompts so the static portion is the prefix, and only the learner's response varies. This reduces cost by ~80% for repeated scorings of the same assessment type.
- **Batching:** Non-urgent scoring (zombie detection, weekly analytics) is batched into asynchronous queue processing to take advantage of batch API pricing.
- **Fallback to self-assessment:** If the LLM service is down or the learner's budget is exhausted, the system falls back to rubric-based self-assessment (as specified in the assessment doc Section 6.5, Failsafe 4).
- **Cost budget per learner:** Approximately 3-5 LLM-scored items per session. At ~$0.003 per call and ~1 session per day, this is ~$0.015/learner/day or ~$0.45/learner/month. At 10,000 learners: ~$4,500/month in LLM costs.

**Risks:**
- LLM scoring inconsistency. Mitigation: Use structured output (JSON mode) with explicit rubric criteria. Periodically validate LLM scores against human ratings (the A/B testing plan in assessment doc Section 5 includes this). Temperature set to 0 for scoring calls.
- API latency (1-3 seconds per call). Mitigation: Fire LLM scoring asynchronously after the learner submits. Show the model answer immediately; display the LLM score when it arrives (usually within 2 seconds). The learner is never blocked waiting for LLM scoring.
- Vendor lock-in. Mitigation: wrap all LLM calls in an adapter interface (`LLMScoringService`) with implementations for Claude, OpenAI, and a local mock. Switching providers requires implementing one new adapter.

---

### 1.7 Real-Time/Offline: Progressive Web App (PWA) with Service Workers

**Choice:** Progressive Web App with a service worker for offline-capable content delivery and session continuity.

**Why chosen over alternatives:**

| Alternative | Why Not |
|------------|---------|
| Native iOS/Android apps | Highest quality for audio, haptics, and animations, but doubles the development effort. PWA with modern browser APIs (Web Audio, Vibration API, Web Animations API) achieves 85-90% of native quality. Native apps can follow in Phase 5+ once the product is validated. |
| React Native / Expo | Cross-platform native, but adds complexity (native modules, build tooling, app store review). Our audio/animation requirements are achievable in the browser. The PWA approach lets us validate faster. |
| Electron (desktop) | Desktop is not a priority target. A responsive web app covers desktop browsers without a separate build. |

**Offline strategy:**
- **Content pre-caching:** When a learner starts a session, the service worker pre-fetches all content items (text, images, audio) for the current session plus the next likely session. Content is stored in Cache Storage with a per-content-item versioning scheme.
- **Session state persistence:** The active session plan is stored in both Redis (server) and IndexedDB (client). If the learner goes offline mid-session, they can continue. Responses are queued in IndexedDB and synced to the server when connectivity returns.
- **FSRS calculations run client-side:** The FSRS retrievability formula (`R(t) = (1 + t / (9 * S))^(-1)`) and scheduling calculations run in the browser. The client has a copy of the learner's FSRS parameters (synced periodically). This means the review queue can be computed offline.
- **LLM scoring is deferred:** RH assessments submitted offline are queued for LLM scoring when connectivity returns. The learner sees the model answer immediately (cached with the content) but receives the LLM-scored feedback later, with a notification.

**Risks:**
- Service worker complexity and debugging difficulty. Mitigation: use Workbox (Google's service worker library) for caching strategies. Use Serwist (the Workbox successor for Next.js) for PWA integration.
- IndexedDB storage limits vary by browser. Mitigation: monitor storage usage, evict oldest cached sessions when approaching limits, and keep total offline storage under 100MB.

---

### 1.8 Audio/Media Handling: Web Audio API + Howler.js

**Choice:** Web Audio API for ambient sound synthesis and spatial audio. Howler.js as a convenience layer for audio file playback (narration, sound effects, musical examples).

**Why this matters:** The UI design doc (04) specifies a sophisticated audio design: ambient pads in Encounter, transition chimes, feedback sounds in Analysis, and shimmer effects in Return. Audio is a primary mode-signaling tool, not decoration.

**Implementation:**
- **Ambient pads:** Generated via Web Audio API oscillators and gain nodes. A sustained C major chord (three oscillators at C4, E4, G4 frequencies, shaped with a gentle attack/release envelope) serves as the Encounter ambient. This avoids loading audio files for ambient sound.
- **Narration and musical examples:** Pre-recorded audio files served as AAC (64-128kbps). Played via Howler.js, which handles browser compatibility, sprite maps, and volume control.
- **Transition sounds:** Short synthesized tones (descending two-note for Encounter-to-Analysis, ascending three-note for Analysis-to-Return) generated via Web Audio API. Parameters defined in the sound design spec from doc 04.
- **Spatial audio:** The UI spec mentions spatial positioning for narration. Web Audio API's `PannerNode` can position the narrator's voice slightly left-of-center with the ambient sound slightly right, creating dimension.
- **User controls:** Global sound on/off toggle, plus per-category volume sliders (ambient, feedback, transitions) stored in user preferences.

**Risks:**
- Web Audio API is blocked until user interaction on iOS Safari. Mitigation: resume the AudioContext on the first user tap/click. The session start screen ("How much time do you have?") guarantees a user interaction before any audio plays.

---

### 1.9 Animation Library: Framer Motion + CSS Animations

**Choice:** Framer Motion for complex, mode-aware component animations. CSS animations and transitions for simple property changes (color crossfades, opacity, transforms).

**Why chosen over alternatives:**

| Alternative | Why Not |
|------------|---------|
| GSAP | More powerful for timeline-based animation, but adds a large dependency (42KB) and its license restricts use in SaaS products without a paid plan. |
| React Spring | Physics-based animations are excellent, but Framer Motion's layout animations (AnimatePresence, layoutId) handle our page transitions and card stacks more naturally. |
| Anime.js | Lightweight but lacks React integration for mount/unmount animations, which are critical for stage transitions. |
| Lottie | Good for pre-designed animations (loading spinners, success states) but not for the dynamic, property-driven animations our stage system requires. We may use Lottie for isolated decorative animations. |

**Implementation by stage (per UI doc Section 2.7):**
- **Encounter motion:** `cubic-bezier(0.25, 0.46, 0.45, 0.94)`, 400-800ms. Framer Motion `variants` with `transition: { ease: [0.25, 0.46, 0.45, 0.94], duration: 0.6 }`. Parallax scroll effects via Framer Motion's `useScroll` and `useTransform`.
- **Analysis motion:** `cubic-bezier(0.4, 0.0, 0.2, 1)`, 150-300ms. Framer Motion for drag-and-drop (categorization, sequencing). The `Reorder` component handles sortable lists. Feedback animations (correct pulse, incorrect shake) use CSS keyframes for performance.
- **Return motion:** `cubic-bezier(0.22, 0.61, 0.36, 1)`, 500-1000ms. Framer Motion for the zoom-out "stepping back" effect and the golden glow insight animation.
- **Stage transitions:** CSS transitions on custom properties (background color, typography) for the 1.5-2 second crossfade. Framer Motion `AnimatePresence` for content mount/unmount during the transition pause.

**Risks:**
- Framer Motion bundle size (~32KB gzipped). Mitigation: tree-shake unused features. Most components use only `motion.div`, `AnimatePresence`, and `Reorder`. The full feature set (3D transforms, SVG animations) can be lazy-loaded.

---

### 1.10 Testing: Vitest + Playwright + axe-core

**Choice:**

| Layer | Tool | Scope |
|-------|------|-------|
| Unit tests | Vitest | FSRS calculations, adaptive engine decisions, scoring functions, utility functions |
| Component tests | Vitest + React Testing Library | Individual UI components (recall card, categorization widget, stage transition) |
| Integration tests | Vitest | API endpoint handlers, database queries, session composition algorithm |
| End-to-end tests | Playwright | Full session flow (start session > Encounter > Analysis > Return > complete), auth flow, offline behavior |
| Accessibility tests | axe-core (integrated into Playwright) + manual audit | WCAG 2.1 AA compliance for all screens |
| Visual regression | Playwright visual comparisons | Stage-specific visual modes (verify color palettes, typography shifts) |

**Why Vitest over Jest:** Vitest uses the same Vite transform pipeline as the app, eliminating configuration drift between test and production environments. It is 2-10x faster than Jest for large test suites due to native ESM support.

**Critical test paths:**
1. FSRS stability calculation produces correct intervals for all rating combinations.
2. Hemisphere-aware FSRS extensions (Encounter initial stability bonus, Return concept-level scheduling) behave as specified.
3. Adaptive engine produces correct decisions for edge cases (cold start, contradictory signals, extreme values).
4. Session composition algorithm respects priority ordering (overdue > due > new > interleaved).
5. Stage transitions render correct visual modes (color, typography, animation timing).
6. Drag-and-drop interactions work on mobile touch and desktop mouse.
7. Offline session continuation: start session online, disconnect, complete session, reconnect, verify sync.

---

### 1.11 Hosting/Deployment: Vercel + Neon + Upstash

**Choice:** Vercel for the Next.js application. Neon for PostgreSQL. Upstash for Redis. All serverless, all with generous free tiers for development.

**Why Vercel:**
- First-class Next.js support (Vercel maintains Next.js). Edge Functions, ISR, and Image Optimization work without additional configuration.
- Preview deployments for every pull request. Content authors can preview new lessons on a unique URL before merging.
- Analytics built in (Web Vitals, function invocation metrics).
- Global CDN for static assets (images, audio, cached content).

**Why not AWS/GCP directly:**
- AWS is more flexible and cheaper at scale, but the operational overhead (CloudFront configuration, Lambda deployment, RDS management) is not justified until we exceed Vercel's limits. We can migrate to AWS in Phase 5 if needed.
- Vercel's abstraction lets the team focus on product, not infrastructure, during the critical early phases.

**Cost estimate (1,000 active learners):**
| Service | Tier | Monthly Cost |
|---------|------|-------------|
| Vercel | Pro | $20 |
| Neon | Launch | $19 |
| Upstash Redis | Pay-as-you-go | ~$10 |
| Claude API (LLM) | Pay-per-token | ~$450 |
| Vercel Blob (media storage) | Pay-as-you-go | ~$5 |
| **Total** | | **~$504/month** |

At 10,000 learners, LLM costs dominate (~$4,500/month). Infrastructure costs scale modestly (~$200/month). Total: ~$5,000/month.

---

### 1.12 Analytics: PostHog (Self-Hosted or Cloud)

**Choice:** PostHog for product analytics, user behavior tracking, and feature flags (which double as A/B test infrastructure).

**Why chosen over alternatives:**

| Alternative | Why Not |
|------------|---------|
| Mixpanel | Expensive at scale. PostHog's event-based pricing is more predictable and generous. |
| Amplitude | Good product, but PostHog's open-source foundation means we can self-host for data sovereignty if needed. |
| Custom analytics | Building our own analytics pipeline is a significant engineering effort that distracts from the core product. PostHog covers 90% of our needs out of the box. |

**PostHog covers:**
- **Event tracking:** Every learner interaction (session start, stage transition, item response, LLM scoring result) is tracked as a PostHog event. This feeds the admin analytics dashboard (assessment doc Section 4.2).
- **Feature flags:** PostHog feature flags serve as the A/B testing infrastructure. Each experiment (assessment doc Section 5) is a feature flag with percentage-based rollout and user property targeting.
- **Funnels:** Session completion funnels (start > Encounter > Analysis > Return > complete) identify dropout points.
- **Cohort analysis:** User segmentation by engagement level, HBS, topic, and experiment assignment.

**The admin dashboard described in the assessment doc (Section 4.2) is a custom-built UI** that queries PostHog's API for aggregate metrics and the PostgreSQL database for learner model data. PostHog is the data collection layer; the dashboard is the presentation layer.

---

## 2. System Architecture

### 2.1 High-Level Architecture Diagram

```
+------------------------------------------------------------------+
|                        LEARNER DEVICE                            |
|                                                                  |
|  +----------------------------------------------------------+   |
|  |                    NEXT.JS APP (PWA)                      |   |
|  |                                                           |   |
|  |  +-------------+  +-------------+  +------------------+  |   |
|  |  | Session      |  | Content     |  | Offline          |  |   |
|  |  | Engine       |  | Renderer    |  | Manager          |  |   |
|  |  | (Zustand)    |  | (React)     |  | (Service Worker) |  |   |
|  |  +------+-------+  +------+------+  +--------+---------+  |   |
|  |         |                 |                   |            |   |
|  |  +------+-------+  +-----+------+  +---------+--------+  |   |
|  |  | FSRS Client  |  | Audio      |  | IndexedDB        |  |   |
|  |  | Calculator   |  | Engine     |  | (Offline Queue)  |  |   |
|  |  +--------------+  | (Web Audio)|  +------------------+  |   |
|  |                     +------------+                        |   |
|  +----------------------------------------------------------+   |
+------------------------------------------------------------------+
         |                    |                    |
         | HTTPS              | HTTPS              | HTTPS
         v                    v                    v
+------------------------------------------------------------------+
|                      VERCEL EDGE NETWORK                         |
|                                                                  |
|  +----------------------------------------------------------+   |
|  |               NEXT.JS API ROUTES (Hono)                   |   |
|  |                                                           |   |
|  |  +------------+ +------------+ +------------+ +--------+ |   |
|  |  | Auth       | | Session    | | Content    | | Review | |   |
|  |  | Service    | | Service    | | Service    | | Service| |   |
|  |  +-----+------+ +-----+------+ +-----+------+ +---+----+ |   |
|  |        |              |              |             |       |   |
|  |  +-----+--------------+--------------+-------------+---+  |   |
|  |  |              CORE SERVICES LAYER                    |  |   |
|  |  |                                                     |  |   |
|  |  |  +------------------+  +------------------------+   |  |   |
|  |  |  | Adaptive Engine  |  | FSRS Scheduler         |   |  |   |
|  |  |  | (Decision Maker) |  | (Server-Side Authority)|   |  |   |
|  |  |  +--------+---------+  +-----------+------------+   |  |   |
|  |  |           |                        |                |  |   |
|  |  |  +--------+---------+  +-----------+------------+   |  |   |
|  |  |  | Learner Model    |  | Content Graph          |   |  |   |
|  |  |  | Manager          |  | Manager                |   |  |   |
|  |  |  +------------------+  +------------------------+   |  |   |
|  |  +-----------------------------------------------------+  |   |
|  +----------------------------------------------------------+   |
+------------------------------------------------------------------+
         |              |              |              |
         v              v              v              v
+------------+  +------------+  +------------+  +------------+
| PostgreSQL |  | Redis      |  | Claude API |  | PostHog    |
| (Neon)     |  | (Upstash)  |  | (Anthropic)|  | (Analytics)|
|            |  |            |  |            |  |            |
| - Users    |  | - Session  |  | - RH Score |  | - Events   |
| - Content  |  |   Cache    |  | - Socratic |  | - Funnels  |
| - Learner  |  | - FSRS     |  |   Dialogue |  | - A/B Tests|
|   Model    |  |   Cache    |  | - Zombie   |  | - Feature  |
| - FSRS     |  | - Rate     |  |   Scoring  |  |   Flags    |
|   State    |  |   Limits   |  |            |  |            |
| - Events   |  |            |  |            |  |            |
+------------+  +------------+  +------------+  +------------+
         |
         v
+------------------------------------------------------------------+
|                    BATCH PROCESSING (Lambda/Cron)                 |
|                                                                  |
|  +------------------+  +------------------+  +----------------+  |
|  | FSRS Parameter   |  | Analytics        |  | Zombie Item    |  |
|  | Optimizer        |  | Aggregator       |  | Detector       |  |
|  | (Weekly per user)|  | (Daily/Weekly)   |  | (Weekly)       |  |
|  +------------------+  +------------------+  +----------------+  |
+------------------------------------------------------------------+
```

### 2.2 Frontend Architecture

#### 2.2.1 Component Hierarchy

```
App (Root Layout)
  |
  +-- AuthProvider (Zustand + cookies)
  +-- ThemeProvider (stage-aware CSS custom properties)
  +-- QueryClientProvider (TanStack Query)
  |
  +-- (marketing)         -- Route group: landing page, about, pricing
  |     +-- LandingPage
  |     +-- AboutPage
  |
  +-- (app)               -- Route group: authenticated learning app
  |     +-- AppLayout     -- Bottom nav, global state initialization
  |     |
  |     +-- /dashboard    -- Home screen
  |     |     +-- Greeting
  |     |     +-- KnowledgeMapPreview (D3 force graph, mini version)
  |     |     +-- NextSessionCard
  |     |     +-- StatsRow
  |     |     +-- DueForReview
  |     |     +-- RecentActivity
  |     |
  |     +-- /map          -- Full knowledge map
  |     |     +-- KnowledgeMap (D3 force graph, full interactive)
  |     |
  |     +-- /journal      -- Learning journal
  |     |     +-- JournalEntryList
  |     |     +-- JournalEntry
  |     |
  |     +-- /session      -- Session flow (the core)
  |     |     +-- SessionLayout (manages stage transitions)
  |     |     |
  |     |     +-- /session/start     -- "How much time?"
  |     |     +-- /session/encounter -- Encounter stage
  |     |     |     +-- HookScreen
  |     |     |     +-- NarrativeFrame (swipeable cards)
  |     |     |     +-- SpatialOverview (zoomable concept map)
  |     |     |     +-- EmotionalAnchor
  |     |     |     +-- PredictionPrompt
  |     |     |
  |     |     +-- /session/transition-ea  -- E->A transition (auto)
  |     |     +-- /session/analysis      -- Analysis stage
  |     |     |     +-- ProgressBar
  |     |     |     +-- ActiveRecallCard
  |     |     |     +-- MultipleChoiceCard
  |     |     |     +-- CategorizationExercise (drag-and-drop)
  |     |     |     +-- SequencingTask (sortable list)
  |     |     |     +-- DefinitionMatching
  |     |     |     +-- WorkedExample
  |     |     |     +-- FillInTheBlank
  |     |     |     +-- FeedbackCard
  |     |     |     +-- SelfRatingButtons
  |     |     |
  |     |     +-- /session/transition-ar  -- A->R transition (auto)
  |     |     +-- /session/return        -- Return stage
  |     |     |     +-- ReconnectionScreen
  |     |     |     +-- TransferChallenge
  |     |     |     +-- CreativeSynthesis
  |     |     |     +-- ReflectionPrompt
  |     |     |     +-- ForwardGlimpse
  |     |     |
  |     |     +-- /session/complete      -- Session summary
  |     |
  |     +-- /review       -- Standalone review session
  |     +-- /profile      -- Learner profile and settings
  |     +-- /analytics    -- Learner dashboard (analytics)
  |           +-- KnowledgeMapViz
  |           +-- LearningVelocityGraph
  |           +-- HemisphereBalanceIndicator
  |           +-- RetentionForecast
  |           +-- SessionHistory
  |           +-- MetacognitiveTracker
  |
  +-- (admin)             -- Route group: content management & admin
        +-- AdminLayout
        +-- /admin/content    -- Content CRUD
        +-- /admin/analytics  -- Cohort analytics dashboard
        +-- /admin/experiments -- A/B test management
```

#### 2.2.2 Session Engine (Zustand Store)

The session engine is the most complex piece of client-side state. It manages the full RH->LH->RH flow.

```typescript
interface SessionStore {
  // Session metadata
  sessionId: string | null;
  sessionType: 'quick' | 'standard' | 'extended';
  topicId: string;
  startedAt: Date | null;

  // Stage management
  currentStage: 'encounter' | 'transition-ea' | 'analysis' |
                 'transition-ar' | 'return' | 'complete';
  stageBalance: { encounter: number; analysis: number; return: number };

  // Encounter state
  encounterActivities: EncounterActivity[];
  encounterIndex: number;
  predictionResponse: string | null;

  // Analysis state
  analysisItems: AnalysisItem[];
  analysisIndex: number;
  responses: ResponseRecord[];
  currentAccuracy: number;

  // Return state
  returnActivities: ReturnActivity[];
  returnIndex: number;
  transferResponse: string | null;
  creativeResponse: string | null;
  reflectionResponse: string | null;
  confidenceRating: number | null;

  // FSRS (client-side copy for offline)
  fsrsUpdates: FSRSUpdate[];

  // Actions
  startSession: (plan: SessionPlan) => void;
  advanceEncounter: () => void;
  submitPrediction: (text: string) => void;
  transitionToAnalysis: () => void;
  submitResponse: (itemId: string, response: any) => void;
  selfRate: (itemId: string, rating: 'got_it' | 'partially' | 'missed_it') => void;
  transitionToReturn: () => void;
  advanceReturn: () => void;
  submitTransfer: (text: string) => void;
  submitCreative: (text: string) => void;
  submitReflection: (text: string, confidence: number) => void;
  completeSession: () => void;
  syncToServer: () => Promise<void>;
}
```

#### 2.2.3 Routing and Navigation

The session flow uses a **single route** (`/session`) with the stage managed by the Zustand store, not by URL segments. This prevents the browser back button from breaking the session flow. Stage transitions are animated within the session layout component.

Navigation between the three main app sections (Home, Map, Journal) uses bottom tabs with `next/link` for instant client-side navigation.

The admin section is a separate route group with its own layout and auth guard (admin role required).

### 2.3 Backend API Architecture

```
API Routes (Hono on Vercel)
  |
  +-- /api/auth
  |     +-- POST /signup
  |     +-- POST /login
  |     +-- POST /refresh
  |     +-- POST /logout
  |
  +-- /api/content
  |     +-- GET  /topics
  |     +-- GET  /topics/:id
  |     +-- GET  /topics/:id/items
  |     +-- GET  /items/:id
  |     +-- POST /items (admin)
  |     +-- PUT  /items/:id (admin)
  |
  +-- /api/session
  |     +-- POST /start           -- Start session, get plan
  |     +-- POST /response        -- Submit item response
  |     +-- POST /complete        -- Complete session
  |     +-- GET  /active          -- Resume active session
  |
  +-- /api/learner
  |     +-- GET  /profile
  |     +-- PUT  /profile
  |     +-- GET  /knowledge-state
  |     +-- GET  /analytics
  |     +-- GET  /hemisphere-balance
  |
  +-- /api/review
  |     +-- GET  /queue           -- Get review items due
  |     +-- POST /submit          -- Submit review rating
  |
  +-- /api/admin
        +-- GET  /analytics/cohort
        +-- GET  /analytics/content
        +-- GET  /experiments
        +-- POST /experiments
        +-- PUT  /experiments/:id
```

### 2.4 Content Management System

Content is authored and stored as structured data in PostgreSQL, not as files in a CMS.

**Authoring workflow:**
1. Content authors write content in a structured YAML/JSON format that matches the metadata schema (instructional design doc Section 5.4).
2. Content is committed to a Git repository (the same monorepo, in a `/content` directory).
3. A CI pipeline validates the content against the schema, checks for broken prerequisite references, and verifies all media assets exist.
4. On merge to main, a seeding script upserts the content into PostgreSQL.
5. Media assets (images, audio) are uploaded to Vercel Blob storage and referenced by URL in the content records.

**Why not a headless CMS (Contentful, Sanity, Strapi)?**
- Our content has complex relational structure (prerequisites, interleave pairs, cross-topic links, difficulty variants, stage sequences). Headless CMSes model content as flat documents with references, which makes the content graph queries expensive and the authoring experience for relationships poor.
- The content metadata schema is highly specific to our domain. Adapting a generic CMS to enforce our schema (bloom_level, hemisphere_mode, stage_type, FSRS parameters) would require extensive custom fields and validation.
- Storing content in the database alongside the learner model simplifies queries like "get all Analysis items for topic X at difficulty level 2 that the learner has not yet seen."

**Content versioning:** Each content item has a `version` field. When content is updated, a new version is created (the old version is soft-deleted). Learner progress is linked to specific content versions so that FSRS state remains valid even if a content item's text changes.

### 2.5 FSRS Engine Architecture

**Split execution model:** FSRS calculations run in two places.

**Client-side (for responsiveness and offline):**
- Retrievability calculation: `R(t) = (1 + t / (9 * S))^(-1)`. Runs in the browser to display the review queue and "due for review" indicators without server round-trips.
- Interval calculation: `interval = S * (target_retention^(-1/w[17]) - 1)`. Runs in the browser to show "next review in X days" after a review.
- The client holds a copy of the learner's FSRS parameters (19 weights) synced from the server.

**Server-side (authority):**
- Stability update: `S' = S * (1 + ...)` with the full formula from assessment doc Section 3.1.3. Runs on the server when a response is submitted. The result is persisted to PostgreSQL.
- Difficulty update: `D' = w[7] * D_init + (1 - w[7]) * (D - w[6] * (rating - 3))`. Server-side, persisted.
- Parameter optimization: Weekly batch job that re-fits FSRS parameters per learner using their review history. Runs on Lambda.
- Session composition: The server computes the item queue for each session (assessment doc Section 3.3), including overdue prioritization, topic mixing, and ordering.

**Why not all client-side?**
- The server is the authority for FSRS state. If the client and server disagree (due to offline divergence), the server's state wins during sync.
- Parameter optimization requires access to the full review history, which should not be transferred to the client.

**Why not all server-side?**
- Retrievability is a function of time. It changes every second. Querying the server every time the dashboard renders would be wasteful. The client can compute it locally.

### 2.6 LLM Service Architecture

```
Learner submits RH response
  |
  v
Frontend sends response to /api/session/response
  |
  v
API handler:
  1. Persist response to assessment_events table
  2. Return model answer to frontend immediately (from content item)
  3. Enqueue LLM scoring job
  |
  v
LLM Scoring Queue (Redis list):
  - Job: { eventId, rubricId, conceptDefinition, modelAnswer, learnerResponse }
  |
  v
LLM Worker (runs on a short-polling loop or triggered by queue):
  1. Dequeue job
  2. Build prompt:
     - System: "You are a learning assessment scorer. Score the following response..."
     - Static prefix (cached): rubric + concept definition + model answer
     - Dynamic suffix: learner's response
  3. Call Claude API with temperature=0, structured JSON output
  4. Parse response: { score: 0-4, justification: string }
  5. Persist score to assessment_events table
  6. Update learner model (KC rh_score, FSRS state)
  7. Notify frontend via server-sent event or next poll
```

**Cost controls:**
- Rate limit: max 10 LLM calls per learner per hour (stored in Redis).
- Prompt caching: Claude's prompt caching reduces cost for repeated rubric/concept pairings.
- Batch processing: non-urgent scoring (zombie detection, weekly calibration) runs as batched API calls during off-peak hours.

### 2.7 Analytics Pipeline

```
Learner interaction
  |
  v
Frontend: posthog.capture('item_response', {
  sessionId, stageType, itemId, assessmentType,
  isCorrect, latencyMs, helpRequested, confidenceRating
})
  |
  v
PostHog Cloud (event ingestion)
  |
  v
PostHog queries (via API) <-- Admin Dashboard frontend
  |                             queries PostHog for:
  |                             - Cohort funnels
  |                             - Feature flag results
  |                             - Event counts
  |
  v
Daily batch job (Lambda):
  - Query PostHog events via API
  - Aggregate into admin-facing metrics
  - Persist to PostgreSQL analytics tables:
    - cohort_learning_outcomes
    - content_effectiveness
    - hemisphere_balance_distribution
    - dropout_risk_summary
```

### 2.8 A/B Testing Infrastructure

A/B tests use PostHog feature flags with server-side evaluation.

**Setup for an experiment (e.g., Experiment 1 from assessment doc Section 5.2):**

1. Create a PostHog feature flag: `experiment-rh-lh-rh-vs-lh-only`
2. Configure: 50% control (LH-only), 50% treatment (full RH-LH-RH). Stratified by `learner_experience` property.
3. In the session composition API (`/api/session/start`), evaluate the feature flag for the current user.
4. If control: compose session with abbreviated Encounter, extended Analysis, brief summary (no Return).
5. If treatment: compose standard session.
6. All learner events include the experiment assignment as a property.
7. PostHog's Experimentation feature computes statistical significance automatically.

**Custom analysis** (ANCOVA, Bayesian factors) is performed by the weekly batch job, which exports event data from PostHog and runs the analysis in a Python script within the Lambda environment.

---

## 3. Data Model Specification

### 3.1 Entity-Relationship Overview

```
+--------+       +----------+       +-----------+
| users  |<----->| learner_ |<----->| fsrs_     |
|        |  1:1  | state    |  1:N  | memory_   |
+--------+       +----------+       | state     |
    |                 |              +-----------+
    |                 |                   |
    | 1:N             | 1:N               | N:1
    v                 v                   v
+--------+      +-----------+      +-----------+
|sessions|      |assessment_|      | content_  |
|        |      |events     |      | items     |
+--------+      +-----------+      +-----------+
                                        |
                                        | N:M
                                        v
                                  +-----------+
                                  | content_  |
                                  |relationships|
                                  +-----------+
                                        |
                                        | N:1
                                        v
                                  +-----------+
                                  | topics    |
                                  +-----------+
                                        |
                                        | N:M
                                        v
                                  +-----------+
                                  |knowledge_ |
                                  |components |
                                  +-----------+
```

### 3.2 SQL DDL

```sql
-- ============================================================
-- USERS AND AUTH
-- ============================================================

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  avatar_url    TEXT,
  role          TEXT NOT NULL DEFAULT 'learner'
                CHECK (role IN ('learner', 'admin', 'content_author')),
  timezone      TEXT DEFAULT 'UTC',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ,
  is_active     BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE user_preferences (
  user_id              UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  theme                TEXT NOT NULL DEFAULT 'dark'
                       CHECK (theme IN ('dark', 'light', 'system')),
  sound_enabled        BOOLEAN NOT NULL DEFAULT true,
  ambient_volume       REAL NOT NULL DEFAULT 0.2,
  feedback_volume      REAL NOT NULL DEFAULT 0.3,
  transition_volume    REAL NOT NULL DEFAULT 0.25,
  preferred_session    TEXT NOT NULL DEFAULT 'standard'
                       CHECK (preferred_session IN ('quick', 'standard', 'extended')),
  daily_reminder_time  TIME,
  daily_reminder_on    BOOLEAN NOT NULL DEFAULT false,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TOPICS AND KNOWLEDGE COMPONENTS
-- ============================================================

CREATE TABLE topics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  topic_path      TEXT[] NOT NULL,  -- e.g., ARRAY['biology','ecology','photosynthesis']
  parent_topic_id UUID REFERENCES topics(id),
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_published    BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE knowledge_components (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id      UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  slug          TEXT NOT NULL,
  name          TEXT NOT NULL,  -- e.g., 'photosynthesis_light_reactions'
  description   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(topic_id, slug)
);

CREATE TABLE kc_prerequisites (
  kc_id             UUID NOT NULL REFERENCES knowledge_components(id) ON DELETE CASCADE,
  prerequisite_id   UUID NOT NULL REFERENCES knowledge_components(id) ON DELETE CASCADE,
  PRIMARY KEY (kc_id, prerequisite_id),
  CHECK (kc_id != prerequisite_id)
);

-- ============================================================
-- CONTENT ITEMS
-- ============================================================

CREATE TABLE content_items (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version            INTEGER NOT NULL DEFAULT 1,
  is_active          BOOLEAN NOT NULL DEFAULT true,

  -- Classification
  item_type          TEXT NOT NULL
                     CHECK (item_type IN (
                       'text_block', 'image_static', 'image_annotated',
                       'audio_clip', 'video_clip', 'interactive_widget',
                       'prompt', 'response_field', 'feedback_block',
                       'transition_marker',
                       'narrative_sequence', 'concept_card', 'practice_set',
                       'worked_example', 'transfer_challenge',
                       'creative_synthesis', 'reflection_prompt',
                       'spatial_overview', 'spaced_review_block',
                       'integration_challenge'
                     )),
  stage              TEXT NOT NULL
                     CHECK (stage IN ('encounter', 'analysis', 'return', 'transition')),
  hemisphere_mode    TEXT NOT NULL
                     CHECK (hemisphere_mode IN ('rh_primary', 'lh_primary', 'integrated')),

  -- Difficulty
  difficulty_level   SMALLINT NOT NULL CHECK (difficulty_level BETWEEN 1 AND 4),
  bloom_level        TEXT NOT NULL
                     CHECK (bloom_level IN (
                       'remember', 'understand', 'apply',
                       'analyze', 'evaluate', 'create'
                     )),
  novice_suitable    BOOLEAN NOT NULL DEFAULT true,
  advanced_suitable  BOOLEAN NOT NULL DEFAULT false,

  -- Topic
  topic_id           UUID NOT NULL REFERENCES topics(id),

  -- Content body (structured JSON)
  body               JSONB NOT NULL,
  -- For prompts: { prompt_text, target_answer, keywords[], distractors[] }
  -- For narrative: { screens: [{ text, image_url, audio_url }] }
  -- For concept_card: { term, definition, diagram_url, audio_url }
  -- etc.

  -- Media
  media_types        TEXT[] NOT NULL DEFAULT '{}',
  estimated_duration_s INTEGER NOT NULL DEFAULT 30,
  file_size_bytes    INTEGER NOT NULL DEFAULT 0,

  -- Spaced repetition
  is_reviewable      BOOLEAN NOT NULL DEFAULT false,
  review_format      TEXT,

  -- Interleaving
  similarity_tags    TEXT[] NOT NULL DEFAULT '{}',
  interleave_eligible BOOLEAN NOT NULL DEFAULT false,

  -- Assessment
  assessment_type    TEXT
                     CHECK (assessment_type IN (
                       'lh_structured', 'rh_open', 'integrated', NULL
                     )),
  auto_scorable      BOOLEAN NOT NULL DEFAULT true,
  rubric_id          UUID,

  -- Accessibility
  alt_text           TEXT,
  transcript         TEXT,
  language           TEXT NOT NULL DEFAULT 'en',

  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_content_items_topic ON content_items(topic_id);
CREATE INDEX idx_content_items_stage ON content_items(stage);
CREATE INDEX idx_content_items_type ON content_items(item_type);
CREATE INDEX idx_content_items_difficulty ON content_items(difficulty_level);
CREATE INDEX idx_content_items_similarity ON content_items USING GIN (similarity_tags);

-- Knowledge components targeted by each content item
CREATE TABLE content_item_kcs (
  content_item_id  UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  kc_id            UUID NOT NULL REFERENCES knowledge_components(id) ON DELETE CASCADE,
  PRIMARY KEY (content_item_id, kc_id)
);

-- ============================================================
-- CONTENT RELATIONSHIPS (The Graph)
-- ============================================================

CREATE TABLE content_relationships (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_item_id  UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  target_item_id  UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  relationship    TEXT NOT NULL
                  CHECK (relationship IN (
                    'prerequisite',      -- source must be mastered before target
                    'same_concept',      -- source and target assess same KC
                    'stage_sequence',    -- source precedes target in E->A->R flow
                    'interleave_pair',   -- source and target benefit from interleaving
                    'cross_topic_link',  -- source and target connect different topics
                    'difficulty_variant',-- source and target are same Q at different levels
                    'narrative_continuation' -- source's story continues in target
                  )),
  metadata        JSONB,  -- optional relationship-specific data
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(source_item_id, target_item_id, relationship)
);

CREATE INDEX idx_content_rel_source ON content_relationships(source_item_id);
CREATE INDEX idx_content_rel_target ON content_relationships(target_item_id);
CREATE INDEX idx_content_rel_type ON content_relationships(relationship);

-- ============================================================
-- ASSESSMENT RUBRICS (for LLM scoring)
-- ============================================================

CREATE TABLE rubrics (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  criteria     JSONB NOT NULL,
  -- { scores: [{ value: 4, label: "Excellent", description: "..." }, ...] }
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- LEARNER STATE (Four-Layer Model)
-- ============================================================

-- Layer 1: Knowledge State - per KC
CREATE TABLE learner_kc_state (
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kc_id              UUID NOT NULL REFERENCES knowledge_components(id) ON DELETE CASCADE,
  mastery_level      REAL NOT NULL DEFAULT 0.0,
  difficulty_tier    SMALLINT NOT NULL DEFAULT 1 CHECK (difficulty_tier BETWEEN 1 AND 4),

  -- LH mastery
  lh_accuracy        REAL NOT NULL DEFAULT 0.0,
  lh_attempts        INTEGER NOT NULL DEFAULT 0,
  lh_last_accuracy   REAL NOT NULL DEFAULT 0.0,

  -- RH mastery
  rh_score           REAL NOT NULL DEFAULT 0.0,
  rh_attempts        INTEGER NOT NULL DEFAULT 0,
  rh_last_score      REAL NOT NULL DEFAULT 0.0,

  -- Integrated
  integrated_score   REAL NOT NULL DEFAULT 0.0,

  -- Timestamps
  first_encountered  TIMESTAMPTZ,
  last_practiced     TIMESTAMPTZ,
  last_assessed_lh   TIMESTAMPTZ,
  last_assessed_rh   TIMESTAMPTZ,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (user_id, kc_id)
);

-- Layer 1: Knowledge State - per topic
CREATE TABLE learner_topic_proficiency (
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic_id           UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  overall_proficiency REAL NOT NULL DEFAULT 0.0,
  kc_count           INTEGER NOT NULL DEFAULT 0,
  kc_mastered        INTEGER NOT NULL DEFAULT 0,
  kc_in_progress     INTEGER NOT NULL DEFAULT 0,
  kc_not_started     INTEGER NOT NULL DEFAULT 0,

  -- Stage balance
  encounter_engagement REAL NOT NULL DEFAULT 0.0,
  analysis_accuracy    REAL NOT NULL DEFAULT 0.0,
  return_quality       REAL NOT NULL DEFAULT 0.0,

  last_session         TIMESTAMPTZ,
  sessions_completed   INTEGER NOT NULL DEFAULT 0,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (user_id, topic_id)
);

-- Layer 2: Behavioral State
CREATE TABLE learner_behavioral_state (
  user_id                    UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  -- Session patterns
  total_sessions             INTEGER NOT NULL DEFAULT 0,
  sessions_last_7_days       INTEGER NOT NULL DEFAULT 0,
  sessions_last_30_days      INTEGER NOT NULL DEFAULT 0,
  average_session_duration_s REAL NOT NULL DEFAULT 0.0,
  session_duration_trend     REAL NOT NULL DEFAULT 0.0,
  preferred_session_time     TEXT DEFAULT 'evening',
  session_completion_rate    REAL NOT NULL DEFAULT 1.0,

  -- Response patterns
  average_latency_ms         REAL NOT NULL DEFAULT 0.0,
  latency_by_type            JSONB NOT NULL DEFAULT '{}',
  latency_trend              REAL NOT NULL DEFAULT 0.0,

  -- Help-seeking
  help_request_rate          REAL NOT NULL DEFAULT 0.0,
  help_type_distribution     JSONB NOT NULL DEFAULT '{}',
  help_request_trend         REAL NOT NULL DEFAULT 0.0,

  -- Stage engagement
  encounter_time_ratio       REAL NOT NULL DEFAULT 0.25,
  analysis_time_ratio        REAL NOT NULL DEFAULT 0.50,
  return_time_ratio          REAL NOT NULL DEFAULT 0.25,
  encounter_engagement_score REAL NOT NULL DEFAULT 0.0,
  return_engagement_score    REAL NOT NULL DEFAULT 0.0,

  -- Confidence calibration
  confidence_accuracy_corr   REAL NOT NULL DEFAULT 0.0,
  calibration_gap            REAL NOT NULL DEFAULT 0.0,

  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Layer 3: Cognitive Profile
CREATE TABLE learner_cognitive_profile (
  user_id                   UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  hemisphere_balance_score  REAL NOT NULL DEFAULT 0.0,
  hbs_history               JSONB NOT NULL DEFAULT '[]',
  hbs_trend                 REAL NOT NULL DEFAULT 0.0,

  modality_preferences      JSONB NOT NULL DEFAULT
    '{"visual":0.25,"auditory":0.25,"textual":0.25,"kinesthetic":0.25}',

  metacognitive_accuracy    REAL NOT NULL DEFAULT 0.5,
  metacognitive_trend       REAL NOT NULL DEFAULT 0.0,

  learning_velocity         REAL NOT NULL DEFAULT 0.0,
  velocity_by_difficulty    JSONB NOT NULL DEFAULT '{}',
  velocity_trend            REAL NOT NULL DEFAULT 0.0,

  strongest_assessment_types TEXT[] DEFAULT '{}',
  weakest_assessment_types   TEXT[] DEFAULT '{}',
  strongest_topics           TEXT[] DEFAULT '{}',
  weakest_topics             TEXT[] DEFAULT '{}',

  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Layer 4: Motivational State
CREATE TABLE learner_motivational_state (
  user_id                UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  engagement_trend       TEXT NOT NULL DEFAULT 'stable'
                         CHECK (engagement_trend IN ('increasing', 'stable', 'declining')),
  engagement_score       REAL NOT NULL DEFAULT 0.5,
  engagement_history     JSONB NOT NULL DEFAULT '[]',

  topic_choice_rate      REAL NOT NULL DEFAULT 0.0,
  exploration_rate       REAL NOT NULL DEFAULT 0.0,
  preferred_session_type TEXT DEFAULT 'standard',

  challenge_tolerance    REAL NOT NULL DEFAULT 0.5,

  session_abandonment_rate REAL NOT NULL DEFAULT 0.0,
  abandonment_stage      JSONB NOT NULL DEFAULT '{"encounter":0,"analysis":0,"return":0}',
  last_active            TIMESTAMPTZ,
  days_since_last_session INTEGER NOT NULL DEFAULT 0,

  dropout_risk           TEXT NOT NULL DEFAULT 'low'
                         CHECK (dropout_risk IN ('low', 'moderate', 'high')),
  burnout_risk           TEXT NOT NULL DEFAULT 'low'
                         CHECK (burnout_risk IN ('low', 'moderate', 'high')),

  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- FSRS MEMORY STATE (per item per learner)
-- ============================================================

CREATE TABLE fsrs_memory_state (
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id        UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  kc_id          UUID NOT NULL REFERENCES knowledge_components(id),

  stability      REAL NOT NULL DEFAULT 1.0,
  difficulty     REAL NOT NULL DEFAULT 0.5,
  retrievability REAL NOT NULL DEFAULT 1.0,

  stage_type     TEXT NOT NULL
                 CHECK (stage_type IN ('encounter', 'analysis', 'return')),
  last_review    TIMESTAMPTZ,
  next_review    TIMESTAMPTZ,
  review_count   INTEGER NOT NULL DEFAULT 0,
  lapse_count    INTEGER NOT NULL DEFAULT 0,
  state          TEXT NOT NULL DEFAULT 'new'
                 CHECK (state IN ('new', 'learning', 'review', 'relearning')),

  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (user_id, item_id)
);

CREATE INDEX idx_fsrs_next_review ON fsrs_memory_state(user_id, next_review);
CREATE INDEX idx_fsrs_state ON fsrs_memory_state(user_id, state);
CREATE INDEX idx_fsrs_kc ON fsrs_memory_state(kc_id);

-- FSRS per-learner optimized parameters
CREATE TABLE fsrs_parameters (
  user_id     UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  weights     REAL[] NOT NULL DEFAULT ARRAY[
    0.4072, 1.1829, 3.1262, 15.4722,
    7.2102, 0.5316, 1.0651, 0.0,
    1.5546, 0.1192, 1.0100, 1.9395,
    0.1100, 0.2939, 2.0091, 0.2415,
    2.9898, 0.5100, 0.6000
  ],  -- 19 FSRS v5 default weights
  target_retention REAL NOT NULL DEFAULT 0.90,
  optimized_at TIMESTAMPTZ,
  review_count INTEGER NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- SESSIONS
-- ============================================================

CREATE TABLE sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic_id        UUID NOT NULL REFERENCES topics(id),
  session_type    TEXT NOT NULL CHECK (session_type IN ('quick', 'standard', 'extended')),

  -- Timing
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ,
  duration_s      INTEGER,

  -- Stage timing
  encounter_duration_s INTEGER,
  analysis_duration_s  INTEGER,
  return_duration_s    INTEGER,

  -- Stage balance (as planned by adaptive engine)
  planned_balance JSONB NOT NULL,
  -- { encounter: 0.25, analysis: 0.50, return: 0.25 }

  -- Composition
  item_count      INTEGER NOT NULL DEFAULT 0,
  new_item_count  INTEGER NOT NULL DEFAULT 0,
  review_item_count INTEGER NOT NULL DEFAULT 0,
  interleaved_count INTEGER NOT NULL DEFAULT 0,

  -- Outcomes
  accuracy        REAL,
  status          TEXT NOT NULL DEFAULT 'in_progress'
                  CHECK (status IN ('in_progress', 'completed', 'abandoned', 'paused')),
  abandoned_at_stage TEXT,

  -- Adaptive engine state snapshot
  adaptive_decisions JSONB,
  -- { topicScore, difficultyLevels, stageBalance, interleavingRatio }

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sessions_user ON sessions(user_id, started_at DESC);
CREATE INDEX idx_sessions_status ON sessions(user_id, status);

-- ============================================================
-- ASSESSMENT EVENTS (every learner response)
-- ============================================================

CREATE TABLE assessment_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id        UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  content_item_id   UUID NOT NULL REFERENCES content_items(id),
  kc_id             UUID REFERENCES knowledge_components(id),

  -- Response
  response_type     TEXT NOT NULL
                    CHECK (response_type IN (
                      'free_recall', 'multiple_choice', 'categorization',
                      'sequencing', 'definition_matching', 'pattern_completion',
                      'fill_in_blank', 'analogy_creation', 'transfer_task',
                      'creative_synthesis', 'teaching_prompt',
                      'connection_mapping', 'visual_spatial',
                      'case_study', 'predict_then_explain',
                      'error_identification', 'prediction_prompt'
                    )),
  learner_response  JSONB NOT NULL,
  -- Structure varies by type:
  -- free_recall: { text: "..." }
  -- multiple_choice: { selected: "b" }
  -- categorization: { placements: [{ item: "ATP", category: "light_dep" }] }
  -- etc.

  -- Scoring
  is_correct        BOOLEAN,
  score             REAL,                -- 0.0-1.0 normalized score
  raw_score         REAL,                -- 0-4 for rubric-scored items
  scoring_method    TEXT NOT NULL
                    CHECK (scoring_method IN (
                      'auto_exact', 'auto_keyword', 'auto_position',
                      'llm_rubric', 'self_assessment', 'pending'
                    )),
  llm_justification TEXT,               -- LLM's reasoning for the score

  -- Timing
  presented_at      TIMESTAMPTZ NOT NULL,
  responded_at      TIMESTAMPTZ NOT NULL,
  latency_ms        INTEGER NOT NULL,

  -- Context
  stage             TEXT NOT NULL
                    CHECK (stage IN ('encounter', 'analysis', 'return')),
  difficulty_level  SMALLINT NOT NULL,
  help_requested    BOOLEAN NOT NULL DEFAULT false,
  help_type         TEXT,                -- 'show_options', 'show_hint', 'show_answer'

  -- Self-rating (for FSRS)
  self_rating       TEXT
                    CHECK (self_rating IN ('again', 'hard', 'good', 'easy', NULL)),
  confidence_rating SMALLINT
                    CHECK (confidence_rating BETWEEN 1 AND 5 OR confidence_rating IS NULL),

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_user_session ON assessment_events(user_id, session_id);
CREATE INDEX idx_events_user_kc ON assessment_events(user_id, kc_id);
CREATE INDEX idx_events_item ON assessment_events(content_item_id);
CREATE INDEX idx_events_created ON assessment_events(created_at);

-- ============================================================
-- A/B TESTS
-- ============================================================

CREATE TABLE experiments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL UNIQUE,
  description       TEXT,
  hypothesis        TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'running', 'paused', 'completed', 'archived')),
  feature_flag_key  TEXT NOT NULL,       -- PostHog feature flag key

  -- Configuration
  conditions        JSONB NOT NULL,
  -- [{ name: "control", description: "LH-only", allocation: 0.5 },
  --  { name: "treatment", description: "Full RH-LH-RH", allocation: 0.5 }]
  primary_metric    TEXT NOT NULL,
  secondary_metrics TEXT[] DEFAULT '{}',
  target_sample_size INTEGER NOT NULL,

  -- Timeline
  started_at        TIMESTAMPTZ,
  ended_at          TIMESTAMPTZ,
  estimated_end     TIMESTAMPTZ,

  -- Results
  results           JSONB,
  -- { primary: { control: { mean, ci_low, ci_high, n },
  --              treatment: { mean, ci_low, ci_high, n } },
  --   p_value, effect_size, is_significant }

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE experiment_assignments (
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  experiment_id  UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  condition_name TEXT NOT NULL,
  assigned_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, experiment_id)
);

-- ============================================================
-- LEARNING JOURNAL
-- ============================================================

CREATE TABLE journal_entries (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id   UUID REFERENCES sessions(id),
  entry_type   TEXT NOT NULL
               CHECK (entry_type IN (
                 'prediction', 'emotional_anchor', 'reflection',
                 'creative_response', 'transfer_response', 'free_note'
               )),
  content      TEXT NOT NULL,
  topic_id     UUID REFERENCES topics(id),
  stage        TEXT CHECK (stage IN ('encounter', 'analysis', 'return', NULL)),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_journal_user ON journal_entries(user_id, created_at DESC);
```

---

## 4. API Design Document

### 4.1 Authentication

#### POST /api/auth/signup
Create a new learner account.

**Request:**
```json
{
  "email": "learner@example.com",
  "password": "securepassword123",
  "displayName": "Alex"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "uuid",
    "email": "learner@example.com",
    "displayName": "Alex",
    "role": "learner"
  },
  "accessToken": "jwt...",
  "refreshToken": "jwt..."
}
```

**Notes:** Password is hashed with bcrypt (cost factor 12). Access token expires in 15 minutes. Refresh token expires in 30 days. Both are httpOnly cookies.

#### POST /api/auth/login
**Request:**
```json
{
  "email": "learner@example.com",
  "password": "securepassword123"
}
```

**Response (200):** Same shape as signup response.

#### POST /api/auth/refresh
**Request:** Refresh token sent as httpOnly cookie (no body needed).

**Response (200):**
```json
{
  "accessToken": "jwt...",
  "refreshToken": "jwt..."
}
```

#### POST /api/auth/logout
Invalidates the refresh token.

**Response (204):** No content.

---

### 4.2 Content

#### GET /api/content/topics
List all published topics with learner's proficiency data.

**Query params:** `?parentId=uuid` (filter by parent), `?unlocked=true` (only show unlocked topics).

**Response (200):**
```json
{
  "topics": [
    {
      "id": "uuid",
      "slug": "photosynthesis",
      "name": "Photosynthesis",
      "description": "How plants convert sunlight into energy",
      "topicPath": ["biology", "ecology", "photosynthesis"],
      "isPublished": true,
      "proficiency": {
        "overallProficiency": 0.65,
        "kcMastered": 4,
        "kcInProgress": 3,
        "kcNotStarted": 1,
        "sessionsCompleted": 3,
        "lastSession": "2026-02-08T18:30:00Z"
      },
      "isUnlocked": true,
      "hasOverdueReviews": true,
      "overdueCount": 3
    }
  ]
}
```

#### GET /api/content/topics/:id
Get full topic details with content items and knowledge components.

**Response (200):**
```json
{
  "topic": {
    "id": "uuid",
    "name": "Photosynthesis",
    "knowledgeComponents": [
      {
        "id": "uuid",
        "name": "photosynthesis_light_reactions",
        "masteryLevel": 0.72,
        "difficultyTier": 2
      }
    ],
    "sessionCount": 5,
    "templateType": "conceptual"
  }
}
```

#### GET /api/content/items/:id
Get a single content item with full body.

**Response (200):**
```json
{
  "item": {
    "id": "uuid",
    "itemType": "narrative_sequence",
    "stage": "encounter",
    "hemisphereMode": "rh_primary",
    "difficultyLevel": 1,
    "body": {
      "screens": [
        {
          "text": "In 1848, Manchester's trees were pale with lichen...",
          "imageUrl": "https://blob.vercel-storage.com/...",
          "audioUrl": null
        }
      ]
    },
    "estimatedDurationS": 120,
    "altText": "Illustration of pale trees in industrial Manchester"
  }
}
```

---

### 4.3 Session

#### POST /api/session/start
Start a new learning session. The server runs the adaptive engine to compose a session plan.

**Request:**
```json
{
  "sessionType": "standard",
  "topicId": "uuid | null",
  "experimentOverrides": {}
}
```

**Response (200):**
```json
{
  "sessionId": "uuid",
  "topicId": "uuid",
  "topicName": "Photosynthesis",
  "sessionType": "standard",
  "stageBalance": {
    "encounter": 0.25,
    "analysis": 0.50,
    "return": 0.25
  },
  "encounter": {
    "activities": [
      { "type": "hook", "contentItemId": "uuid" },
      { "type": "narrative", "contentItemId": "uuid" },
      { "type": "spatial_overview", "contentItemId": "uuid" },
      { "type": "emotional_anchor", "contentItemId": "uuid" }
    ]
  },
  "analysis": {
    "items": [
      {
        "contentItemId": "uuid",
        "type": "active_recall",
        "difficultyLevel": 2,
        "isNew": false,
        "isInterleaved": false,
        "topicName": "Photosynthesis"
      }
    ],
    "itemCount": 18,
    "newCount": 7,
    "reviewCount": 8,
    "interleavedCount": 3
  },
  "return": {
    "activities": [
      { "type": "reconnection", "contentItemId": "uuid" },
      { "type": "transfer_challenge", "contentItemId": "uuid" },
      { "type": "reflection_prompt", "contentItemId": "uuid" },
      { "type": "forward_glimpse", "contentItemId": "uuid" }
    ]
  },
  "estimatedDurationMin": 15,
  "fsrsParameters": {
    "weights": [0.4072, 1.1829, ...],
    "targetRetention": 0.90
  }
}
```

#### POST /api/session/response
Submit a response to an assessment item.

**Request:**
```json
{
  "sessionId": "uuid",
  "contentItemId": "uuid",
  "kcId": "uuid",
  "stage": "analysis",
  "responseType": "free_recall",
  "learnerResponse": { "text": "The distance between two notes" },
  "latencyMs": 4200,
  "helpRequested": false,
  "selfRating": "good",
  "confidenceRating": 4
}
```

**Response (200):**
```json
{
  "eventId": "uuid",
  "scoring": {
    "isCorrect": true,
    "score": 1.0,
    "scoringMethod": "auto_keyword",
    "feedback": {
      "correctAnswer": "The distance between two notes, measured in semitones.",
      "explanation": "An interval is the distance between two notes."
    }
  },
  "fsrsUpdate": {
    "newStability": 4.2,
    "newDifficulty": 0.45,
    "nextReview": "2026-02-14T00:00:00Z",
    "newState": "review"
  },
  "kcUpdate": {
    "newMasteryLevel": 0.68,
    "newDifficultyTier": 2
  }
}
```

**For LLM-scored items, scoring may be deferred:**
```json
{
  "eventId": "uuid",
  "scoring": {
    "scoringMethod": "pending",
    "modelAnswer": "A solar panel converts sunlight into electricity...",
    "feedback": {
      "rubric": { "scores": [...] },
      "note": "Your response is being evaluated. You'll see your score shortly."
    }
  }
}
```

#### POST /api/session/complete
Complete a session and finalize all state updates.

**Request:**
```json
{
  "sessionId": "uuid",
  "encounterDurationS": 210,
  "analysisDurationS": 480,
  "returnDurationS": 195,
  "reflectionResponse": "I was surprised that...",
  "confidenceRating": 4
}
```

**Response (200):**
```json
{
  "sessionSummary": {
    "duration": 885,
    "itemsCompleted": 18,
    "accuracy": 0.78,
    "newItemsLearned": 7,
    "reviewsCompleted": 8,
    "topicProficiency": 0.65,
    "masteryGrowth": 0.08,
    "nextSessionRecommendation": {
      "topicId": "uuid",
      "topicName": "Photosynthesis",
      "reason": "Continue building proficiency",
      "overdueReviews": 5
    }
  }
}
```

#### GET /api/session/active
Resume an in-progress session (for page refreshes or returning from offline).

**Response (200):** Same shape as POST /api/session/start, plus `currentStage` and `currentIndex` fields.

---

### 4.4 Learner

#### GET /api/learner/profile
**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "displayName": "Alex",
    "email": "learner@example.com",
    "createdAt": "2026-01-15T10:00:00Z"
  },
  "preferences": {
    "theme": "dark",
    "soundEnabled": true,
    "ambientVolume": 0.2,
    "preferredSession": "standard"
  },
  "stats": {
    "totalSessions": 47,
    "totalTopics": 12,
    "totalConnections": 28,
    "currentStreak": 5,
    "totalLearningTimeHours": 14.2
  }
}
```

#### GET /api/learner/knowledge-state
Returns the full learner model (all four layers) for the analytics dashboard.

**Response (200):**
```json
{
  "knowledge": {
    "topics": [...],
    "kcStates": [...]
  },
  "behavioral": {
    "sessionFrequency": 5.2,
    "averageDuration": 840,
    "completionRate": 0.92,
    "stageTimeRatios": { "encounter": 0.22, "analysis": 0.52, "return": 0.26 }
  },
  "cognitive": {
    "hemisphereBalanceScore": -0.15,
    "metacognitiveAccuracy": 0.72,
    "learningVelocity": 0.08,
    "modalityPreferences": { "visual": 0.35, "auditory": 0.20, "textual": 0.30, "kinesthetic": 0.15 }
  },
  "motivational": {
    "engagementTrend": "stable",
    "challengeTolerance": 0.65,
    "dropoutRisk": "low"
  }
}
```

#### GET /api/learner/analytics
Returns pre-computed analytics for the learner dashboard visualizations.

**Response (200):**
```json
{
  "knowledgeMap": {
    "nodes": [
      { "id": "uuid", "name": "Photosynthesis", "mastery": 0.65, "overdueCount": 3, "kcCount": 8 }
    ],
    "edges": [
      { "source": "uuid", "target": "uuid", "type": "prerequisite", "learnerConnections": 2 }
    ]
  },
  "velocityHistory": [
    { "date": "2026-02-01", "mastery": 0.42, "lhMastery": 0.48, "rhMastery": 0.36 }
  ],
  "retentionForecast": [
    { "kcId": "uuid", "kcName": "light_reactions", "retrievability": 0.75, "daysUntilForgetting": 3 }
  ],
  "sessionHistory": [
    { "date": "2026-02-09", "type": "standard", "duration": 840, "accuracy": 0.78 }
  ],
  "metacognitive": {
    "truePositive": 42,
    "overconfident": 8,
    "underconfident": 12,
    "trueNegative": 38,
    "calibrationScore": 0.72
  }
}
```

---

### 4.5 Review

#### GET /api/review/queue
Get items due for review, prioritized by FSRS retrievability.

**Query params:** `?limit=30` (max items), `?topicId=uuid` (filter to topic).

**Response (200):**
```json
{
  "reviewItems": [
    {
      "contentItemId": "uuid",
      "kcId": "uuid",
      "topicName": "Natural Selection",
      "stageType": "analysis",
      "retrievability": 0.72,
      "lastReview": "2026-02-02T14:00:00Z",
      "reviewCount": 3,
      "state": "review"
    }
  ],
  "totalDue": 12,
  "overdueCount": 3
}
```

#### POST /api/review/submit
Submit a review rating (same structure as POST /api/session/response, used for standalone review sessions).

---

### 4.6 Admin

#### GET /api/admin/analytics/cohort
**Query params:** `?dateFrom=...&dateTo=...&cohort=new_users`

**Response (200):**
```json
{
  "metrics": {
    "meanMasteryByTopic": [
      { "topicId": "uuid", "topicName": "Photosynthesis", "meanMastery": 0.58, "n": 245 }
    ],
    "lhRhGapByTopic": [
      { "topicId": "uuid", "lhMean": 0.65, "rhMean": 0.42, "gap": 0.23 }
    ],
    "completionRateByTopic": [...],
    "retentionAt7Days": 0.82,
    "retentionAt30Days": 0.68
  }
}
```

#### POST /api/admin/experiments
Create a new A/B test experiment.

**Request:**
```json
{
  "name": "rh-lh-rh-vs-lh-only",
  "hypothesis": "Full RH->LH->RH loop produces better 1-week retention than LH-only",
  "conditions": [
    { "name": "control", "description": "LH-only approach", "allocation": 0.5 },
    { "name": "treatment", "description": "Full RH-LH-RH loop", "allocation": 0.5 }
  ],
  "primaryMetric": "retention_7_day",
  "secondaryMetrics": ["transfer_score", "session_completion_rate"],
  "targetSampleSize": 1000,
  "featureFlagKey": "experiment-rh-lh-rh-vs-lh-only"
}
```

**Response (201):**
```json
{
  "experiment": {
    "id": "uuid",
    "name": "rh-lh-rh-vs-lh-only",
    "status": "draft",
    "featureFlagKey": "experiment-rh-lh-rh-vs-lh-only"
  }
}
```

---

## 5. MVP Feature Scope

### 5.1 MVP (v1.0) -- "The Loop Works"

**Goal:** Demonstrate that the RH->LH->RH learning loop is buildable, usable, and produces measurably better retention than the baseline. Validate with 100-500 beta learners.

**In scope:**

| Feature | Scope | Notes |
|---------|-------|-------|
| **Auth** | Email/password signup and login | Social auth (Google/Apple) deferred to v1.1 |
| **Session Engine** | Full RH->LH->RH loop for Standard sessions only | Quick and Extended loops deferred to v1.1 |
| **Encounter Stage** | Hook, Narrative Frame (3-5 screens), Spatial Overview (static, not zoomable), Emotional Anchor | Interactive zoomable concept map deferred to v1.1 |
| **Analysis Stage** | Active Recall, Multiple Choice, Categorization (tap-to-place, not drag-and-drop), Sequencing, Self-Rating | Drag-and-drop deferred to v1.1. Worked Example Fading deferred. |
| **Return Stage** | Reconnection, Transfer Challenge (free text), Reflection Prompt + Confidence Rating | Creative Synthesis and Connection Mapping deferred to v1.1 |
| **Stage Transitions** | Color crossfade, typography shift, transition text | Sound effects and haptics deferred. Animation deferred to v1.1. |
| **FSRS** | Core FSRS algorithm (server-side), standard scheduling for Analysis items | Hemisphere-aware extensions (Encounter bonus, Return concept-level) deferred to v1.1 |
| **Adaptive Engine** | Topic selection (rule-based), difficulty progression (Level 1-2 only), fixed stage balance (25/50/25) | HBS-based adaptation, interleaving ratio, edge case protocols deferred to v1.1 |
| **Learner Model** | Knowledge State (KC mastery, FSRS state) | Behavioral, Cognitive, and Motivational layers deferred to v1.1 |
| **LLM Scoring** | Transfer challenge scoring via Claude API (async) | Self-assessment fallback if LLM unavailable |
| **Dashboard** | Simplified home: greeting, next session card, due-for-review count, start session button | Knowledge map preview, stats row, recent activity deferred to v1.1 |
| **Content** | 2 complete modules (Music Harmony + Supply & Demand from doc 05). ~30 content items each. | Third module (Darwin) deferred to v1.1 |
| **Design System** | Three-mode color palettes, typography system, spacing tokens. Dark mode only. | Light mode, detailed animation system deferred to v1.1 |
| **Offline** | None in MVP | PWA with offline deferred to v1.1 |
| **Analytics** | Basic PostHog event tracking (session start/complete, item responses) | Learner dashboard analytics, admin dashboard deferred to v1.1 |
| **A/B Testing** | Infrastructure (PostHog feature flags) in place but no experiments running | First experiment (Experiment 1) starts in v1.1 beta |
| **Accessibility** | Keyboard navigation, ARIA labels, sufficient color contrast, screen reader support for core flows | Full WCAG 2.1 AA audit deferred to Phase 5 |

**What is manually handled vs. automated in MVP:**

| Process | MVP Approach | Automated In |
|---------|-------------|-------------|
| Content authoring | YAML files in Git, validated by CI, seeded to DB | v2.0 (admin CMS UI) |
| LLM scoring calibration | Manual spot-checking of LLM scores vs. expected scores | v1.1 (automated validation pipeline) |
| FSRS parameter optimization | Global defaults for all learners | v1.1 (per-learner optimization batch job) |
| Zombie item detection | Manual review of low-mastery KCs with high review counts | v1.1 (automated detection algorithm) |
| Dropout risk monitoring | Manual review of PostHog retention funnels | v2.0 (automated risk scoring + re-engagement) |

**Lesson templates implemented in MVP:**
1. **Conceptual Template** (Template 1) -- used for Supply & Demand module
2. **Creative/Systems Template** (Template 4+5 hybrid) -- used for Music Harmony module

**Content requirements for launch:**
- 2 complete modules, ~60 content items total
- ~10 illustrations (3 per Encounter narrative + concept diagrams)
- ~8 audio clips (intervals, chords, ambient)
- 1 interactive widget (chord builder in Music Harmony Return stage -- simplified to button-based selection, not drag-to-timeline)

### 5.2 v1.1 -- "Intelligence Layer"

**Goal:** Add adaptive personalization, hemisphere-aware FSRS, and the full analytics experience. Run the first A/B experiment. Scale to 1,000-5,000 learners.

**Additions:**
- Quick Loop and Extended Loop session types
- Full adaptive engine: HBS-based stage balancing, difficulty levels 1-4, interleaving
- Hemisphere-aware FSRS extensions (Encounter bonus, Return concept-level scheduling)
- Full four-layer learner model (Behavioral, Cognitive, Motivational states)
- Learner analytics dashboard (Knowledge Map, Velocity Graph, HBS Indicator, Retention Forecast, Metacognitive Tracker)
- Drag-and-drop interactions for Categorization and Sequencing
- Creative Synthesis activities in Return stage
- Connection Mapping (prompted, not open)
- Third content module (Darwin's Dangerous Idea)
- Two additional content modules (total: 5 modules, ~150 content items)
- Light mode
- Stage transition animations (Framer Motion)
- Sound design (ambient pads, transition chimes, feedback sounds)
- PWA with offline session support
- A/B Experiment 1: RH-LH-RH vs. LH-Only for Retention
- Per-learner FSRS parameter optimization (batch job)
- Zombie item detection (automated)
- Social auth (Google, Apple)

### 5.3 v2.0 -- "Full Vision"

**Goal:** Complete the product vision. Content management UI, admin analytics, full A/B testing infrastructure, community features, and native mobile consideration.

**Additions:**
- Admin content management UI (CRUD for content items, visual relationship editor)
- Admin analytics dashboard (cohort metrics, content effectiveness, dropout risk)
- Full A/B testing management UI (create, monitor, analyze experiments)
- Experiments 2, 3, and 4 from the assessment doc
- Open Connection Mapping (learner-initiated cross-topic connections)
- Drawing canvas for Visual/Spatial tasks
- Interactive zoomable concept map (D3 force graph with learner progress data)
- Case Study Analysis and Predict-Then-Explain assessment types
- Teaching Prompts with LLM-generated follow-up questions
- Learning journal with full history and search
- 10+ content modules across 3+ subject domains
- Notification system (daily reminders, curiosity nudges, re-engagement)
- React Native mobile app (or Capacitor wrapper for the PWA)
- Multi-language support (i18n for UI, content localization framework)
- Educator/classroom mode (teacher creates class, assigns topics, views aggregate analytics)

---

## 6. Development Roadmap

### Phase 1: Foundation (Weeks 1-4)

**Deliverables:**
- Monorepo setup (Turborepo) with packages: `web` (Next.js app), `api` (Hono handlers), `db` (Drizzle schema + migrations), `shared` (types, FSRS library, utilities)
- Database schema deployed to Neon (all tables from Section 3.2)
- Auth system (signup, login, JWT tokens, middleware)
- Design system implementation: CSS custom properties for three stage modes, Tailwind config, typography system, color tokens, spacing tokens
- Core UI components: Button, Card, Input, TextArea, ProgressBar, BottomNav, TopBar (all stage-aware via `data-stage` attribute)
- Content seeding pipeline: YAML schema definition, validation script, CI check, seed script
- Seed the first module's content (Music Harmony, Encounter stage only) for visual testing
- PostHog integration: event tracking utility, feature flag client

**Key technical risks:**
- CSS custom property performance for stage transitions. Risk: crossfading 20+ properties simultaneously may cause jank. Mitigation: profile on low-end devices early; batch property changes; consider `will-change` hints.
- Neon serverless driver compatibility with Edge Functions. Risk: cold start overhead. Mitigation: test latency in preview deployments during Week 2; fall back to standard Node.js runtime if Edge is too slow.

**Dependencies:** None (greenfield).

### Phase 2: Core Loop (Weeks 5-10)

**Deliverables:**
- Session Engine (Zustand store) with full stage state management
- Encounter Stage UI: Hook screen, Narrative Frame (swipeable card stack), Spatial Overview (static), Emotional Anchor, Prediction Prompt
- Analysis Stage UI: Active Recall card, Multiple Choice card, Categorization (tap-to-place), Sequencing (sortable list), Self-Rating buttons, Feedback card
- Return Stage UI: Reconnection screen, Transfer Challenge (free text), Reflection Prompt + Confidence Rating
- Stage transition UI: color crossfade, typography shift, transition text screen (2 seconds)
- Session API endpoints: POST /start, POST /response, POST /complete, GET /active
- Content API endpoints: GET /topics, GET /items
- FSRS core algorithm implementation (server-side): stability update, difficulty update, scheduling, state transitions
- Review queue API: GET /queue, POST /submit
- Learner KC state tracking: mastery calculation, difficulty progression
- Seed both MVP modules (Music Harmony + Supply & Demand) with full content
- Dashboard: greeting, next session card, due-for-review count
- Complete a full session flow end-to-end

**Key technical risks:**
- Session state synchronization between client Zustand store and server. Risk: if a learner's response fails to sync (network error), the session state diverges. Mitigation: implement an optimistic update pattern -- update Zustand immediately, queue the server sync, retry on failure, reconcile on session complete.
- Swipeable card stack performance on older mobile devices. Risk: simultaneous animations (card swipe + parallax + ambient background) may cause frame drops. Mitigation: reduce parallax and background animation on devices with `navigator.hardwareConcurrency < 4`.

**Dependencies:** Phase 1 complete.

### Phase 3: Intelligence (Weeks 11-16)

**Deliverables:**
- LLM scoring integration: Claude API adapter, scoring queue (Redis), async worker, fallback to self-assessment
- LLM scoring for Transfer Challenges (Return stage)
- Adaptive Engine: topic selection algorithm, difficulty adjuster (levels 1-4), session composition algorithm
- Hemisphere-aware FSRS extensions: Encounter stability bonus, Analysis standard scheduling, Return concept-level scheduling with longer intervals
- Full four-layer learner model: Behavioral State tracking, Cognitive Profile (HBS calculation), Motivational State (engagement, dropout risk)
- HBS-based stage balancing: adjust Encounter/Analysis/Return proportions per learner
- Interleaving: topic mixing rules, interleaving ratio based on proficiency
- FSRS client-side calculator: retrievability computation in the browser for offline review queue
- Quick Loop and Extended Loop session types
- Per-learner FSRS parameter optimization (weekly batch job on Lambda)
- Zombie item detection algorithm (weekly batch job)
- Edge case protocols: stuck learner, bored learner, cold start defaults

**Key technical risks:**
- LLM scoring latency and cost. Risk: if Claude API is slow (>3s) or expensive (>budget), the Return stage experience degrades. Mitigation: fire scoring async (learner sees model answer immediately, score arrives later); implement cost budget tracking per learner; aggressive prompt caching.
- Adaptive engine producing poor decisions early (insufficient data). Risk: bad topic selection or difficulty for new learners. Mitigation: conservative cold-start defaults (assessment doc Section 6.5, Failsafe 1). Gather minimum 3 sessions before personalizing.
- FSRS parameter optimization convergence. Risk: per-learner optimization may not converge with <50 reviews. Mitigation: use global defaults until the 50-review threshold; implement gradient descent with learning rate decay.

**Dependencies:** Phase 2 complete. Claude API access provisioned.

### Phase 4: Content and Polish (Weeks 17-22)

**Deliverables:**
- Third content module (Darwin's Dangerous Idea) with full Narrative/Historical + Conceptual template
- Two additional content modules (topics TBD based on beta feedback) -- total 5 modules
- Full animation system (Framer Motion): Encounter organic motion, Analysis crisp motion, Return contemplative motion, stage transition animations
- Sound design implementation: Web Audio API ambient pads, Howler.js for narration/effects, transition chimes, feedback sounds
- Drag-and-drop interactions for Categorization and Sequencing exercises
- Creative Synthesis activities in Return stage (metaphor creation, teaching prompt)
- Learner analytics dashboard: Knowledge Map (D3 force graph), Learning Velocity Graph, HBS Indicator, Retention Forecast, Session History, Metacognitive Tracker
- Light mode implementation
- PWA setup: service worker (Serwist), offline content caching, IndexedDB session state persistence, background sync
- A/B testing infrastructure: PostHog feature flag integration, experiment management API endpoints
- Admin analytics API endpoints (cohort metrics, content effectiveness)

**Key technical risks:**
- D3 force graph performance on mobile. Risk: the Knowledge Map with 50+ nodes and 100+ edges may be slow on mobile browsers. Mitigation: limit visible nodes (show top 20 with "expand" interaction); use `requestAnimationFrame` for rendering; consider canvas-based rendering instead of SVG for >50 nodes.
- Service worker caching strategy complexity. Risk: stale content served after an update; cache storage limits exceeded. Mitigation: use Serwist's stale-while-revalidate strategy for content; implement cache eviction for sessions older than 7 days; monitor storage usage.
- Audio playback restrictions on iOS. Risk: Web Audio API silent on first load. Mitigation: AudioContext resume on first user interaction (session start screen guarantees this). Test on real iOS devices during Week 18.

**Dependencies:** Phase 3 complete. All content authored and illustrated.

### Phase 5: Launch Prep (Weeks 23-28)

**Deliverables:**
- End-to-end test suite (Playwright): full session flow, auth flow, offline behavior, review queue, analytics dashboard
- Unit test suite (Vitest): FSRS calculations, adaptive engine decisions, scoring functions (target: 80% coverage for core logic)
- Accessibility audit: axe-core automated checks + manual screen reader testing on VoiceOver (iOS/Mac) and TalkBack (Android)
- WCAG 2.1 AA compliance fixes
- Performance optimization: Lighthouse score >90 on mobile, Core Web Vitals (LCP <2.5s, FID <100ms, CLS <0.1)
- Load testing: simulate 1,000 concurrent sessions, verify API response times <500ms at p95
- Security audit: OWASP top 10 review, dependency vulnerability scanning (npm audit, Snyk), pen testing for auth and data access
- Beta program: 100-500 invited users, 4-week period
- A/B Experiment 1 launch: RH-LH-RH vs. LH-Only for Retention (begin data collection)
- Bug fixes and polish based on beta feedback
- Production deployment to Vercel Pro with custom domain
- Monitoring: Vercel Analytics, Sentry error tracking, Neon database monitoring
- Documentation: developer onboarding guide, content authoring guide, deployment runbook

**Key technical risks:**
- Beta learner dropout before sufficient data for Experiment 1. Risk: need 500+ learners completing 5+ sessions each. Mitigation: over-recruit (target 700 invites assuming 70% activation), provide clear onboarding, send daily reminders during beta.
- Performance on low-end Android devices. Risk: animation + audio + complex state management may cause jank. Mitigation: implement performance mode (reduced animations, no ambient sound) that auto-enables when frame rate drops below 30fps.
- Database scaling under beta load. Risk: assessment_events table grows rapidly (30 events/session * 500 users * 20 sessions = 300K rows in 4 weeks). Mitigation: Neon autoscales compute; add table partitioning by month if query performance degrades.

**Dependencies:** Phase 4 complete. Beta user pool recruited. Content for 5 modules complete and tested.

---

### Roadmap Summary

```
Week:  1    4    5    10   11   16   17   22   23   28
       |====|    |=====|    |=====|    |=====|    |=====|
       Phase 1   Phase 2    Phase 3    Phase 4    Phase 5
       Foundation Core Loop  Intelligence Content   Launch Prep

       Setup     Session    Adaptive   Animation  Testing
       Auth      Engine     Engine     Sound      A11y
       Design    E->A->R    LLM        PWA/Offline Performance
       System    FSRS Core  FSRS++     Analytics  Beta
       DB Schema Content x2 Learner    Content x5 Experiment 1
                            Model      Dashboard  Go Live
```

**Total timeline: 28 weeks (7 months) to beta launch.**

Post-launch, the team shifts to a continuous delivery cadence, releasing v1.1 features incrementally based on beta feedback and Experiment 1 results.

---

## Appendix A: Monorepo Structure

```
hemisphere/
  apps/
    web/                    -- Next.js 15 app (frontend + API routes)
      app/
        (marketing)/        -- Landing page, about
        (app)/              -- Authenticated learning app
          dashboard/
          session/
          map/
          journal/
          profile/
          analytics/
        (admin)/            -- Admin dashboard
        api/                -- API routes (Hono handlers)
      components/
        ui/                 -- Design system primitives (Button, Card, Input...)
        encounter/          -- Encounter stage components
        analysis/           -- Analysis stage components
        return/             -- Return stage components
        session/            -- Session engine components
        dashboard/          -- Dashboard components
        analytics/          -- Analytics visualization components
      lib/
        session-store.ts    -- Zustand session engine
        audio-engine.ts     -- Web Audio + Howler.js wrapper
        fsrs-client.ts      -- Client-side FSRS calculator
        analytics.ts        -- PostHog event tracking
      styles/
        tokens.css          -- CSS custom properties (stage-aware)
        tailwind.config.ts
  packages/
    db/                     -- Drizzle ORM schema + migrations
      schema/
      migrations/
      seed/
    shared/                 -- Shared types and utilities
      types/                -- API types, content types, learner model types
      fsrs/                 -- FSRS algorithm implementation
      adaptive/             -- Adaptive engine algorithms
      scoring/              -- Auto-scoring functions (keyword, position, etc.)
    llm/                    -- LLM adapter interface + Claude implementation
  content/                  -- Content YAML files + media assets
    modules/
      music-harmony/
      supply-and-demand/
      darwins-dangerous-idea/
    schema/                 -- Content validation schemas
  scripts/
    seed-content.ts         -- Seed content from YAML to database
    validate-content.ts     -- Validate content against schema
    optimize-fsrs.ts        -- Batch FSRS parameter optimization
  turbo.json                -- Turborepo configuration
  package.json
```

## Appendix B: Environment Variables

```env
# Database
DATABASE_URL=postgresql://...@neon.tech/hemisphere
DATABASE_URL_UNPOOLED=postgresql://...@neon.tech/hemisphere  # for migrations

# Redis
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=...

# Auth
JWT_SECRET=...
JWT_REFRESH_SECRET=...

# LLM
ANTHROPIC_API_KEY=sk-ant-...
LLM_SCORING_MODEL=claude-sonnet-4-20250514
LLM_DIALOGUE_MODEL=claude-haiku-4-20250414
LLM_MAX_CALLS_PER_LEARNER_PER_HOUR=10

# Analytics
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# Storage
BLOB_READ_WRITE_TOKEN=vercel_blob_...

# App
NEXT_PUBLIC_APP_URL=https://hemisphere.app
NODE_ENV=production
```

## Appendix C: Key Technical Decisions Log

| Decision | Choice | Alternatives Considered | Date | Rationale |
|----------|--------|------------------------|------|-----------|
| Frontend framework | Next.js 15 | Nuxt, SvelteKit, Remix | 2026-02-10 | Best ecosystem for interactive + content-heavy app; Server Components for content; App Router for nested layouts |
| Database | PostgreSQL (Neon) | MongoDB, PlanetScale | 2026-02-10 | Relational integrity for content graph + learner model; JSONB for flexibility; Neon for serverless |
| State management | Zustand + TanStack Query | Redux, Jotai, Context | 2026-02-10 | Zustand for complex session state with selector subscriptions; TanStack Query for server state with caching |
| Backend | Hono (serverless) | FastAPI, Express, tRPC | 2026-02-10 | Web Standards API; runs on Edge; shared TypeScript types; serverless scaling |
| LLM | Claude (Anthropic) | GPT-4o, Gemini, open-source | 2026-02-10 | Instruction-following precision for rubric scoring; prompt caching for cost; structured output |
| FSRS execution | Split (client + server) | All server, all client | 2026-02-10 | Client for offline retrievability; server as authority for state updates |
| Animation | Framer Motion + CSS | GSAP, React Spring | 2026-02-10 | Layout animations for stage transitions; AnimatePresence for mount/unmount; CSS for simple property transitions |
| Analytics | PostHog | Mixpanel, Amplitude, custom | 2026-02-10 | Event tracking + feature flags + funnels in one tool; open-source option for self-hosting |
| Hosting | Vercel | AWS, GCP | 2026-02-10 | First-class Next.js support; preview deployments; minimal ops overhead in early phases |

---

*This document provides the complete technical blueprint for the Hemisphere Learning App. Every technology choice is traceable to a specific requirement from the design documents. The architecture is designed to support the full product vision while being buildable incrementally, starting with a focused MVP that validates the core RH->LH->RH learning loop. The development team should be able to begin Phase 1 immediately upon reading this document.*
