import { test, expect } from '@playwright/test';

test.describe('Signup Flow', () => {
  test('should complete signup flow and show success message', async ({ page }) => {
    // Listen for console messages and errors
    page.on('console', msg => {
      console.log(`🖥️ Browser console [${msg.type()}]:`, msg.text());
    });
    
    page.on('pageerror', error => {
      console.log('🚨 Page error:', error.message);
    });
    
    // Set up request interception to identify email-related calls
    const serverRequestRoutePrefix = '_serverFn';
    await page.route(`**/${serverRequestRoutePrefix}/**`, async (route, request) => {
      const url = request.url();
      const method = request.method();

      if (method === 'POST') {
        console.log('📡 POST request to:', url);
        const postData = request.postData();
        
        // Check for email-related requests (signup or verification email)
        if ((postData && (postData.includes('sendVerificationEmail') || postData.includes('signUp'))) || 
            url.includes('sendVerificationEmail') || url.includes('signUp')) {
          console.log('🔄 Found email-related request to:', url);
          
          // Log request details
          if (postData) {
            try {
              const postDataJson = JSON.parse(postData);
              console.log('📦 POST data:', postDataJson);
            } catch (e) {
              console.log('📦 POST data (raw):', postData);
            }
          }
          
          // Mock the email-related response to prevent actual email sending
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, message: 'Email operation successful (mocked)', result: true })
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

    // Navigate to signup page
    await page.goto('/auth/signup');

    // Debug: Log current page state
    console.log('📄 Current page title:', await page.title());
    
    // Check if we're on the signup page by looking for the form
    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();

    // Generate unique email to avoid conflicts
    const timestamp = Date.now();
    const uniqueEmail = `testuser${timestamp}@example.com`;
    
    // Fill out the signup form
    await page.fill('input[name="email"]', uniqueEmail);
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="password"]', 'TestPassword123!');

    // Read back the values before submission
    // Note: Adding this helps with timing for route interception
    const email = await page.inputValue('input[name="email"]');
    const name = await page.inputValue('input[name="name"]');
    const password = await page.inputValue('input[name="password"]');

    console.log('form values before submission', {email, name, password: '***'});

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
    console.log('waiting for form button enabled after validation');
    await expect(page.getByRole('button', { name: 'Sign Up' })).toBeEnabled({timeout: timeoutSeconds * 1000});

    console.log('form submit button enabled: clicking');
    await page.click('button[type="submit"]');

    // Wait for any network activity to complete
    await page.waitForLoadState('networkidle', { timeout: timeoutSeconds * 1000});

    // Debug: Log page state after submission
    console.log('📄 After submission h1 text:', await page.locator('h1').textContent());

    // Wait for and verify the success message
    await expect(page.locator('h1')).toContainText('Account Created', {timeout: timeoutSeconds * 1000});
    
    // Verify the success message content
    await expect(page.getByText('We\'ve sent an email-confirmation link to')).toBeVisible();
    await expect(page.getByText(uniqueEmail)).toBeVisible();
    await expect(page.getByText('Please check your email inbox and follow the instructions')).toBeVisible();
    
    // Verify the OK button is present
    await expect(page.getByRole('button', { name: 'Ok' })).toBeVisible();
    
    console.log('✅ Signup flow test completed successfully');
  });
});