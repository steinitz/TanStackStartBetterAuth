import { expect } from '@playwright/test';
import type { Page, Locator } from '@playwright/test';

/**
 * Helper function to sign in a user
 * Navigates to signin page, fills credentials, submits form, and confirms success
 * Reusable for multiple test flows (change email, change password, etc.)
 */
export async function signInUser(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/auth/signin');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  
  // Wait for either successful navigation or error message
  try {
    await page.waitForURL(url => !url.toString().includes('/auth/signin'), { timeout: 3000 });
  } catch (timeoutError) {
    // Check if there's an error message on the page
    const errorMessage = await page.locator('[role="alert"], .error, .text-red-500').textContent().catch(() => null);
    if (errorMessage) {
      throw new Error(`Sign in failed with error: ${errorMessage}`);
    }
    // If no error message, the signin might just be slow
    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    if (currentUrl.includes('/auth/signin')) {
      throw new Error(`Sign in failed - still on signin page: ${currentUrl}`);
    }
  }
  
  // Final confirmation that we're signed in
  const currentUrl = page.url();
  expect(currentUrl).not.toContain('/auth/signin');
}

/**
 * Exponential backoff utility for waiting on elements or conditions in E2E tests
 * This pattern has proven crucial for E2E test stability across the codebase
 * 
 * @param operation - Function that returns a Promise, should throw if condition not met
 * @param maxAttempts - Maximum number of retry attempts (default: 10)
 * @param baseWaitMs - Base wait time in milliseconds (default: 500)
 * @param maxWaitMs - Maximum wait time per attempt in milliseconds (default: 3000)
 * @param multiplier - Exponential backoff multiplier (default: 1.5)
 */
export async function waitWithExponentialBackoff<T>(
  operation: () => Promise<T>,
  options: {
    maxAttempts?: number;
    baseWaitMs?: number;
    maxWaitMs?: number;
    multiplier?: number;
    errorMessage?: string;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 10,
    baseWaitMs = 500,
    maxWaitMs = 3000,
    multiplier = 1.5,
    errorMessage = 'Operation failed after maximum attempts'
  } = options;

  let attempts = 0;
  let lastError: Error;

  while (attempts < maxAttempts) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      attempts++;
      
      if (attempts >= maxAttempts) {
        throw new Error(`${errorMessage} (${maxAttempts} attempts). Last error: ${lastError.message}`);
      }
      
      const waitTime = Math.min(baseWaitMs * Math.pow(multiplier, attempts), maxWaitMs);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw lastError!;
}

/**
 * Convenience function for waiting on Playwright locator visibility with exponential backoff
 * Common pattern used across E2E tests for element visibility checks
 */
export async function waitForElementVisible(
  locator: Locator,
  options: {
    maxAttempts?: number;
    baseWaitMs?: number;
    maxWaitMs?: number;
    multiplier?: number;
    timeout?: number;
    errorMessage?: string;
  } = {}
): Promise<void> {
  const { timeout = 1000, errorMessage, ...backoffOptions } = options;
  
  await waitWithExponentialBackoff(
    async () => {
      await expect(locator).toBeVisible({ timeout });
    },
    {
      ...backoffOptions,
      errorMessage: errorMessage || `Element not visible after maximum attempts: ${locator}`
    }
  );
}