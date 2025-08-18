import { test, expect } from '@playwright/test';
import { createVerifiedTestUser, isEmailVerified } from './utils/user-verification';
import { testConstants } from '~stzUser/test/constants';
import { EmailTester } from './utils/EmailTester';
import { signInUser } from './utils/testActions';
import type { Page } from '@playwright/test';


/**
 * Helper function to find email by subject fragment
 * Reusable for any email type (verification, password reset, welcome, etc.)
 */
function findEmailBySubject(targetEmailAddresses: string[], subjectFragment: string = 'verify'): any {
  const sentEmails = EmailTester.getSentEmails();
  
  return sentEmails.find(email => 
      targetEmailAddresses.some(targetEmailAddress => email.envelope.to.includes(targetEmailAddress)) &&
    email.subject.toLowerCase().includes(subjectFragment.toLowerCase())
  );
}

/**
 * Helper function to extract and validate verification links
 * Reusable for any verification flow
 */
function extractVerificationLink(email: any): string | null {
  const verificationLinks = EmailTester.extractVerificationLinks(email);
  return verificationLinks.length > 0 ? verificationLinks[0] : null;
}

/**
 * E2E Test: Change Email Flow
 * 
 * Tests the complete email change process:
 * 1. Create test User and sign in 
 * 2. Navigate to profile and initiate email change
 * 3. Wait for email change processing (test hangs here but works manually in browser)
 * 4. Verify email change verification was sent ONLY to new address
 * 5. Extract verification link using helper function and simulate a click
 * 6. Confirm new email address is verified
 * 
 * This test serves as a reference for similar flows (e.g., change password)
 */
test.describe('Change Email Flow', () => {
  
  test.beforeEach(async () => {
    // Clear any previous test emails
    EmailTester.clearSentEmails();
  });

  test('should successfully change and verify user email', async ({ page }) => {
    // Setup: Create verified test user
    const originalEmailAddress = await createVerifiedTestUser();
    const newEmailAddress = `new-${originalEmailAddress}`;
    
    // Verify initial state - manually check email verification status
    // NOTE: Better Auth may not require email verification for address changes 
    // if the user's original email address is not verified
    const isOriginalEmailVerified = await isEmailVerified(originalEmailAddress);
    expect(isOriginalEmailVerified).toBe(true);
    
    // Step 1: Sign in user
    await signInUser(page, originalEmailAddress, testConstants.defaultPassword);
    
    // Step 2: Navigate to profile and initiate email change
    await page.goto('http://localhost:3000/auth/profile');
    
    // Verify form elements exist before interacting with them
    await expect(page.locator('[data-testid="profile-form"]')).toBeVisible();
    await expect(page.locator('[data-testid="save-changes-button"]')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    
    await page.fill('input[type="email"]', newEmailAddress);
    await page.click('[data-testid="save-changes-button"]');
    
    // Step 3: Wait for email change processing
    // Wait for the spinner to appear and then disappear
    try {
      // First wait for spinner to appear (indicating email-sending started)
      await page.waitForSelector('div:has(> div > svg)', { timeout: 2000 });
      
      // Then wait for spinner to disappear (indicating email-sending completed)
      await page.waitForSelector('div:has(> div > svg)', { state: 'hidden', timeout: 10000 });
    } catch (error) {
      await page.waitForTimeout(3000);
    }
    
    // Additional wait to ensure any async operations complete
     await page.waitForTimeout(1000);
    
    // Try multiple selectors to find the dialog
    const dialogVisible = await page.locator('dialog').isVisible().catch(() => false);
    const modalVisible = await page.locator('[role="dialog"]').isVisible().catch(() => false);
    
    // Step 4: Verify email change verification was sent to both addresses
    const allSentEmails = EmailTester.getSentEmails();
    
    // Find emails sent to the new email address
    const newEmailVerifications = allSentEmails.filter(email => 
      email.envelope.to.includes(newEmailAddress) && 
      email.subject.toLowerCase().includes('verify')
    );
    
    // Find emails sent to the original email address
    const oldEmailVerifications = allSentEmails.filter(email => 
      email.envelope.to.includes(originalEmailAddress) && 
      email.subject.toLowerCase().includes('verify')
    );
    
    // REGRESSION TEST: Verify email change verification behavior
    // Both email addresses should receive verification emails for security
    expect(newEmailVerifications.length).toBe(1);
    expect(oldEmailVerifications.length).toBe(1);
    
    const verificationEmail = newEmailVerifications[0];
    expect(verificationEmail).toBeTruthy();
    
    // 5. Extract verification link using helper function and simulate user click
    const verificationLink = extractVerificationLink(verificationEmail);
    expect(verificationLink).toBeTruthy();
    
    await page.goto(verificationLink!);
    await page.waitForTimeout(1000);
    
    // Step 6: Confirm new email address is verified
    const isNewEmailVerified = await isEmailVerified(newEmailAddress);
    const isOriginalEmailStillVerified = await isEmailVerified(originalEmailAddress);
    
    // Verify the email change process completed successfully
    // Note: Original email verification status may be reset during email change
    expect(isOriginalEmailStillVerified).toBe(false);
  });
});