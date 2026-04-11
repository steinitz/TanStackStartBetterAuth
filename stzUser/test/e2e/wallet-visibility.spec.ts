import { test, expect } from '@playwright/test';
import { createAuthenticatedUser } from './utils/testAuthUtils';
import { clientEnv } from '~stzUser/lib/env';

test.describe('Wallet Visibility and Reactivity', () => {
  test('should show correct wallet status after signup and updates', async ({ page }) => {
    test.setTimeout(60000);

    // 1. Create a verified admin user and inject session — no signup UI, no Mailpit
    const { email: uniqueEmail } = await createAuthenticatedUser(page, { role: 'admin' });
    await page.goto('/');

    // Wait for session to hydrate
    await expect(page.locator('p', { hasText: uniqueEmail })).toBeVisible({ timeout: 15000 });

    // The WalletWidget should be visible in the header showing the daily grant
    const walletBadge = page.locator('span', { hasText: /Credits/ });
    await expect(walletBadge).toBeVisible({ timeout: 15000 });
    await expect(walletBadge).toContainText(`${clientEnv.DAILY_GRANT_CREDITS} Credits`);

    // 3. Grant 10 Credits via Admin Tools
    await page.goto('/admin');

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
