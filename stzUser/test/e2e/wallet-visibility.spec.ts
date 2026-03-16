import { test, expect } from '@playwright/test';
import { createVerifiedTestUser } from './utils/user-verification';
import { testConstants } from '~stzUser/test/constants';
import { clientEnv } from '~stzUser/lib/env';

test.use({
  launchOptions: {
    // slowMo: 1000,
  },
});

test.describe('Wallet Visibility and Reactivity', () => {
  test('should show correct wallet status after signup and updates', async ({ page }) => {
    test.setTimeout(60000);
    
    // 1. Create and verify a new test user programmatically as an admin
    const uniqueEmail = await createVerifiedTestUser({ shouldBeAdmin: true });
    
    // 2. Sign in via the UI
    await page.goto('/auth/signin');
    await page.fill('input[name="email"]', uniqueEmail);
    await page.fill('input[name="password"]', testConstants.defaultPassword);
    
    // Ensure the page is ready and stable before clicking
    const signInButton = page.getByRole('button', { name: 'Sign In' });
    await expect(signInButton).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(500); // Wait for hydration stabilization
    
    await signInButton.click();

    // Wait for redirect to home and session to hydrate
    await expect(page).toHaveURL('/', { timeout: 15000 });
    await expect(page.locator('p', { hasText: uniqueEmail })).toBeVisible({ timeout: 15000 });

    // The WalletWidget should be visible in the header showing the daily grant
    const walletBadge = page.locator('span', { hasText: /Credits/ });
    await expect(walletBadge).toBeVisible({ timeout: 15000 });
    await expect(walletBadge).toContainText(`${clientEnv.DAILY_GRANT_CREDITS} Credits`);

    // 3. Grant 10 Credits via Admin Tools
    // Note: User must be admin for this. Usually the test setup handles roles.
    // If the test user isn't admin, we might need a different approach, 
    // but the existing test assumed 'Developer Tools' were visible.
    
    // Assuming we navigate to /admin or it's on page
    await page.goto('/admin');
    
    // Note: This next part will fail if the user is not an admin, 
    // which is the current "mystery" we are leaving for another day.
    await expect(page.locator('h1')).toContainText('Admin Tools', { timeout: 15000 });
    
    await page.fill('input[type="number"]', '10');
    await page.getByRole('button', { name: 'Process Grant' }).click();

    // The header widget should now show daily + 10
    await expect(walletBadge).toContainText(`${clientEnv.DAILY_GRANT_CREDITS + 10} Credits`, { timeout: 10000 });

    // 4. Consume 1 Credit
    await page.getByRole('button', { name: 'Consume 1 Credit' }).click();

    // Page reloads
    await expect(walletBadge).toContainText(`${clientEnv.DAILY_GRANT_CREDITS + 9} Credits`);
  })
})
