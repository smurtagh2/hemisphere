# Performance Optimization — Hemisphere Web App

## Lighthouse Targets

| Metric        | Target | Notes                                    |
|---------------|--------|------------------------------------------|
| Performance   | > 90   | Core Web Vitals must all be in "Good"    |
| Accessibility | > 95   | See ACCESSIBILITY.md                     |
| Best Practices| > 90   | Security headers + HTTPS                 |
| SEO           | > 90   | Metadata, canonical, sitemap             |

---

## What Was Optimized

### 1. Response compression (`compress: true`)
Enabled Next.js built-in gzip / brotli compression for all server responses.
This reduces transfer size for HTML, JSON, and JS payloads.

### 2. Package import optimization (`optimizePackageImports`)
Added `framer-motion` to `experimental.optimizePackageImports` in `next.config.ts`.
Next.js will tree-shake unused exports from framer-motion at build time, reducing
the JS bundle size for pages that only use a subset of the library.

### 3. Image optimization
- Formats: `['image/avif', 'image/webp']` — both modern formats with broad browser support.
- `minimumCacheTTL: 60` — transformed images cached for at least 60 seconds, reducing
  repeated optimization costs.
- Device sizes tuned to actual breakpoints used in the app (375, 390, 768, 1024, 1440).

### 4. Dynamic imports for DnD components (`src/components/interactions/lazy.ts`)
`CategorizationDnD` and `SequencingDnD` depend on `@dnd-kit/core` and `@dnd-kit/sortable`.
These libraries are not needed for the initial page render and should be loaded on demand.

Use `CategorizationDnDLazy` / `SequencingDnDLazy` from `lazy.ts` instead of the direct
imports when embedding in session pages. This splits them into a separate async chunk,
reducing the main bundle size and improving First Contentful Paint (FCP) and
Largest Contentful Paint (LCP).

SSR is disabled (`ssr: false`) for these components because `@dnd-kit` uses browser-only
APIs (pointer events, touch events, ResizeObserver).

### 5. Security headers enhanced
Updated `next.config.ts` headers:
- `X-Frame-Options: DENY` (stricter than previous `SAMEORIGIN`).
- `Permissions-Policy` added to restrict camera, microphone, geolocation access.
- `/sw.js` given explicit `Cache-Control: no-store` and `Service-Worker-Allowed: /`
  to prevent service worker caching bugs and enable correct scope registration.

### 6. Font loading strategy
No Google Fonts `@import` URLs were found in `globals.css`. Fonts are declared using
CSS font stacks with system fallbacks:
```css
--font-encounter: 'Source Serif 4', Georgia, 'Times New Roman', serif;
--font-analysis:  Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```
No `<link rel="preconnect">` to Google Fonts is needed. If custom web fonts are added
in the future, switch to `next/font` in `layout.tsx` for zero-CLS font loading.

---

## Bundle Size Considerations

### Heavy dependencies to watch
| Package            | Why heavy                        | Mitigation                                |
|--------------------|----------------------------------|-------------------------------------------|
| `framer-motion`    | Full animation library (~50 KB)  | `optimizePackageImports` in next.config   |
| `@dnd-kit/core`    | Pointer/touch DnD engine         | Dynamic import via `lazy.ts`              |
| `@dnd-kit/sortable`| Sortable DnD utilities           | Dynamic import via `lazy.ts`              |

### Monitoring
- Run `pnpm --filter @hemisphere/web build` and inspect the `.next/analyze` output.
- Add `ANALYZE=true` with `@next/bundle-analyzer` to get a visual bundle breakdown.
- Use Lighthouse CI (threshold: Performance > 90) in GitHub Actions on every PR.

---

## Core Web Vitals Notes

| Vital | What to watch                                            |
|-------|----------------------------------------------------------|
| LCP   | Largest content paint — typically the first card/heading in a session. Keep hero content server-rendered (no loading spinners for above-the-fold). |
| CLS   | Layout shift — avoid dynamic height changes without reserved space. Use `min-h` on loading skeletons. |
| INP   | Interaction latency — keep event handlers synchronous where possible. The interaction components (MCQ, ActiveRecall, Categorization) use `useCallback` memoization. |
| FID   | First input delay — avoid long tasks on the main thread during initial load. Dynamic imports for DnD reduce initial parse/eval cost. |
