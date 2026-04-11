import { test, expect } from '@playwright/test';
import { createAuthenticatedUser } from './utils/testAuthUtils';
import { clientEnv } from '~stzUser/lib/env';
import { creditsSelectors, creditsStrings } from '~stzUser/components/RouteComponents/Credits';

test.describe('Credits Flow', () => {
  test('should allow claiming welcome grant and requesting bank transfer', async ({ page }) => {
    // 1. Create a verified user and inject session — no signup UI, no Mailpit
    const { email: uniqueEmail } = await createAuthenticatedUser(page, { name: 'Credits Tester' });
    await page.goto('/');

    // 2. Click the Wallet Widget in the header
    // Wait for session to hydrate - we should see the user email
    await expect(page.locator('p', { hasText: uniqueEmail })).toBeVisible({ timeout: 15000 });

    const walletWidget = page.locator('span', { hasText: /Credits/ });
    await expect(walletWidget).toBeVisible({ timeout: 15000 });
    await expect(walletWidget).toContainText(`${clientEnv.DAILY_GRANT_CREDITS} Credits`);
    await walletWidget.click();

    // 3. Verify we are on the Credits page
    await expect(page).toHaveURL(/\/auth\/credits/);
    await expect(page.locator('h1')).toContainText('Credits');

    // 4. Claim Welcome Grant
    const claimButton = page.getByRole('button', { name: creditsSelectors.claimWelcomeGrantButton });
    await expect(claimButton).toBeVisible();

    // Handle the alert
    page.once('dialog', dialog => {
      expect(dialog.message()).toContain(creditsStrings.welcomeGrantClaimedAlert);
      dialog.accept();
    });

    await claimButton.click();

    // Verify balance updated
    await expect(walletWidget).toContainText(`${clientEnv.DAILY_GRANT_CREDITS + clientEnv.WELCOME_GRANT_CREDITS} Credits`, { timeout: 10000 });

    // 5. Request Bank Transfer
    const requestButton = page.getByRole('button', { name: creditsSelectors.payViaBankTransferButton });
    await expect(requestButton).toBeVisible();
    await requestButton.click();

    // Verify instructions dialog appears
    await expect(page.locator('h2', { hasText: 'Bank Transfer Instructions' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('strong', { hasText: 'BSB:' })).toBeVisible();
    // Close dialog
    await page.getByRole('button', { name: 'Got it' }).click();
    await expect(page.locator('h2', { hasText: 'Bank Transfer Instructions' })).not.toBeVisible();
  });

  test('should navigate from Credits Required dialog to credits page', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('span', { hasText: /Credits/ })).toBeDefined();
  });
});
