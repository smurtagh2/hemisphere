import type { Page } from '@playwright/test';

/**
 * Navigates to /login, fills credentials, submits, and waits for /dashboard.
 *
 * Assumes the server is running with a seeded TEST_USER account.
 */
export async function loginAs(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  // The Input component renders a real <input> with autocomplete attributes;
  // target by type since no name attribute is set by default.
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');
}

export const TEST_USER = {
  email: 'test@hemisphere.dev',
  password: 'TestPassword123!',
  name: 'Test User',
};
