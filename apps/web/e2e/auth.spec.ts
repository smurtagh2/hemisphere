/**
 * E2E — Authentication flows
 *
 * Covers:
 *  - Root `/` redirects unauthenticated users to /login
 *  - Sign up with valid credentials reaches /dashboard
 *  - Log in with valid credentials reaches /dashboard
 *  - Log in with wrong password shows an error message
 *  - Log out redirects back to /login
 *
 * All tests that require a live server are written in full but skip
 * automatically unless `HEMISPHERE_E2E=1` is set, so the suite can
 * be committed and run locally or in CI once infrastructure is ready.
 */

import { test, expect } from '@playwright/test';
import { loginAs, TEST_USER } from './helpers/auth';

const E2E_ENABLED = process.env.HEMISPHERE_E2E === '1';

// ---------------------------------------------------------------------------
// Navigation guard
// ---------------------------------------------------------------------------

test('root / redirects unauthenticated users to /login', async ({ page }) => {
  test.skip(!E2E_ENABLED, 'Requires running server with DATABASE_URL');

  // Root page server-redirects authenticated users to /dashboard.
  // Without a token the AuthGuard (or login page) should handle the redirect.
  await page.goto('/');

  // Either /login or /signup is acceptable as the landing route.
  await expect(page).toHaveURL(/\/(login|signup)/);
});

// ---------------------------------------------------------------------------
// Sign up
// ---------------------------------------------------------------------------

test('user can sign up with valid credentials', async ({ page }) => {
  test.skip(!E2E_ENABLED, 'Requires running server with DATABASE_URL');

  await page.goto('/signup');

  // Fill the registration form
  await page.fill('input[autocomplete="name"]', TEST_USER.name);
  await page.fill('input[type="email"]', TEST_USER.email);
  // Two password fields: new-password autocomplete targets
  const passwordFields = page.locator('input[type="password"]');
  await passwordFields.nth(0).fill(TEST_USER.password);
  await passwordFields.nth(1).fill(TEST_USER.password);

  await page.click('button[type="submit"]');

  // After signup the app auto-logs in and navigates to the dashboard
  await page.waitForURL('/dashboard', { timeout: 10_000 });
  await expect(page).toHaveURL('/dashboard');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Welcome back');
});

test('sign up fails when passwords do not match', async ({ page }) => {
  test.skip(!E2E_ENABLED, 'Requires running server with DATABASE_URL');

  await page.goto('/signup');

  await page.fill('input[autocomplete="name"]', TEST_USER.name);
  await page.fill('input[type="email"]', TEST_USER.email);
  const passwordFields = page.locator('input[type="password"]');
  await passwordFields.nth(0).fill(TEST_USER.password);
  await passwordFields.nth(1).fill('DifferentPassword999!');

  await page.click('button[type="submit"]');

  // Client-side validation should block navigation and show an error
  const errorAlert = page.getByRole('alert');
  await expect(errorAlert).toBeVisible();
  await expect(errorAlert).toContainText(/passwords do not match/i);
  await expect(page).toHaveURL('/signup');
});

// ---------------------------------------------------------------------------
// Log in
// ---------------------------------------------------------------------------

test('user can log in with valid credentials', async ({ page }) => {
  test.skip(!E2E_ENABLED, 'Requires running server with DATABASE_URL');

  await loginAs(page, TEST_USER.email, TEST_USER.password);

  await expect(page).toHaveURL('/dashboard');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Welcome back');
});

test('log in with wrong password shows error', async ({ page }) => {
  test.skip(!E2E_ENABLED, 'Requires running server with DATABASE_URL');

  await page.goto('/login');
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[type="password"]', 'WrongPassword000!');
  await page.click('button[type="submit"]');

  // The API returns 401; the page renders an error alert without navigating
  const errorAlert = page.getByRole('alert');
  await expect(errorAlert).toBeVisible({ timeout: 8_000 });
  await expect(errorAlert).not.toBeEmpty();
  await expect(page).toHaveURL('/login');
});

// ---------------------------------------------------------------------------
// Log out
// ---------------------------------------------------------------------------

test('user can log out', async ({ page }) => {
  test.skip(!E2E_ENABLED, 'Requires running server with DATABASE_URL');

  // Start authenticated
  await loginAs(page, TEST_USER.email, TEST_USER.password);
  await expect(page).toHaveURL('/dashboard');

  // The dashboard header contains a "Sign out" button
  await page.getByRole('button', { name: /sign out/i }).click();

  // After logout the app redirects to /login
  await page.waitForURL('/login', { timeout: 8_000 });
  await expect(page).toHaveURL('/login');

  // Token should be cleared — navigating back to dashboard should redirect
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/(login|signup)/);
});
