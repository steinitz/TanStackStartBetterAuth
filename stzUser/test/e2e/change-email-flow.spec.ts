import { test, expect } from '@playwright/test';
import { isEmailVerified } from './utils/user-verification';
import { createAuthenticatedUser } from './utils/testAuthUtils';
import { testConstants } from '~stzUser/test/constants';
import { EmailTester } from './utils/EmailTester';
import { waitForElementVisible } from './utils/testActions';
import { profileTestIds, profileStructuralSelectors } from '~stzUser/components/RouteComponents/Profile/Profile';
import { checkForEmailChangeConfirmationDialogText } from '~stzUser/components/RouteComponents/Profile/checkForEmailChangeConfirmationLinkDialog';

// 25 s — this flow spans user creation, profile nav, form fill, email
// send + delivery via Mailpit, verification link visit, and DB checks.
test.setTimeout(25000);

// Construct test selectors from component exports
const profileSelectors = {
  // Test ID-based selectors (constructed by test)
  profileForm: `[data-testid="${profileTestIds.profileForm}"]`,
  saveChangesButton: `[data-testid="${profileTestIds.saveChangesButton}"]`,

  // Structural selectors (used directly)
  ...profileStructuralSelectors
};

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
 * 1. Create authenticated user with credentials
 * 2. Navigate to profile and initiate email change
 * 3. Wait for email change processing
 * 4. Verify email change verification was sent ONLY to new address
 * 5. Extract verification link using helper function and simulate a click
 * 6. Confirm new email address is verified and old one is not
 */

test.describe('Change Email Flow', () => {

  test.beforeEach(async () => {
    // Clear any previous test emails
    EmailTester.clearSentEmails();
  });

  test('should successfully change and verify user email', async ({ page }) => {
    // Setup: Create authenticated user with password credentials
    const { email: originalEmailAddress } = await createAuthenticatedUser(page, {
      password: testConstants.defaultPassword
    });
    // Clear emails after user creation (createAuthenticatedUser sends none,
    // but clear for hygiene in case the helper changes in future)
    EmailTester.clearSentEmails();

    const newEmailAddress = `new-${originalEmailAddress}`;

    // Navigate to profile (already authenticated via cookies)
    await page.goto('/auth/profile');

    // Use robust waiting mechanisms for form elements
    const profileForm = page.locator(profileSelectors.profileForm);
    const emailInput = page.locator(profileSelectors.emailInput);
    const saveChangesButton = page.locator(profileSelectors.saveChangesButton);

    await waitForElementVisible(saveChangesButton, {
      errorMessage: 'Save changes button not visible after maximum attempts',
      maxAttempts: 5,
      baseWaitMs: 500
    });

    // Verify form state
    await expect(emailInput).toBeEnabled();
    await expect(emailInput).toHaveValue(originalEmailAddress);
    await expect(saveChangesButton).toBeEnabled();

    await emailInput.fill(newEmailAddress);

    await expect(emailInput).toHaveValue(newEmailAddress);

    // Button state assertions
    await expect(saveChangesButton).not.toBeDisabled();

    await saveChangesButton.click();

    // Wait for the confirmation dialog — the real signal that the email
    // change was processed and the verification email was sent.
    await expect(
      page.getByText(checkForEmailChangeConfirmationDialogText)
    ).toBeVisible({ timeout: 8000 });

    // Step 4: Verify email change verification was sent to both addresses
    const allSentEmails = await EmailTester.getSentEmails();

    // Find emails sent to the new email address
    const newEmailVerifications = allSentEmails.filter(email =>
      email.envelope.to.includes(newEmailAddress) &&
      email.subject.toLowerCase().includes('verify')
    );

    // Verify email change verification behavior
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

    // Step 6: Confirm new email address is verified and old one is not
    const isNewEmailVerified = await isEmailVerified(newEmailAddress);
    expect(isNewEmailVerified).toBe(true);

    const isOriginalEmailStillVerified = await isEmailVerified(originalEmailAddress);
    expect(isOriginalEmailStillVerified).toBe(false);
  });
});
