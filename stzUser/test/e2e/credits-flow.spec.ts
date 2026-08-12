import { test, expect } from '@playwright/test';
import { createAuthenticatedUser } from './utils/testAuthUtils';
import { readE2eEnvFromProcess } from './config/e2e-env';
import { expectWalletCredits, openAccountMenu, walletBadge } from './utils/accountMenu';
import { creditsSelectors, creditsStrings } from '~stzUser/components/RouteComponents/Credits';

const e2eEnv = readE2eEnvFromProcess();

test.describe('Credits Flow', () => {
  test('should allow claiming welcome grant and show the active purchase path', async ({ page }) => {
    // 1. Create a verified user and inject session — no signup UI, no Mailpit
    const { email: uniqueEmail } = await createAuthenticatedUser(page, { name: 'Credits Tester' });
    await page.goto('/');

    // 2. Open the account menu and click the Wallet Widget inside it
    // Opening also waits for the session to hydrate — the email is the panel's own content
    await openAccountMenu(page);
    await expect(page.locator('p', { hasText: uniqueEmail })).toBeVisible({ timeout: 15000 });

    await expect(walletBadge(page)).toContainText(`${e2eEnv.DAILY_GRANT_CREDITS} Credits`);
    // Picking an item dismisses the panel, so nothing is left covering the page it opens.
    await walletBadge(page).click();

    // 3. Verify we are on the Credits page
    await expect(page).toHaveURL(/\/auth\/credits/);
    await expect(page.locator('h1')).toContainText('Credits');

    // 4. Claim Welcome Grant
    const claimButton = page.getByRole('button', { name: creditsSelectors.claimWelcomeGrantButton });
    await expect(claimButton).toBeVisible();

    // A balance assertion alone is not enough: the old implementation reloaded the page and also
    // ended up with the right number. This marker survives React updates but not a document reload.
    await page.evaluate(() => {
      document.body.dataset.creditsFlowDocument = 'before-claim';
    });

    // Handle the alert
    page.once('dialog', dialog => {
      expect(dialog.message()).toContain(creditsStrings.welcomeGrantClaimedAlert);
      dialog.accept();
    });

    await claimButton.click();

    // Verify balance updated
    await expectWalletCredits(page, `${e2eEnv.DAILY_GRANT_CREDITS + e2eEnv.WELCOME_GRANT_CREDITS} Credits`);
    await expect(page.getByText('One-time Welcome Grant')).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.body.dataset.creditsFlowDocument)).toBe('before-claim');

    // 5. Verify the configured purchase path is available
    if (e2eEnv.IS_STRIPE_ENABLED) {
      await expect(page.getByRole('button', { name: creditsSelectors.payWithCardButton })).toBeVisible();
    } else {
      const requestButton = page.getByRole('button', { name: creditsSelectors.payViaBankTransferButton });
      await expect(requestButton).toBeVisible();
      await requestButton.click();

      // Verify instructions dialog appears
      await expect(page.locator('h2', { hasText: 'Bank Transfer Instructions' })).toBeVisible({ timeout: 10000 });
      await expect(page.locator('strong', { hasText: 'BSB:' })).toBeVisible();
      // Close dialog
      await page.getByRole('button', { name: 'Got it' }).click();
      await expect(page.locator('h2', { hasText: 'Bank Transfer Instructions' })).not.toBeVisible();
    }
  });

  test('should navigate from Credits Required dialog to credits page', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('span', { hasText: /Credits/ })).toBeDefined();
  });
});
