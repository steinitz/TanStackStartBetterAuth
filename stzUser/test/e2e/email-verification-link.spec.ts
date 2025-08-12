import { test, expect } from '@playwright/test';
import { EmailTester } from './utils/EmailTester';
import { testConstants } from '~stzUser/test/constants';
import { getUserByEmail, isEmailVerified } from './utils/user-verification';

test.describe('Email Verification Link Extraction', () => {
  let testEmail: string;

  test.beforeEach(async () => {
    // Create a unique test email for this test
    testEmail = `test-${Date.now()}@example.com`;
    
    // Initialize EmailTester
    await EmailTester.createTestAccount();
    EmailTester.clearSentEmails();
  });

  test.afterEach(async () => {
    await EmailTester.cleanup();
  });

  test('should extract verification links from signup email', async ({ page }) => {
    // Navigate to signup page (assuming it exists)
    await page.goto('/auth/signup');

    // Fill out signup form with test email
    await page.fill('[name="email"]', testEmail);
    await page.fill('[name="password"]', 'TestPassword123!');
    await page.fill('[name="name"]', testConstants.defaultUserName);
    
    // Submit signup form
    await page.click('button[type="submit"]');
    
    // Wait for signup to complete and email to be sent
    await page.waitForTimeout(2000);
    
    // Verify user was created but not verified
    const user = await getUserByEmail(testEmail);
    expect(user).toBeTruthy();
    expect(user?.emailVerified).toBe(false);
    
    // Check that verification email was sent
    const sentEmails = EmailTester.getSentEmails();
    expect(sentEmails.length).toBeGreaterThan(0);
    
    // Find the verification email
    const verificationEmail = sentEmails.find(email => 
      email.envelope.to.includes(testEmail) && 
      email.subject.toLowerCase().includes('verify')
    );
    expect(verificationEmail).toBeTruthy();
    
    // Extract verification links
    const verificationLinks = EmailTester.extractVerificationLinks(verificationEmail!);
    expect(verificationLinks.length).toBeGreaterThan(0);
    
    console.log('📧 Verification email found:', {
      subject: verificationEmail?.subject,
      links: verificationLinks
    });
    
    console.log('🔗 Better Auth verification URL extracted:', verificationLinks[0]);
    
    // Get the first verification link
    const verificationLink = EmailTester.getFirstVerificationLink(testEmail);
    expect(verificationLink).toBeTruthy();
    
    console.log('🔗 Verification link extracted:', verificationLink);
    
    // Navigate to the verification link
    await page.goto(verificationLink!);
    
    // Wait for verification to complete
    await page.waitForTimeout(1000);
    
    // Verify the user is now verified
    const verifiedUser = await getUserByEmail(testEmail);
    expect(verifiedUser?.emailVerified).toBe(true);
    
    console.log('✅ Email verification completed successfully');
  });

  test('should handle multiple verification links in email', async () => {
    // Create a mock email with multiple links
    const mockEmail = await EmailTester.sendTestEmail({
      to: testEmail,
      from: 'noreply@example.com',
      subject: 'Verify Your Email Address',
      text: `
        Please verify your email by clicking one of these links:
        Primary: https://example.com/verify?token=abc123
        Backup: https://example.com/confirm?code=xyz789
        Support: https://example.com/help
      `,
      html: `
        <p>Please verify your email:</p>
        <a href="https://example.com/verify?token=abc123">Verify Email</a>
        <a href="https://example.com/confirm?code=xyz789">Confirm Account</a>
        <a href="https://example.com/help">Get Help</a>
      `
    });
    
    // Extract verification links
    const links = EmailTester.extractVerificationLinks(mockEmail);
    
    // Should find 2 verification links (verify and confirm), but not the help link
    expect(links).toHaveLength(2);
    expect(links).toContain('https://example.com/verify?token=abc123');
    expect(links).toContain('https://example.com/confirm?code=xyz789');
    expect(links).not.toContain('https://example.com/help');
    
    console.log('🔗 Multiple verification links extracted:', links);
  });

  test('should return empty array when no verification links found', async () => {
    // Create a mock email without verification links
    const mockEmail = await EmailTester.sendTestEmail({
      to: testEmail,
      from: 'noreply@example.com',
      subject: 'Welcome to Our Service',
      text: 'Welcome! Visit our website at https://example.com for more info.',
      html: '<p>Welcome! Visit <a href="https://example.com">our website</a></p>'
    });
    
    // Extract verification links
    const links = EmailTester.extractVerificationLinks(mockEmail);
    
    // Should find no verification links
    expect(links).toHaveLength(0);
    
    console.log('📧 No verification links found (as expected)');
  });
});