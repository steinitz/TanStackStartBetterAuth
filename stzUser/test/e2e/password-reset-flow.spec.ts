import { test, expect } from '@playwright/test';
import { createVerifiedTestUser } from './utils/user-verification';
import { testConstants } from '~stzUser/test/constants';
import { EmailTester } from './utils/EmailTester';
import { signInUser } from './utils/testActions';
import type { Page } from '@playwright/test';
import { passwordResetSubject } from '../../lib/auth';

// Construct test selectors following model test pattern
const passwordResetSelectors = {
  // RequestPasswordReset page selectors
  passwordResetForm: 'form',
  emailInput: 'input[name="email"]',
  resetPasswordButton: 'button[type="submit"]',
  spinnerContainer: '.spinner',
  
  // SetNewPassword page selectors
  setPasswordForm: 'form',
  passwordInput: 'input[type="password"]',
  setPasswordButton: 'button[type="submit"]',
  
  // SignIn page selectors
  signInForm: 'form',
  signInEmailInput: 'input[type="email"]',
  signInPasswordInput: 'input[type="password"]',
  signInButton: 'button[type="submit"]',
  
  // Common selectors
  detailsSection: 'details',
  summaryElement: 'summary'
};

/**
 * Helper function to find email by subject fragment
 * Reusable for any email type (verification, password reset, welcome, etc.)
 */
function findEmailBySubject(targetEmailAddresses: string[], subjectFragment: string = passwordResetSubject): any {
  const sentEmails = EmailTester.getSentEmails();
  
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
  // Use existing verification link extraction as password reset links follow similar pattern
  const resetLinks = EmailTester.extractVerificationLinks(email);
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
    const testEmail = await createVerifiedTestUser();
    const originalPassword = testConstants.defaultPassword;
    const newPassword = 'NewTestPassword123!';
    
    // Clear emails after user creation to isolate password reset behavior
    EmailTester.clearSentEmails();

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
    await expect(page.locator('h1')).toContainText('Password Reset');
    
    // Step 4: Fill out the password reset form with specific form assertions
    await expect(page.locator(passwordResetSelectors.passwordResetForm)).toBeVisible();
    await expect(page.locator(passwordResetSelectors.emailInput)).toBeVisible();
    await expect(page.locator(passwordResetSelectors.emailInput)).toBeEnabled();
    
    await page.fill(passwordResetSelectors.emailInput, testEmail);
    await expect(page.locator(passwordResetSelectors.emailInput)).toHaveValue(testEmail);
    
    // Step 5: Submit the password reset request
    await expect(page.getByRole('button', { name: 'Reset Password' })).toBeEnabled();
    await page.click(passwordResetSelectors.resetPasswordButton);
    
    // Step 5a: Wait briefly to ensure email sending completes
    await page.waitForTimeout(1000);
    
    // Step 6: Verify success message is displayed
    await expect(page.locator('h1')).toContainText('Password Reset Link Sent', { timeout: timeoutSeconds * 1000 });
    await expect(page.getByText('We\'ve sent a password-reset link to')).toBeVisible();
    await expect(page.getByText(testEmail)).toBeVisible();
    await expect(page.getByText('Please check your email inbox and follow the instructions')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ok' })).toBeVisible();
    
    // Step 7: Verify password reset email was sent using helper function
    // Wait a moment for email to be processed
    await page.waitForTimeout(timeoutSeconds * 100);
    
    const allEmails = EmailTester.getSentEmails();
    console.log('📧 Total emails found:', allEmails.length);
    console.log('📧 All sent emails:', allEmails.map(e => ({ to: e.envelope?.to, subject: e.subject })));
    console.log('🔍 Looking for subject containing:', passwordResetSubject);
    console.log('🔍 Target email:', testEmail);
    
    // Debug the findEmailBySubject function
    const matchingEmails = allEmails.filter(email => {
      const toMatch = email.envelope?.to?.includes?.(testEmail);
      const subjectMatch = email.subject?.toLowerCase().includes(passwordResetSubject.toLowerCase());
      console.log('📧 Email check:', { to: email.envelope?.to, subject: email.subject, toMatch, subjectMatch });
      return toMatch && subjectMatch;
    });
    console.log('🎯 Matching emails:', matchingEmails.length);
    
    const passwordResetEmail = findEmailBySubject([testEmail]);
    expect(passwordResetEmail).toBeTruthy();
    expect(passwordResetEmail?.envelope?.to).toContain(testEmail);
    expect(passwordResetEmail?.subject).toContain('Reset');
    
    // Step 8: Extract password reset URL from email using helper function
    const passwordResetUrl = extractPasswordResetLink(passwordResetEmail);
    expect(passwordResetUrl).toBeTruthy();
    
    if (passwordResetUrl) {
      console.log('🔗 Password reset URL found:', passwordResetUrl);
      
      // Step 9: Click the password reset link (automatically redirects to set new password page)
      await page.goto(passwordResetUrl);
      
      // Wait for the set new password page to load
      await page.waitForLoadState('networkidle', { timeout: timeoutSeconds * 1000 });
      
      // Verify we're on the set new password page
      await expect(page.locator('h1')).toContainText('Set New Password', { timeout: timeoutSeconds * 1000 });
      
      // Step 10: Fill out the new password form with specific form assertions
      await expect(page.locator(passwordResetSelectors.setPasswordForm)).toBeVisible();
      const passwordInput = page.locator(passwordResetSelectors.passwordInput);
      await expect(passwordInput).toBeVisible();
      await expect(passwordInput).toBeEnabled();
      
      await passwordInput.fill(newPassword);
      await expect(passwordInput).toHaveValue(newPassword);
      
      // Step 11: Submit the new password
      await expect(page.getByRole('button', { name: 'Set New Password' })).toBeEnabled();
      await page.click(passwordResetSelectors.setPasswordButton);
      
      // Step 12: Verify password reset completion
      // This might redirect to signin or show a success message
      await page.waitForLoadState('networkidle', { timeout: timeoutSeconds * 1000 });
      
      // Step 13: Test that we can sign in with the new password using signInUser utility
      await signInUser(page, testEmail, newPassword);
      
      console.log('✅ Password reset flow completed successfully');
    } else {
      console.warn('⚠️ No password reset URL was captured - skipping password reset completion test');
    }
  });
});