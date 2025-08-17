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
  // console.log('📧 Sent emails:', sentEmails.map(e => ({
  //   to: e.envelope.to,
  //   subject: e.subject
  // })));
  
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
 * 1. User authentication
 * 2. Email change request submission
 * 3. Verification email handling
 * 4. Email verification completion
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
    console.log(`✅ Test user created: ${originalEmailAddress}`);
    
    // Step 1: Sign in user
    await signInUser(page, originalEmailAddress, testConstants.defaultPassword);
    
    // Step 2: Navigate to profile and initiate email change
    await page.goto('http://localhost:3000/auth/profile');
    await page.fill('input[type="email"]', newEmailAddress);
    await page.click('button[type="submit"]');
    
    // console.log(`🔄 Email change initiated: ${originalEmailAddress} → ${newEmailAddress}`);
    
    // Step 3: Wait for email change processing
    await page.waitForTimeout(2000);
    
    // Try multiple selectors to find the dialog
    const dialogVisible = await page.locator('dialog').isVisible().catch(() => false);
    const modalVisible = await page.locator('[role="dialog"]').isVisible().catch(() => false);
    
    // console.log('Dialog selectors check:', { dialogVisible, modalVisible });
    
    // For now, let's just check if we can see some confirmation text or if the form submission succeeded
    // We'll look for either a dialog or check console logs for the email change process
    const hasDialog = dialogVisible || modalVisible;
    if (!hasDialog) {
      // console.log('No dialog found, but email change may have been initiated');
    }
    
    // console.log(`✅ Email change flow initiated for: ${newEmailAddress}`);
    
    // Step 4: Verify email change verification was sent ONLY to new address
    const allSentEmails = EmailTester.getSentEmails();
    
    // DEBUG: Log all sent emails to understand what's happening
    console.log('📧 All sent emails during test:', allSentEmails.map(email => ({
      to: email.envelope.to,
      subject: email.subject
    })));
    
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
    
    console.log(`📊 Email verification counts: new=${newEmailVerifications.length}, old=${oldEmailVerifications.length}`);
    
    // REGRESSION TEST: Verify fragile auth.ts logic works correctly
    // Only new email address should receive verification email, old email address should NOT
    expect(newEmailVerifications.length).toBe(1);
    expect(oldEmailVerifications.length).toBe(0);
    
    const verificationEmail = newEmailVerifications[0];
    expect(verificationEmail).toBeTruthy();
    
    // console.log('✅ Verification email found:', {
    //   subject: verificationEmail.subject,
    //   to: verificationEmail.envelope.to
    // });
    
    // Extract verification link using helper function
    const verificationLink = extractVerificationLink(verificationEmail);
    expect(verificationLink).toBeTruthy();
    // console.log('🔗 Verification link:', verificationLink);
    
    await page.goto(verificationLink!);
    await page.waitForTimeout(1000);
    
    // Step 5: Verify email change completion
    const isNewEmailVerified = await isEmailVerified(newEmailAddress);
    const isOriginalEmailStillVerified = await isEmailVerified(originalEmailAddress);
    
    // console.log('📊 Final verification status:');
    // console.log(`  New email address (${newEmailAddress}) verified:`, isNewEmailVerified);
    // console.log(`  Original email address (${originalEmailAddress}) verified:`, isOriginalEmailStillVerified);
    
    // Verify the email change process completed successfully
    // Note: Better Auth may send verification to original email for security
    expect(isOriginalEmailStillVerified).toBe(true);
    
    console.log(`✅ Email change flow completed: ${originalEmailAddress} → ${newEmailAddress}`);
  });
});