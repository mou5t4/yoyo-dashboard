import { test as base, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * Login helper for E2E tests
 * Handles authentication by submitting the login form programmatically
 */
export async function login(page: Page) {
  // Go to homepage
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  // Check if first run
  const acceptButton = page.getByRole('button', { name: /accept/i });
  const isFirstRun = await acceptButton.isVisible({ timeout: 2000 }).catch(() => false);

  if (isFirstRun) {
    // Handle first run setup
    await acceptButton.click();
    await page.waitForTimeout(1000);

    // Fill password setup form
    await page.fill('input[name="password"]', 'password123');
    await page.fill('input[name="confirmPassword"]', 'password123');
    await page.getByRole('button', { name: /complete setup/i }).click();

    // Wait for redirect or error
    await page.waitForTimeout(2000);

    // Check if we're on dashboard
    const url = page.url();
    if (!url.includes('/dashboard')) {
      throw new Error(`Setup failed. Current URL: ${url}`);
    }
  } else {
    // Use the UI form to login (simpler and more reliable)
    await page.waitForSelector('input[name="username"]', { state: 'visible' });
    await page.waitForSelector('input[name="password"]', { state: 'visible' });

    // Fill the form
    await page.fill('input[name="username"]', 'parent');
    await page.fill('input[name="password"]', 'password123');

    // Wait for JavaScript to fully load by checking if Remix is initialized
    await page.waitForFunction(() => {
      return window && (window as any).__remixContext !== undefined;
    }, { timeout: 10000 }).catch(() => {
      console.log('Remix context not found, continuing anyway...');
    });

    // Click submit and wait for navigation
    await Promise.all([
      page.waitForNavigation({ url: /dashboard/, timeout: 15000 }).catch(() => null),
      page.click('button[type="submit"]'),
    ]);

    // Give it a moment to settle
    await page.waitForTimeout(1000);

    // Check if we're on dashboard
    const url = page.url();
    if (!url.includes('/dashboard')) {
      // Try navigating directly as a fallback
      await page.goto('/dashboard');
      await page.waitForTimeout(1000);

      if (!page.url().includes('/dashboard')) {
        throw new Error(`Login failed. Current URL: ${page.url()}`);
      }
    }
  }
}

// Export a test fixture with authentication
export const test = base.extend({
  authenticatedPage: async ({ page }, use) => {
    await login(page);
    await use(page);
  },
});

export { expect };
