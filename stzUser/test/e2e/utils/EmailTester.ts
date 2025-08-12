import type {Transporter} from 'nodemailer';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Ethereal Email test account interface
interface EtherealTestAccount {
  user: string;
  pass: string;
  smtp: {
    host: string;
    port: number;
    secure: boolean;
  };
  imap: {
    host: string;
    port: number;
    secure: boolean;
  };
  pop3: {
    host: string;
    port: number;
    secure: boolean;
  };
  web: string;
}

// Email message interface for testing
interface TestEmailMessage {
  messageId: string;
  envelope: {
    from: string;
    to: string[];
  };
  response: string;
  previewUrl?: string;
  // Store the actual email content for URL extraction
  subject: string;
  text: string;
  html?: string;
}

/**
 * EmailTester - Ethereal Email testing utility class
 * 
 * PURPOSE:
 * Provides email testing for E2E tests without sending real emails.
 * Uses Ethereal Email (fake SMTP service) to capture and inspect emails.
 * 
 * PRACTICAL USAGE EXAMPLE:
 * ```typescript
 * // In your E2E test:
 * test('contact form sends email', async ({ page }) => {
 *   // 1. Create test account (once per test session)
 *   await EmailTester.createTestAccount();
 *   
 *   // 2. Fill and submit contact form
 *   await page.fill('[name="email"]', 'user@example.com');
 *   await page.fill('[name="message"]', 'Test message');
 *   await page.click('button[type="submit"]');
 *   
 *   // 3. Verify email was "sent" (captured by Ethereal)
 *   const emails = EmailTester.getSentEmails();
 *   expect(emails).toHaveLength(1);
 *   expect(emails[0].envelope.to).toContain('support@yourapp.com');
 *   
 *   // 4. Optional: View email in browser
 *   console.log('View email:', emails[0].previewUrl);
 * });
 * ```
 * 
 * SERVER-TEST INTEGRATION (Cross-Process Storage):
 * EmailTester uses static methods with file-based storage, enabling both
 * your server code and test assertions to access the same email data across
 * separate JavaScript processes. During testing:
 * 
 * 1. Server-side: Replace your production email transport with EmailTester.sendTestEmail()
 * 2. Test-side: Use EmailTester.getSentEmails() to verify emails were sent
 * 3. Both share email data through temporary file storage for cross-process access
 * 
 * Example server integration:
 * ```typescript
 * // In your email service:
 * if (process.env.NODE_ENV === 'test') {
 *   await EmailTester.sendTestEmail(emailData);
 * } else {
 *   await productionTransporter.sendMail(emailData);
 * }
 * ```
 * 
 * EMAIL DATABASE FEATURE:
 * The class maintains a "database" of sent emails (getSentEmails, getEmailsTo, etc.)
 * This is designed for future theoretical needs where tests might need to verify
 * multiple emails or complex email workflows. For most current testing scenarios,
 * simply checking that an email was sent is sufficient.
 */
export class EmailTester {
  private static testAccount: EtherealTestAccount | null = null;
  private static transporter: Transporter | null = null;
  private static sentEmails: TestEmailMessage[] = [];
  private static emailsFilePath: string = path.join(os.tmpdir(), 'playwright-test-emails.json');

  /**
   * Reads emails from the shared file system
   */
  private static readEmailsFromFile(): TestEmailMessage[] {
    try {
      if (fs.existsSync(this.emailsFilePath)) {
        const data = fs.readFileSync(this.emailsFilePath, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.warn('Failed to read emails from file:', error);
    }
    return [];
  }

  /**
   * Writes emails to the shared file system
   */
  private static writeEmailsToFile(emails: TestEmailMessage[]): void {
    try {
      fs.writeFileSync(this.emailsFilePath, JSON.stringify(emails, null, 2));
    } catch (error) {
      console.error('Failed to write emails to file:', error);
    }
  }

  /**
   * Creates a temporary Ethereal Email test account
   * This account is valid for testing and provides a web interface to view emails
   */
  static async createTestAccount(): Promise<EtherealTestAccount> {
    if (this.testAccount) {
      return this.testAccount;
    }

    try {
      // Create a test account using Nodemailer's built-in Ethereal integration
      this.testAccount = await nodemailer.createTestAccount();
      console.log('✅ Ethereal test account created:', {
        user: this.testAccount.user,
        webInterface: this.testAccount.web
      });
      return this.testAccount;
    } catch (error) {
      console.error('❌ Failed to create Ethereal test account:', error);
      throw new Error('Could not create test email account');
    }
  }

  /**
   * Gets the current test account
   */
  static getTestAccount(): EtherealTestAccount | null {
    return this.testAccount;
  }

  /**
   * Creates a Nodemailer transporter configured for Ethereal Email testing
   */
  static async createTestTransport(): Promise<Transporter> {
    if (this.transporter) {
      return this.transporter;
    }

    const testAccount = await this.createTestAccount();

    this.transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    console.log('✅ Ethereal test transporter created');
    return this.transporter;
  }

  /**
   * Sends a test email and captures it for verification
   * Returns the message info including preview URL
   */
  static async sendTestEmail(emailData: {
    to: string;
    from: string;
    subject: string;
    text: string;
    html?: string;
  }): Promise<TestEmailMessage> {
    const transporter = await this.createTestTransport();

    try {
      const info = await transporter.sendMail(emailData);

      const testMessage: TestEmailMessage = {
        messageId: info.messageId,
        envelope: info.envelope,
        response: info.response,
        previewUrl: nodemailer.getTestMessageUrl(info) || undefined,
        // Store the email content for URL extraction
        subject: emailData.subject,
        text: emailData.text,
        html: emailData.html,
      };

      // Store in memory for backward compatibility
      this.sentEmails.push(testMessage);
      
      // Also store in file system for cross-process access
      const allEmails = this.readEmailsFromFile();
      allEmails.push(testMessage);
      this.writeEmailsToFile(allEmails);

      console.log('✅ Test email sent:', {
        messageId: testMessage.messageId,
        to: emailData.to,
        subject: emailData.subject,
        previewUrl: testMessage.previewUrl
      });

      return testMessage;
    } catch (error) {
      console.error('❌ Failed to send test email:', error);
      throw new Error('Could not send test email');
    }
  }

  /**
   * Gets all emails sent during the current test session
   * Reads from file system to support cross-process access
   */
  static getSentEmails(): TestEmailMessage[] {
    const fileEmails = this.readEmailsFromFile();
    // Merge with in-memory emails for backward compatibility
    const allEmails = [...this.sentEmails, ...fileEmails];
    // Remove duplicates based on messageId
    const uniqueEmails = allEmails.filter((email, index, arr) => 
      arr.findIndex(e => e.messageId === email.messageId) === index
    );
    return uniqueEmails;
  }

  /**
   * Gets the most recently sent email
   * Uses file system to support cross-process access
   */
  static getLastSentEmail(): TestEmailMessage | null {
    const allEmails = this.getSentEmails();
    return allEmails.length > 0 ? allEmails[allEmails.length - 1] : null;
  }

  /**
   * Finds emails by recipient
   * Uses file system to support cross-process access
   */
  static getEmailsTo(recipient: string): TestEmailMessage[] {
    return this.getSentEmails().filter(email =>
      email.envelope.to.includes(recipient)
    );
  }

  /**
   * Finds emails by sender
   * Uses file system to support cross-process access
   */
  static getEmailsFrom(sender: string): TestEmailMessage[] {
    return this.getSentEmails().filter(email =>
      email.envelope.from === sender
    );
  }

  /**
   * Clears the sent emails cache (useful between tests)
   * Clears both memory and file system storage
   */
  static clearSentEmails(): void {
    this.sentEmails = [];
    this.writeEmailsToFile([]);
    console.log('🧹 Cleared sent emails cache (memory and file)');
  }

  /**
   * Gets the Ethereal web interface URL for viewing emails
   */
  static getWebInterfaceUrl(): string | null {
    return this.testAccount?.web || null;
  }

  /**
   * Cleanup method to reset all test utilities
   */
  static async cleanup(): Promise<void> {
    this.clearSentEmails();
    if (this.transporter) {
      this.transporter.close();
      this.transporter = null;
    }
    this.testAccount = null;
    console.log('🧹 Email test utilities cleaned up');
  }

  /**
   * Verifies that an email matching the given criteria was sent
   * Uses file system to support cross-process access
   */
  static verifyEmailSent(criteria: {
    to?: string;
    from?: string;
    subject?: string;
    textContains?: string;
    htmlContains?: string;
  }): boolean {
    return this.getSentEmails().some(email => {
      if (criteria.to && !email.envelope.to.includes(criteria.to)) return false;
      if (criteria.from && email.envelope.from !== criteria.from) return false;
      if (criteria.subject && !email.subject.includes(criteria.subject)) return false;
      if (criteria.textContains && !email.text.includes(criteria.textContains)) return false;
      if (criteria.htmlContains && email.html && !email.html.includes(criteria.htmlContains)) return false;
      return true;
    });
  }

  /**
   * Extracts verification links from an email
   * Looks for URLs containing common verification patterns
   */
  static extractVerificationLinks(email: TestEmailMessage): string[] {
    const links: string[] = [];
    const urlRegex = /https?:\/\/[^\s<>"]+/g;
    
    // Extract from text content
    const textUrls = email.text.match(urlRegex) || [];
    links.push(...textUrls);
    
    // Extract from HTML content if available
    if (email.html) {
      const htmlUrls = email.html.match(urlRegex) || [];
      links.push(...htmlUrls);
    }
    
    // Filter for verification-like URLs
    const verificationLinks = links.filter(url => 
      url.includes('verify') || 
      url.includes('confirm') || 
      url.includes('activate') ||
      url.includes('token=') ||
      url.includes('code=')
    );
    
    // Remove duplicates
    return [...new Set(verificationLinks)];
  }

  /**
   * Gets verification links from the most recent email to a specific recipient
   */
  static getVerificationLinksForUser(email: string): string[] {
    const userEmails = this.getEmailsTo(email);
    if (userEmails.length === 0) {
      return [];
    }
    
    const latestEmail = userEmails[userEmails.length - 1];
    return this.extractVerificationLinks(latestEmail);
  }

  /**
   * Gets the first verification link from the most recent email to a user
   */
  static getFirstVerificationLink(email: string): string | null {
    const links = this.getVerificationLinksForUser(email);
    return links.length > 0 ? links[0] : null;
  }
}

// Helper function to create a mock email server function for testing
export const createMockEmailServer = () => {
  return {
    async sendEmail(data: any) {
      // Instead of using the production email server,
      // use our Ethereal test utilities
      const result = await EmailTester.sendTestEmail(data.data);
      return result.envelope.to[0]; // Return first recipient to match production behavior
    }
  };
};

// Export types for use in tests
/**
 * Creates a unique test user email using timestamp to prevent duplicate user issues
 * @returns A unique test email address
 */
export function newTestUser(): string {
  const timestamp = Date.now();
  return `test${timestamp}@ethereal.email`;
}

/**
 * Creates a test user object with unique email
 * @param name Optional name for the test user
 * @returns Test user object with unique email
 */
export function createTestUser(name: string = 'Test User') {
  return {
    name,
    email: newTestUser(),
    password: 'TestPassword123!'
  };
}

export type { EtherealTestAccount, TestEmailMessage };

