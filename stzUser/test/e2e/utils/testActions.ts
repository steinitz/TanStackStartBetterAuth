import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * Helper function to sign in a user
 * Navigates to signin page, fills credentials, submits form, and confirms success
 * Reusable for multiple test flows (change email, change password, etc.)
 */
export async function signInUser(page: Page, email: string, password: string): Promise<void> {
  await page.goto('http://localhost:3000/auth/signin');
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