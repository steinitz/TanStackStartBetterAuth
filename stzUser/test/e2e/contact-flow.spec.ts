import { test, expect } from '@playwright/test';
import {contactSentConfirmationH1Default} from '~stzUser/components/Other/ContactSent';
import { testConstants } from '~stzUser/test/constants';
import { contactFormSelectors } from '~stzUser/components/RouteComponents/ContactForm';

test.describe('Contact Form Success Message', () => {
  test('should show success message after form submission', async ({ page }) => {
    // Adds browser logs to the playwright logs
    page.on('console', msg => {
      console.log(`🖥️ Browser console [${msg.type()}]:`, msg.text());
    });

    // Navigate to contact page
    await page.goto('/contact');

    // Fill out the contact form
    await page.fill(contactFormSelectors.nameInput, testConstants.defaultUserName);
    await page.fill(contactFormSelectors.emailInput, `playwright-test@${testConstants.defaultUserDomain}`);
    await page.fill(contactFormSelectors.messageTextarea, 'This is a test message from Playwright.');

    // Verify form values before submission
    const name = await page.inputValue(contactFormSelectors.nameInput);
    const email = await page.inputValue(contactFormSelectors.emailInput);
    const message = await page.inputValue(contactFormSelectors.messageTextarea);

    expect(name).toEqual(testConstants.defaultUserName);
    expect(email).toEqual(`playwright-test@${testConstants.defaultUserDomain}`);
    expect(message).toEqual('This is a test message from Playwright.');

    // Submit the form
    await expect(page.getByRole('button')).toBeEnabled();
    await page.click('button[type="submit"]');
    
    // Wait for and verify the success message
    await expect(page.locator('h1')).toContainText(contactSentConfirmationH1Default, {timeout: 10000});
  });
});