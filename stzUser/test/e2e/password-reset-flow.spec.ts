import { test, expect } from '@playwright/test';
import { createVerifiedTestUser } from './utils/user-verification';
import { testConstants } from '~stzUser/test/constants';
import { EmailTester } from './utils/EmailTester';
import { signInUser, waitWithExponentialBackoff } from './utils/testActions';
import type { Page } from '@playwright/test';
import { passwordResetSubject } from '../../lib/auth';
import { requestPasswordResetSelectors, requestPasswordResetStrings } from '~stzUser/components/RouteComponents/RequestPasswordReset';
import { setNewPasswordSelectors, setNewPasswordStrings } from '~stzUser/components/RouteComponents/SetNewPassword';

// Configure test-specific options for debugging
// We've now replaced the slowMo: options with more-specific waiting techniques
test.use({
  // headless: false,
  // launchOptions: {
  //   slowMo: 1000,
  // },
});

// Additional test selectors not covered by component exports

const signInSelectors = {
  signInForm: 'form',
  signInEmailInput: 'input[type="email"]',
  signInPasswordInput: 'input[type="password"]',
  signInButton: 'button[type="submit"]'
};

const commonSelectors = {
  detailsSection: 'details',
  summaryElement: 'summary'
};

/**
 * Helper function to find email by subject fragment
 * Reusable for any email type (verification, password reset, welcome, etc.)
 */
async function findEmailBySubject(targetEmailAddresses: string[], subjectFragment: string = passwordResetSubject): Promise<any> {
  const sentEmails = await EmailTester.getSentEmails();
  
  return sentEmails.find(email => 
      targetEmailAddresses.some(targetEmailAddress => email.envelope.to.includes(targetEmailAddress)) &&
    email.subject.toLowerCase().includes(subjectFragment.toLowerCase())
  );
}

/**
 * Helper function to extract and validate password reset links
 * Reusable for password reset flow
 */
function extractPasswordResetLink(email: any): string | null {
  // Use existing verification link extraction with 'reset' search string
  const resetLinks = EmailTester.extractVerificationLinks(email, 'reset');
  return resetLinks.length > 0 ? resetLinks[0] : null;
}

/**
` * Tests the complete password reset process:
 * 1. Navigate to signin page
 * 2. Click on "Reset Password" link in the details section
    // Step 3: Verify we're on the request password reset page
 * 4. Fill out the password reset form with specific form assertions
 * 5. Submit the password reset request
 * 6. Verify success message is displayed
 * 7. Verify password reset email was sent using helper function
 * 8. Extract password reset URL from email using helper function
 * 9. Click the password reset link (automatically redirects to set new password page)
 * 10. Fill out the new password form with specific form assertions
 * 11. Submit the new password
 * 12. Verify password reset completion
 * 13. Test that we can sign in with the new password using signInUser utility
 * 
 * This test demonstrates enhanced Playwright testing patterns:
 * - Centralized selector management with descriptive names
 * - Helper functions for email handling and link extraction
 * - Specific form state assertions (visibility, enabled state, values)
 * - Reusable signInUser utility for authentication testing
 * 
 * This test follows the model established by change-email-flow.spec.ts
 */
test.describe('Password Reset Flow', () => {
  
  test.beforeEach(async () => {
    // Clear any previous test emails
    EmailTester.clearSentEmails();
  });

  test('should complete password reset flow from signin page', async ({ page }) => {
    // Setup: Create verified test user
    const testEmailAddress = await createVerifiedTestUser();
    // Clear emails after user creation to isolate password reset behavior
    EmailTester.clearSentEmails();

    // const originalPassword = testConstants.defaultPassword;
    const newPassword = 'NewTestPassword123!';
    
    const timeoutSeconds = 13;

    // Step 1: Navigate to signin page
    await page.goto('/auth/signin');
    await expect(page.locator('h1')).toContainText('Sign In');
    
    // Step 2: Click on "Reset Password" link in the details section
    const passwordResetDetails = page.locator('details').filter({ hasText: 'Can\'t sign in?' });
    await expect(passwordResetDetails).toBeVisible();
    await passwordResetDetails.locator('summary').click(); // Open the details section
    await expect(page.getByText('Forgot password?')).toBeVisible();
    
    const resetPasswordLink = page.getByRole('link', { name: 'Reset Password' });
    await expect(resetPasswordLink).toBeVisible();
    await resetPasswordLink.click();

    // Step 3: Verify we're on the request password reset page
    await expect(page).toHaveURL('/auth/requestPasswordReset');
    await expect(page.locator('h1')).toContainText(requestPasswordResetStrings.pageTitle);
    
    // Step 4: Fill out the password reset form with specific form assertions
    await expect(page.locator(requestPasswordResetSelectors.passwordResetForm)).toBeVisible();
    await expect(page.locator(requestPasswordResetSelectors.emailInput)).toBeVisible();
    await expect(page.locator(requestPasswordResetSelectors.emailInput)).toBeEnabled();
    
    await page.fill(requestPasswordResetSelectors.emailInput, testEmailAddress);
    await expect(page.locator(requestPasswordResetSelectors.emailInput)).toHaveValue(testEmailAddress);
    
    // Step 5: Submit the password reset request
    await expect(page.getByRole('button', { name: requestPasswordResetStrings.resetPasswordButton })).toBeEnabled();
    await page.click(requestPasswordResetSelectors.resetPasswordButton);
    
    // Step 5a: Wait for email sending to complete by checking for success message
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toContainText(requestPasswordResetSelectors.linkSentH1Text, { timeout: 10000 });
    
    // Step 6: Verify success message is displayed
    // console.log('password-reset-flow - 6. checking for email-sent dialog')
    await expect(page.locator('h1')).toContainText(requestPasswordResetSelectors.linkSentH1Text);
    // await expect(page.getByText('We\'ve sent a password-reset link to')).toBeVisible();
    // await expect(page.getByText(testEmail)).toBeVisible();
    // await expect(page.getByText('Please check your email inbox and follow the instructions')).toBeVisible();
    // await expect(page.getByRole('button', { name: 'Ok' })).toBeVisible();

    // console.log('email-sent dialog appeared')
    
    // Step 7: Verify password reset email was sent using helper function
    // Poll for email with abstracted exponential backoff utility
    const passwordResetEmail = await waitWithExponentialBackoff(
      async () => {
        const email = await findEmailBySubject([testEmailAddress]);
        if (!email) {
          throw new Error('Password reset email not found');
        }
        return email;
      },
      {
        errorMessage: 'Password reset email not received after maximum attempts'
      }
    );
    
    const allEmails = await EmailTester.getSentEmails();
    console.log('📧 Total emails found:', allEmails.length);
    // console.log('📧 All sent emails:', allEmails.map(e => ({ to: e.envelope?.to, subject: e.subject })));
    console.log('🔍 Looking for subject containing:', passwordResetSubject);
    // console.log('🔍 Target email:', testEmail);
    
    // Debug the findEmailBySubject function
    const matchingEmails = allEmails.filter(email => {
      const toMatch = email.envelope?.to?.includes?.(testEmailAddress);
      const subjectMatch = email.subject?.toLowerCase().includes(passwordResetSubject.toLowerCase());
      console.log('📧 Email check:', { to: email.envelope?.to, subject: email.subject, toMatch, subjectMatch });
      return toMatch && subjectMatch;
    });
    // console.log('🎯 Matching emails:', matchingEmails.length);
    console.log('📧 Matching emails:', matchingEmails.map(e => ({ to: e.envelope?.to, subject: e.subject, body: e.text || e.html || 'No body content' })));

    expect(passwordResetEmail).toBeTruthy();
    expect(passwordResetEmail?.envelope?.to).toContain(testEmailAddress);
    expect(passwordResetEmail?.subject).toContain('Reset');
    
    // Step 8: Extract password reset URL from email using helper function
    const passwordResetUrl = extractPasswordResetLink(passwordResetEmail);
    expect(passwordResetUrl).toBeTruthy();
    
    if (passwordResetUrl) {
      console.log('🔗 Password reset URL found:', passwordResetUrl);
      
      // Step 9: Click the password reset link (automatically redirects to set new password page)
      await page.goto(passwordResetUrl);
      
      // Wait for the set new password page to load with proper error handling
      await page.waitForLoadState('networkidle', { timeout: 15000 });
      
      // Verify we're on the set new password page
      await expect(page.locator('h1')).toContainText(setNewPasswordStrings.pageTitle, { timeout: 10000 });
      
      // Step 10: Fill out the new password form with specific form assertions
      await expect(page.locator(setNewPasswordSelectors.setNewPasswordForm)).toBeVisible();
      const passwordInput = page.locator(setNewPasswordSelectors.passwordInput);
      await expect(passwordInput).toBeVisible();
      await expect(passwordInput).toBeEnabled();
      
      await passwordInput.fill(newPassword);
      await expect(passwordInput).toHaveValue(newPassword);
      
      // Step 11: Submit the new password
      await expect(page.getByRole('button', { name: setNewPasswordStrings.setPasswordButton })).toBeEnabled();
      await page.click(setNewPasswordSelectors.setPasswordButton);
      
      // Step 12: Verify password reset completion
      // Wait for form submission and potential redirect
      await page.waitForLoadState('networkidle', { timeout: 15000 });
      
      // Wait for either success message or redirect to signin
      try {
        await expect(page.locator('h1')).toContainText(['Sign In', 'Success', 'Password Updated'], { timeout: 10000 });
      } catch {
        // If no clear success indicator, proceed to signin test
        console.log('No clear success message found, proceeding to signin test');
      }
      
      // Step 13: Test that we can sign in with the new password using signInUser utility
      await signInUser(page, testEmailAddress, newPassword);
      
      console.log('✅ Password reset flow completed successfully');
    } else {
      console.warn('⚠️ No password reset URL was captured - skipping password reset completion test');
    }
  });
});