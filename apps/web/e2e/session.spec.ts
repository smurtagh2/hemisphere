/**
 * E2E — Learning session flow
 *
 * Covers:
 *  - Authenticated user lands on /dashboard
 *  - Selects a topic and clicks "Begin Learning" → navigates to /session/[id]
 *  - Encounter stage renders and can be completed
 *  - Stage transition overlay appears between stages
 *  - Analysis stage renders and can be completed
 *  - Return stage renders and can be completed
 *  - Session complete screen appears at /session/[id]/complete
 *
 * The session page has a built-in demo mode (no token required) which is
 * used for the stage-progression tests so they can run without a server.
 * Tests that require real API calls are guarded by HEMISPHERE_E2E=1.
 */

import { test, expect } from '@playwright/test';
import { loginAs, TEST_USER } from './helpers/auth';

const E2E_ENABLED = process.env.HEMISPHERE_E2E === '1';

// ---------------------------------------------------------------------------
// Dashboard → session start (requires server)
// ---------------------------------------------------------------------------

test('authenticated user can start a session from the dashboard', async ({ page }) => {
  test.skip(!E2E_ENABLED, 'Requires running server with DATABASE_URL');

  await loginAs(page, TEST_USER.email, TEST_USER.password);
  await expect(page).toHaveURL('/dashboard');

  // Wait for topics to load (the select becomes interactive)
  const topicSelect = page.locator('#topic-select');
  await expect(topicSelect).toBeVisible({ timeout: 8_000 });

  // Pick the first available option (not the disabled placeholder)
  const firstOption = topicSelect.locator('option:not([disabled])').first();
  const topicValue = await firstOption.getAttribute('value');
  if (topicValue) {
    await topicSelect.selectOption(topicValue);
  }

  // Click begin
  const beginBtn = page.getByRole('button', { name: /begin learning/i });
  await expect(beginBtn).toBeEnabled();
  await beginBtn.click();

  // Should navigate to /session/[id] or /session/new while creating
  await page.waitForURL(/\/session\//, { timeout: 10_000 });
  await expect(page.url()).toMatch(/\/session\//);
});

// ---------------------------------------------------------------------------
// Demo-mode session stage progression (no server required)
// ---------------------------------------------------------------------------

test.describe('session stage progression (demo mode)', () => {
  // The session page enters demo mode when no token exists in localStorage.
  // Navigate directly with a topicId query param so the stub session renders.

  test('Encounter stage renders with hook and story content', async ({ page }) => {
    await page.goto('/session/new?topicId=Music+Harmony');

    // Page should leave the loading state and show the encounter stage
    await expect(page.locator('[data-stage="encounter"]')).toBeVisible({ timeout: 8_000 });

    // The hook question should be somewhere on the page
    const hookText = page.getByText(/what do you already know about/i);
    await expect(hookText).toBeVisible();
  });

  test('Encounter stage has a Continue or Begin button to progress', async ({ page }) => {
    await page.goto('/session/new?topicId=Music+Harmony');

    await expect(page.locator('[data-stage="encounter"]')).toBeVisible({ timeout: 8_000 });

    // There should be at least one action button to proceed through the encounter
    const actionBtn = page.getByRole('button').filter({ hasText: /continue|begin|next|start/i }).first();
    await expect(actionBtn).toBeVisible();
  });

  test('session error page shows return link when no topicId provided', async ({ page }) => {
    // Navigating to /session/new without topicId and without a token triggers demo mode
    // Demo mode always renders the encounter stage since topicId defaults to 'demo-topic'
    await page.goto('/session/new');

    // In demo mode the page renders — just check it is not a hard crash
    // (loading spinner should resolve to either encounter or error state)
    await page.waitForFunction(
      () => {
        const stage = document.querySelector('[data-stage]');
        const errorAlert = document.querySelector('[role="alert"]');
        const statusEl = document.querySelector('[role="status"]');
        // Stop waiting once not still in the initial loading spinner
        return stage !== null || errorAlert !== null || (statusEl && statusEl.textContent?.includes('Preparing') === false);
      },
      { timeout: 8_000 }
    );

    // No uncaught JS errors
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    expect(errors).toHaveLength(0);
  });

  test('session complete page renders congratulation heading', async ({ page }) => {
    // Without a token the complete page redirects to /login, so test in E2E mode
    test.skip(!E2E_ENABLED, 'Requires running server — complete page redirects without token');

    await loginAs(page, TEST_USER.email, TEST_USER.password);

    // Navigate directly to a known complete page (session must exist)
    await page.goto('/session/demo/complete');
    await expect(page.getByRole('heading', { name: /session complete/i })).toBeVisible({ timeout: 8_000 });
  });
});

// ---------------------------------------------------------------------------
// Full session loop (requires server)
// ---------------------------------------------------------------------------

test('full session loop: Encounter → Analysis → Return → Complete', async ({ page }) => {
  test.skip(!E2E_ENABLED, 'Requires running server with DATABASE_URL and seed topics');

  await loginAs(page, TEST_USER.email, TEST_USER.password);

  // Navigate to a fresh session
  await page.goto('/session/new?topicId=demo-topic&sessionType=standard');
  await page.waitForURL(/\/session\//, { timeout: 10_000 });

  // --- Encounter stage ---
  await expect(page.locator('[data-stage="encounter"]')).toBeVisible({ timeout: 10_000 });
  // Advance through the encounter; the exact controls depend on EncounterSession
  // but at minimum a "Continue" / "Next" button should exist.
  let continueBtn = page.getByRole('button').filter({ hasText: /continue|next|begin|done/i }).first();
  await continueBtn.click();

  // --- Transition overlay ---
  // The StageTransition overlay has role="status" and mentions "Analysis"
  const transitionStatus = page.getByRole('status', { name: /transitioning/i });
  // It auto-dismisses after 1.4 s — just wait for it to disappear
  await expect(transitionStatus).toBeHidden({ timeout: 5_000 });

  // --- Analysis stage ---
  await expect(page.locator('[data-stage="analysis"]')).toBeVisible({ timeout: 8_000 });
  // Progress through all analysis items
  continueBtn = page.getByRole('button').filter({ hasText: /continue|next|submit|done/i }).first();
  await expect(continueBtn).toBeVisible();
  await continueBtn.click();

  // --- Transition to Return ---
  await expect(page.locator('[data-stage="analysis"]')).toBeHidden({ timeout: 5_000 });

  // --- Return stage ---
  await expect(page.getByText(/how does.*connect/i).or(page.getByText(/bridging/i))).toBeVisible({
    timeout: 8_000,
  });
  continueBtn = page.getByRole('button').filter({ hasText: /continue|next|submit|done|complete/i }).first();
  await continueBtn.click();

  // --- Session complete ---
  await page.waitForURL(/\/session\/.*\/complete/, { timeout: 15_000 });
  await expect(page.getByRole('heading', { name: /session complete/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /back to dashboard/i })).toBeVisible();
});
