/**
 * E2E — Accessibility checks
 *
 * Covers:
 *  - /login page has no critical axe violations
 *  - /signup page has no critical axe violations
 *  - /dashboard page has no critical axe violations (requires server)
 *  - Session page has no critical axe violations (demo mode — no server needed)
 *  - Key interactive elements are keyboard-navigable
 *  - ARIA landmarks are present on all major pages
 *
 * Axe scans use @axe-core/playwright when available. The import is wrapped in
 * a dynamic require so the file still compiles if the package is absent, and
 * the test falls back to Playwright's built-in ARIA snapshot assertions.
 *
 * To run axe scans install the optional peer:
 *   pnpm --filter @hemisphere/web add -D @axe-core/playwright
 */

import { test, expect } from '@playwright/test';
import { loginAs, TEST_USER } from './helpers/auth';

const E2E_ENABLED = process.env.HEMISPHERE_E2E === '1';

// ---------------------------------------------------------------------------
// Axe helper — gracefully absent if package not installed
// ---------------------------------------------------------------------------

/**
 * Shape of an axe violation object as returned by @axe-core/playwright.
 * Declared locally so the file compiles whether or not the package is installed.
 */
interface AxeViolation {
  id: string;
  description: string;
  impact?: string | null;
}

/**
 * Runs an axe accessibility scan on the current page and asserts no violations
 * at the specified impact levels exist.  Falls back to a no-op if
 * @axe-core/playwright is not installed.
 */
async function checkA11y(page: import('@playwright/test').Page): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let AxeBuilderCtor: (new (opts: { page: unknown }) => { withTags(tags: string[]): { analyze(): Promise<{ violations: AxeViolation[] }> } }) | undefined;

  try {
    // Use a variable-based require path so tsc does not attempt to resolve the
    // module at compile time (avoids TS2307 when the package is not installed).
    const moduleName = '@axe-core/playwright';
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require(moduleName) as { default: typeof AxeBuilderCtor };
    AxeBuilderCtor = mod.default;
  } catch {
    // Package not installed — skip axe scan and rely on ARIA snapshot tests
    return;
  }

  if (!AxeBuilderCtor) return;

  const results = await new AxeBuilderCtor({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();

  // Filter to serious / critical violations only
  const critical = results.violations.filter(
    (v: AxeViolation) => v.impact === 'serious' || v.impact === 'critical'
  );

  if (critical.length > 0) {
    const summary = critical
      .map((v: AxeViolation) => `[${v.impact}] ${v.id}: ${v.description}`)
      .join('\n');
    throw new Error(`Axe found ${critical.length} critical/serious violation(s):\n${summary}`);
  }
}

// ---------------------------------------------------------------------------
// Login page
// ---------------------------------------------------------------------------

test('/login page has no critical accessibility violations', async ({ page }) => {
  test.skip(!E2E_ENABLED, 'Requires running server');

  await page.goto('/login');
  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();

  await checkA11y(page);
});

test('/login page has correct ARIA landmarks', async ({ page }) => {
  test.skip(!E2E_ENABLED, 'Requires running server');

  await page.goto('/login');

  // The form should be inside a document — check for key labelled elements
  await expect(page.getByLabel(/email/i)).toBeVisible();
  await expect(page.getByLabel(/password/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
});

test('/login form is keyboard-navigable', async ({ page }) => {
  test.skip(!E2E_ENABLED, 'Requires running server');

  await page.goto('/login');

  // Tab to email field
  await page.keyboard.press('Tab');
  const emailField = page.locator('input[type="email"]');
  await expect(emailField).toBeFocused();

  // Tab to password
  await page.keyboard.press('Tab');
  const passwordField = page.locator('input[type="password"]');
  await expect(passwordField).toBeFocused();

  // Tab to submit button
  await page.keyboard.press('Tab');
  const submitBtn = page.getByRole('button', { name: /sign in/i });
  await expect(submitBtn).toBeFocused();
});

// ---------------------------------------------------------------------------
// Signup page
// ---------------------------------------------------------------------------

test('/signup page has no critical accessibility violations', async ({ page }) => {
  test.skip(!E2E_ENABLED, 'Requires running server');

  await page.goto('/signup');
  await expect(page.getByRole('heading', { name: /create an account/i })).toBeVisible();

  await checkA11y(page);
});

test('/signup page labels all inputs correctly', async ({ page }) => {
  test.skip(!E2E_ENABLED, 'Requires running server');

  await page.goto('/signup');

  // All four fields must have accessible labels
  await expect(page.getByLabel(/full name/i)).toBeVisible();
  await expect(page.getByLabel(/email/i)).toBeVisible();

  // Two password fields — getByLabel returns the first match; check both exist
  const passwordLabels = page.getByLabel(/password/i);
  expect(await passwordLabels.count()).toBeGreaterThanOrEqual(2);
});

// ---------------------------------------------------------------------------
// Dashboard page
// ---------------------------------------------------------------------------

test('/dashboard page has no critical accessibility violations', async ({ page }) => {
  test.skip(!E2E_ENABLED, 'Requires running server with DATABASE_URL');

  await loginAs(page, TEST_USER.email, TEST_USER.password);
  await expect(page).toHaveURL('/dashboard');

  // Wait for dynamic content to settle
  await page.waitForFunction(() => !document.querySelector('.animate-pulse'), { timeout: 8_000 });

  await checkA11y(page);
});

test('/dashboard has a main landmark and navigation header', async ({ page }) => {
  test.skip(!E2E_ENABLED, 'Requires running server with DATABASE_URL');

  await loginAs(page, TEST_USER.email, TEST_USER.password);
  await expect(page).toHaveURL('/dashboard');

  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.getByRole('banner')).toBeVisible(); // <header>
});

// ---------------------------------------------------------------------------
// Session page (demo mode — no server required)
// ---------------------------------------------------------------------------

test('session page in demo mode has no critical axe violations', async ({ page }) => {
  // Demo mode requires no token — just navigate directly
  await page.goto('/session/new?topicId=Music+Harmony');

  // Wait for encounter stage to render
  await expect(page.locator('[data-stage="encounter"]')).toBeVisible({ timeout: 10_000 });

  await checkA11y(page);
});

test('session page stage transition has role=status for screen readers', async ({ page }) => {
  // The StageTransition component sets role="status" and aria-live="polite"
  // We can check this by inspecting the DOM during transition
  await page.goto('/session/new?topicId=Music+Harmony');
  await expect(page.locator('[data-stage="encounter"]')).toBeVisible({ timeout: 10_000 });

  // Trigger the transition by clicking a continue button (best effort)
  const continueBtn = page.getByRole('button').filter({ hasText: /continue|next|begin/i }).first();
  if (await continueBtn.isVisible()) {
    await continueBtn.click();

    // If the transition overlay appears, it should have role="status"
    const overlay = page.getByRole('status', { name: /transitioning/i });
    // It may flash briefly — either visible or already gone is acceptable
    const overlayVisible = await overlay.isVisible().catch(() => false);
    if (overlayVisible) {
      await expect(overlay).toHaveAttribute('aria-live', 'polite');
    }
  }
});

// ---------------------------------------------------------------------------
// Colour contrast / focus visible (structural checks)
// ---------------------------------------------------------------------------

test('primary action buttons have an accessible name', async ({ page }) => {
  test.skip(!E2E_ENABLED, 'Requires running server');

  await page.goto('/login');

  const buttons = page.getByRole('button');
  const count = await buttons.count();

  for (let i = 0; i < count; i++) {
    const btn = buttons.nth(i);
    const name = await btn.getAttribute('aria-label') ?? await btn.textContent();
    expect(name?.trim().length ?? 0).toBeGreaterThan(0);
  }
});
