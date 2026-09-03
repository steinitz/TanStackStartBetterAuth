import { test, expect } from '@playwright/test';
import { homeLinkName } from '~stzUser/constants';

test.describe('Smoke Test Navigation', () => {
  test('should navigate to home page and verify basic elements', async ({ page }) => {
    // Navigate to home page
    await page.goto('/');

    // Verify page loads successfully via stable footer element
    await expect(
      page.locator('footer'), 
      "This test relies on the word 'copyright' in the / page.  At the time of writing 'copyright' is in the footer.  You can modify smoke-navigation.spec.ts to change this"
    ).toContainText(/copyright/i);

    // Verify main content area is present
    await expect(page.locator('main').first()).toBeVisible();

    // Verify the header is present, by the home link's own name rather than by the image
    // inside it. The image is decorative, and a downstream app may take it away for a moment
    // — ChessHurdles swaps it for a spinner while the home page loads — so the link is the
    // part that is always there.
    await expect(page.getByRole('link', { name: homeLinkName })).toBeVisible();

    // Verify navigation links are present
    await expect(page.locator('a[href="/contact"]')).toBeVisible();
  });

  test('should navigate to contact page and verify elements', async ({ page }) => {
    // Navigate to contact page
    await page.goto('/contact');

    // Verify page loads successfully via stable footer element
    await expect(
      page.locator('footer'), 
      "This test relies on the word 'copyright' in the / page.  At the time of writing 'copyright' is in the footer.  You can modify smoke-navigation.spec.ts to change this"
    ).toContainText(/copyright/i);

    // Verify main content area is present
    await expect(page.locator('main').first()).toBeVisible();

    // Verify the header is present, by the home link's own name. This used to be asserted
    // twice in this test — once through the image and once through the link — which were the
    // same claim made two ways.
    await expect(page.getByRole('link', { name: homeLinkName })).toBeVisible();

    // Verify navigation links are present
    await expect(page.locator('a[href="/contact"]')).toBeVisible();
  });

  test('should navigate between pages successfully', async ({ page }) => {
    // Start at home page
    await page.goto('/');
    await expect(page).toHaveURL('/');

    // Navigate to contact page via link
    await page.getByRole('link', { name: 'Contact' }).click();
    await expect(page).toHaveURL('/contact');

    // Navigate back to home page via the logo link
    await page.getByRole('link', { name: homeLinkName }).click();
    await expect(page).toHaveURL('/');
  });
});