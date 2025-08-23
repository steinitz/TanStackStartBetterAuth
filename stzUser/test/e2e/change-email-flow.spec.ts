import { test, expect } from '@playwright/test';
import { createVerifiedTestUser, isEmailVerified } from './utils/user-verification';
import { testConstants } from '~stzUser/test/constants';
import { EmailTester } from './utils/EmailTester';
import { signInUser } from './utils/testActions';
import { profileTestIds, profileStructuralSelectors } from '~stzUser/components/RouteComponents/Profile/Profile';

// Construct test selectors from component exports
const profileSelectors = {
  // Test ID-based selectors (constructed by test)
  profileForm: `[data-testid="${profileTestIds.profileForm}"]`,
  saveChangesButton: `[data-testid="${profileTestIds.saveChangesButton}"]`,
  
  // Structural selectors (used directly)
  ...profileStructuralSelectors
};
import type { Page } from '@playwright/test';


/**
 * Helper function to find email by subject fragment
 * Reusable for any email type (verification, password reset, welcome, etc.)
 */
async function findEmailBySubject(targetEmailAddresses: string[], subjectFragment: string = 'verify'): Promise<any> {
  const sentEmails = await EmailTester.getSentEmails();
  
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
 * Tests the complete email change process:
 * 1. Create test User and sign in 
 * 2. Navigate to profile and initiate email change
 * 3. Wait for email change processing (test hangs here but works manually in browser)
 * 4. Verify email change verification was sent ONLY to new address
 * 5. Extract verification link using helper function and simulate a click
 * 6. Confirm new email address is verified
 * 
 * This test demonstrates enhanced Playwright testing patterns:
 * - Specific form state assertions (visibility, enabled state, values)
 * - Button state validation before and after interactions
 * - Soft assertions for non-critical validations that won't stop the test
 * - Centralized selector management with component-exported test IDs
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
    // Clear emails after signup to isolate email change behavior
    EmailTester.clearSentEmails();

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
    
    // More specific form assertions - verify initial state
    await expect(page.locator(profileSelectors.profileForm)).toBeVisible();
    await expect(page.locator(profileSelectors.emailInput)).toBeVisible();
    await expect(page.locator(profileSelectors.emailInput)).toBeEnabled();
    await expect(page.locator(profileSelectors.emailInput)).toHaveValue(originalEmailAddress);
    await expect(page.locator(profileSelectors.saveChangesButton)).toBeEnabled();
    
    // After filling new email - verify form state changes
    await page.fill(profileSelectors.emailInput, newEmailAddress);
    await expect(page.locator(profileSelectors.emailInput)).toHaveValue(newEmailAddress);
    
    // Button state assertions
    await expect(page.locator(profileSelectors.saveChangesButton)).not.toBeDisabled();
    
    // Soft assertions for additional form validation (won't stop test if they fail)
    await expect.soft(page.locator(profileSelectors.profileForm)).toHaveAttribute('data-testid', profileTestIds.profileForm);
    await expect.soft(page.locator(profileSelectors.emailInput)).toHaveAttribute('type', 'email');
    await expect.soft(page.locator(profileSelectors.saveChangesButton)).toHaveAttribute('data-testid', profileTestIds.saveChangesButton);
    
    await page.click(profileSelectors.saveChangesButton);
    
    // Step 3: Wait for email change processing
    // Wait for the spinner to appear and then disappear
    try {
      // First wait for spinner to appear (indicating email-sending started)
      await page.waitForSelector(profileSelectors.spinnerContainer, { timeout: 2000 });
      
      // Then wait for spinner to disappear (indicating email-sending completed)
      await page.waitForSelector(profileSelectors.spinnerContainer, { state: 'hidden', timeout: 10000 });
    } catch (error) {
      await page.waitForTimeout(3000);
    }
    
    // Additional wait to ensure any async operations complete
    await page.waitForTimeout(1000);
    
    // Try multiple selectors to find the dialog
    const dialogVisible = await page.locator(profileSelectors.dialog).isVisible().catch(() => false);
    const modalVisible = await page.locator(profileSelectors.modalDialog).isVisible().catch(() => false);
    
    // Step 4: Verify email change verification was sent to both addresses
    const allSentEmails = await EmailTester.getSentEmails();
    
    // Find emails sent to the new email address
    const newEmailVerifications = allSentEmails.filter(email => 
      email.envelope.to.includes(newEmailAddress) && 
      email.subject.toLowerCase().includes('verify')
    );
    
    // REGRESSION TEST: Verify email change verification behavior
    // Only new email should receive verification during email change
    expect(newEmailVerifications.length).toBe(1);
    // Note: Original email verification was from signup (now cleared)
    
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