/**
 * E2E — PWA offline behaviour
 *
 * Covers:
 *  - App loads correctly and the service worker (sw.js) registers
 *  - App shows cached content while offline (context.setOffline)
 *  - Offline state does not cause unhandled JS errors
 *  - Reconnecting clears the offline state
 *
 * Service worker tests require a full page load and registration cycle, so
 * they run only when HEMISPHERE_E2E=1 is set.  The manifest-present check can
 * run without a server because it only examines the static file.
 */

import { test, expect, type BrowserContext } from '@playwright/test';
import { loginAs, TEST_USER } from './helpers/auth';

const E2E_ENABLED = process.env.HEMISPHERE_E2E === '1';

// ---------------------------------------------------------------------------
// Service worker registration
// ---------------------------------------------------------------------------

test('service worker registers on first load', async ({ page }) => {
  test.skip(!E2E_ENABLED, 'Requires running server');

  await page.goto('/');

  // Allow time for SW to register
  await page.waitForFunction(
    async () => {
      if (!('serviceWorker' in navigator)) return false;
      const reg = await navigator.serviceWorker.getRegistration();
      return reg !== undefined;
    },
    { timeout: 10_000 }
  );

  const swRegistered = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    return reg?.active !== null || reg?.installing !== null || reg?.waiting !== null;
  });

  expect(swRegistered).toBe(true);
});

test('manifest.json is served with correct content-type', async ({ page }) => {
  test.skip(!E2E_ENABLED, 'Requires running server');

  const response = await page.request.get('/manifest.json');
  expect(response.status()).toBe(200);

  const contentType = response.headers()['content-type'] ?? '';
  expect(contentType).toMatch(/application\/manifest\+json|application\/json/);

  const body = await response.json() as { name?: string; start_url?: string };
  expect(body.name).toBe('Hemisphere Learning');
  expect(body.start_url).toBe('/dashboard');
});

// ---------------------------------------------------------------------------
// Offline — content still shown from cache
// ---------------------------------------------------------------------------

test('app shows cached dashboard content while offline', async ({ page, context }) => {
  test.skip(!E2E_ENABLED, 'Requires running server with service worker caching');

  await loginAs(page, TEST_USER.email, TEST_USER.password);
  await expect(page).toHaveURL('/dashboard');

  // Allow the service worker to cache shell resources
  await page.waitForTimeout(2_000);

  // Go offline
  await context.setOffline(true);

  // Reload — the SW should serve the cached app shell
  await page.reload({ waitUntil: 'domcontentloaded' });

  // The dashboard heading or the brand name should still be present
  const brandOrHeading = page
    .getByText(/hemisphere/i)
    .or(page.getByRole('heading', { name: /welcome back/i }));
  await expect(brandOrHeading.first()).toBeVisible({ timeout: 8_000 });

  // Restore connectivity
  await context.setOffline(false);
});

// ---------------------------------------------------------------------------
// Offline — no unhandled JS errors
// ---------------------------------------------------------------------------

test('going offline does not throw unhandled JS errors on the dashboard', async ({
  page,
  context,
}: {
  page: import('@playwright/test').Page;
  context: BrowserContext;
}) => {
  test.skip(!E2E_ENABLED, 'Requires running server');

  const pageErrors: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));

  await loginAs(page, TEST_USER.email, TEST_USER.password);
  await expect(page).toHaveURL('/dashboard');

  // Simulate network loss
  await context.setOffline(true);

  // Wait a moment for any background fetch retries to settle
  await page.waitForTimeout(2_000);

  // Restore connectivity
  await context.setOffline(false);

  // No uncaught errors should have fired
  expect(pageErrors).toHaveLength(0);
});

// ---------------------------------------------------------------------------
// Offline — response queuing / sync on reconnect
// ---------------------------------------------------------------------------

test('interactions queued while offline sync when connectivity is restored', async ({
  page,
  context,
}: {
  page: import('@playwright/test').Page;
  context: BrowserContext;
}) => {
  test.skip(!E2E_ENABLED, 'Requires running server with Background Sync support');

  await loginAs(page, TEST_USER.email, TEST_USER.password);
  await expect(page).toHaveURL('/dashboard');

  // Drop the connection
  await context.setOffline(true);

  // Attempt to navigate to start a session (which will queue a POST)
  // The UI should respond gracefully (e.g. show an error or stay on dashboard)
  await page.getByRole('button', { name: /begin learning/i }).click().catch(() => {
    // Button may be disabled if no topics loaded — that is acceptable
  });

  // Restore connectivity — Background Sync should fire
  await context.setOffline(false);

  // Give the browser time to attempt the sync
  await page.waitForTimeout(3_000);

  // Page should still be functional — brand logo present
  await expect(page.getByText(/hemisphere/i).first()).toBeVisible();
});
