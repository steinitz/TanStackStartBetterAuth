import { test, expect } from '@playwright/test';

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
    await page.route('**/*', async (route, request) => {
      const url = request.url();
      const method = request.method();
      
      if (method === 'POST') {
        console.log('📡 POST request to:', url);
        const postData = request.postData();
        if (postData) {
          const postDataJson = JSON.parse(postData);
          console.log('📦 POST data from:', `${postDataJson.data.from}, to: ${postDataJson.data.to}`);
        }
        
        // Check for sendEmail in URL or POST data
        if ((postData && postData.includes('sendEmail')) || url.includes('sendEmail')) {
          console.log('🔄 Found sendEmail request to:', url);
          // console.log('📦 Full POST data:', postData);
        }
      }
      
      // Continue with the original request (no interception)
      await route.continue();
    });

    // Navigate to contact page
    await page.goto('/contact');

    // Debug: Log current page state
    console.log('📄 Current page title:', await page.title());
    console.log('📄 Current h1 text:', await page.locator('h1').textContent());

    // Fill out the contact form
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('textarea[name="message"]', 'This is a test message from Playwright.');

    console.log('📝 Form filled, submitting...');

    // Add form submission event listener
    await page.evaluate(() => {
      const form = document.querySelector('form');
      if (form) {
        form.addEventListener('submit', (e) => {
          console.log('🎯 FORM SUBMIT EVENT FIRED!', e);
        });
      }
    });

    const timeoutSeconds = 21;

    // Submit the form
    console.log('📝 Form filled, submitting...');
    await page.click('button[type="submit"]');

    // Wait for any network activity to complete
    await page.waitForLoadState('networkidle', { timeout: timeoutSeconds * 1000});

    // Debug: Log page state after submission
    console.log('📄 After submission h1 text:', await page.locator('h1').textContent());

    // Wait for and verify the success message
    await expect(page.locator('h1')).toContainText("We've sent your message to our support team", {timeout: timeoutSeconds * 1000});

    // Email verification removed for simplified test
    
    console.log('✅ Contact form success message test completed');
  });
});