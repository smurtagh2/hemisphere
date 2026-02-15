# Accessibility Audit — Hemisphere Web App

## Methodology

Manual code review of all interactive and UI components against WCAG 2.1 AA criteria.
Criteria evaluated: perceivability, operability, understandability, robustness.

Components audited:
- `src/app/layout.tsx` — page shell and skip navigation
- `src/components/ui/Button.tsx` — base button component
- `src/components/ui/Card.tsx` — card container components
- `src/components/interactions/ActiveRecall.tsx` — free-recall interaction
- `src/components/interactions/MCQ.tsx` — multiple-choice question interaction
- `src/components/interactions/Categorization.tsx` — item sorting interaction
- `src/styles/tokens.css` — design tokens (color contrast)
- `src/styles/globals.css` — global styles and focus states

---

## Issues Found and Fixed

### 1. Skip-to-content link (WCAG 2.4.1 — Bypass Blocks)

**Status: Fixed**

A skip navigation link was missing from the page shell, making keyboard-only and screen reader users
traverse the full navigation on every page load.

Fix applied in `src/app/layout.tsx`:
- Added `<a href="#main-content">Skip to main content</a>` as the first focusable element in `<body>`.
- Link is visually hidden offscreen by default (position: absolute; left: -9999px).
- On `:focus`, the link repositions to `position:fixed; top:0; left:0` with full visibility.
- Wrapped page content in `<main id="main-content">` to receive the skip target.

### 2. Visible focus rings (WCAG 2.4.7 — Focus Visible)

**Status: Already compliant, verified**

`src/styles/globals.css` already defines a global `:focus-visible` rule:
```css
:focus-visible {
  outline: 2px solid var(--semantic-focus-ring);
  outline-offset: 2px;
}
```

`src/styles/tokens.css` defines `--semantic-focus-ring: rgb(74 158 222 / 0.5)` (a visible blue ring).

`Button.tsx` uses Tailwind class `focus-visible:ring-2 focus-visible:ring-offset-2`, consistent with the
global token. No `outline: none` without replacement was found in Button or Card.

`globals.css` `.btn` class uses `outline: none` but this is the legacy CSS class layer; all React
components use the Tailwind approach with `focus-visible:ring-*` classes instead, so interactive
elements have visible focus indicators.

### 3. ARIA roles and labels in interaction components (WCAG 4.1.2 — Name, Role, Value)

**Status: Already compliant, verified**

All three interaction components were reviewed:

**ActiveRecall:**
- `<TextArea>` has `aria-label="Free recall response"`.
- "Reveal Answer" `<Button>` has `aria-label="Reveal expected answer"`.
- Rating buttons use `role="radio"`, `aria-checked`, and `aria-label="{n} — {label}"`.
- Rating group uses `role="radiogroup"` with `aria-label="Recall quality rating"`.
- Feedback sections use `role="region"` and `aria-live="polite"` for dynamic content updates.
- Completion state uses `aria-live="polite"` and `aria-label="Completion message"`.
- Progress steps use `aria-current="step"` on the active step.

**MCQ:**
- Answer option buttons use `role="radio"` (single-select) or `role="checkbox"` (multi-select)
  with `aria-checked`.
- Options list uses `role="group"` with `aria-label="Answer options"`.
- Feedback banner uses `role="status"` and `aria-live="polite"`.
- Feedback panel uses `role="region"` with `aria-label="Answer feedback"`.
- Submit and Continue buttons have descriptive `aria-label` attributes.

**Categorization:**
- Item chips use `aria-pressed` and descriptive `aria-label` including assigned state.
- Category drop zones use `aria-label` describing the action ("Place selected item into X").
- Unassigned items group uses `role="group"` with `aria-label="Unassigned items"`.
- Category columns group uses `role="group"` with `aria-label="Category columns"`.
- Feedback banner uses `role="status"` and `aria-live="polite"`.
- Per-category correct count uses `aria-live="polite"`.
- Submit button has dynamic `aria-label` reflecting remaining item count.

### 4. Color contrast (WCAG 1.4.3 — Contrast Minimum)

**Status: Compliant, documented**

Contrast ratios for all stage primary text / background pairs verified against the 4.5:1 minimum
for normal text and documented in `src/styles/tokens.css`:

| Stage         | Text color | Background  | Ratio  | Status |
|---------------|------------|-------------|--------|--------|
| Encounter dark | #f5e6d3   | #1c1612     | ~11:1  | Pass   |
| Analysis dark  | #e8edf3   | #0f1419     | ~12:1  | Pass   |
| Return dark    | #f0e3ec   | #18121c     | ~12:1  | Pass   |
| Encounter secondary | #bfa88e | #1c1612  | ~5.2:1 | Pass   |
| Analysis secondary  | #8899aa | #0f1419  | ~4.6:1 | Pass   |
| Return secondary    | #b8a0b0 | #18121c  | ~5.1:1 | Pass   |

---

## Outstanding Items

### Automated testing
- No axe-core automated browser test is yet integrated. Consider adding `@axe-core/playwright`
  to the Playwright test suite when E2E tests are established.
- No Lighthouse CI run is integrated into the CI pipeline. Adding Lighthouse CI with an
  accessibility score threshold of 90+ is recommended.

### Screen reader testing
- Manual testing with VoiceOver (macOS) and NVDA (Windows) has not been performed.
  The ARIA role/label implementation follows spec but should be validated with real assistive
  technology on the interaction components.

### Keyboard navigation order
- Focus order was not traced end-to-end for the full session flow (session start to completion).
  A keyboard-only walkthrough of a full session should be performed.

### Touch target sizes (WCAG 2.5.5 — Target Size)
- Rating buttons in ActiveRecall are `w-10 h-10` (40px). WCAG 2.5.5 AAA recommends 44px.
  For AA compliance (2.5.8 in WCAG 2.2) a minimum of 24px is required — currently met.
  Consider increasing to 44px for improved usability.

### Colour-only information
- Correct/incorrect feedback in all three components uses colour (green/red) as the primary
  signal. Each also includes an icon (check/cross) so colour is not the sole indicator —
  compliant with WCAG 1.4.1. Verified in all three interaction components.
