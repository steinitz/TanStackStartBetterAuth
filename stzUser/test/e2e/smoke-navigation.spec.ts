import { test, expect } from '@playwright/test';

test.describe('Smoke Test Navigation', () => {
  test('should navigate to home page and verify basic elements', async ({ page }) => {
    // Navigate to home page
    await page.goto('/');

    // Verify page loads successfully
    await expect(page).toHaveTitle(/TanStack Start/);

    // Verify main content area is present
    await expect(page.locator('main').first()).toBeVisible();

    // Verify header section (logo) is present
    await expect(page.locator('img[alt="logo"]')).toBeVisible();

    // Verify navigation links are present
    await expect(page.locator('a[href="/contact"]')).toBeVisible();
  });

  test('should navigate to contact page and verify elements', async ({ page }) => {
    // Navigate to contact page
    await page.goto('/contact');

    // Verify page loads successfully
    await expect(page).toHaveTitle(/TanStack Start/);

    // Verify main content area is present
    await expect(page.locator('main').first()).toBeVisible();

    // Verify header section (logo) is present
    await expect(page.locator('img[alt="logo"]')).toBeVisible();

    // Verify navigation links are present
    await expect(page.locator('a[href="/contact"]')).toBeVisible();

    // Verify navigation still works
    await expect(page.getByRole('link', { name: 'logo' })).toBeVisible();
  });

  test('should navigate between pages successfully', async ({ page }) => {
    // Start at home page
    await page.goto('/');
    await expect(page).toHaveURL('/');

    // Navigate to contact page via link
    await page.getByRole('link', { name: 'Contact' }).click();
    await expect(page).toHaveURL('/contact');

    // Navigate back to home page via logo link
    await page.getByRole('link', { name: 'logo' }).click();
    await expect(page).toHaveURL('/');
  });
});