import { test, expect } from '@playwright/test';
import {contactSentConfirmationH1Default} from '~stzUser/components/Other/ContactSent';
import { testConstants } from '~stzUser/test/constants';

test.describe('Contact Form Success Message', () => {
  test('should show success message after form submission', async ({ page }) => {
    // Listen for console messages and errors
    page.on('console', msg => {
      console.log(`🖥️ Browser console [${msg.type()}]:`, msg.text());
    });
    
    page.on('pageerror', error => {
      console.log('🚨 Page error:', error.message);
    });
    
    // Set up request interception to identify sendEmail calls
    const serverRequestRoutePrefix = '_serverFn';
    await page.route(`**/${serverRequestRoutePrefix}/**`, async (route, request) => {
    // await page.route(`*/**`, async (route, request) => {
      const url = request.url();
      const method = request.method();

      if (method === 'POST') {
        console.log('📡 POST request to:', url);
        const postData = request.postData();
        
        // Check for sendEmail in URL or POST data
        if ((postData && postData.includes('sendEmail')) || url.includes('sendEmail')) {
          console.log('🔄 Found sendEmail request to:', url);
          const postDataJson = JSON.parse(postData ?? '');
          console.log('📦 POST data from:', `${postDataJson.data.from ?? 'undefined'}, to: ${postDataJson.data.to ?? 'undefined'}`);
          // Mock the sendEmail response to prevent actual email sending
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, message: 'Email sent successfully (mocked)', result: true })
          });
        } 
        else {
          await route.continue();
        }
      }
      else {
        await route.continue();
      }
    });

    // Navigate to contact page
    await page.goto('/contact');

    // Debug: Log current page state
    console.log('📄 Current page title:', await page.title());
    console.log('📄 Current h1 text:', await page.locator('h1').textContent());

    // Fill out the contact form
    await page.fill('input[name="name"]', testConstants.defaultUserName);
    await page.fill('input[name="email"]', `playwright-test@${testConstants.defaultUserDomain}`);
    await page.fill('textarea[name="message"]', 'This is a test message from Playwright.');

    // read back the values before submission
    // note adding this made the route interception work
    // maybe a timing error?
    const name = await page.inputValue('input[name="name"]')
    const email = await page.inputValue('input[name="email"]')
    const message = await page.inputValue('textarea[name="message"]')

    console.log('form values before submission', {name, email, message});

    // Add form submission event listener
    await page.evaluate(() => {
      const form = document.querySelector('form');
      if (form) {
        form.addEventListener('submit', (e) => {
          console.log('🎯 form submit event fired', e);
        });
      }
    });

    const timeoutSeconds = 13;

    // Submit the form
    console.log(' waiting for form button enabled after validation');
    await expect(page.getByRole('button')).toBeEnabled({timeout: timeoutSeconds * 1000});

    console.log('form submit button enabled: clicking');
    await page.click('button[type="submit"]');

    // Wait for any network activity to complete
    await page.waitForLoadState('networkidle', { timeout: timeoutSeconds * 1000});

    // Debug: Log page state after submission
    console.log('📄 After submission h1 text:', await page.locator('h1').textContent());

    // Wait for and verify the success message
    await expect(page.locator('h1')).toContainText(contactSentConfirmationH1Default, {timeout: timeoutSeconds * 1000});

    // Email verification removed for simplified test
    
    console.log('✅ Contact form success message test completed');
  });
});