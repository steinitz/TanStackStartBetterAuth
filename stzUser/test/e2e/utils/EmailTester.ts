// Removed Nodemailer, fs, path, os imports - no longer needed for Mailpit
import { testConstants } from '~stzUser/test/constants';

// Mailpit message interface (simplified from Ethereal)
interface MailpitMessage {
  ID: string;
  MessageID: string;
  Subject: string;
  From: { Address: string; Name: string };
  To: Array<{ Address: string; Name: string }>;
  Text: string;
  HTML: string;
  Created: string;
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
  private static readonly MAILPIT_API_BASE = 'http://localhost:8025/api/v1';
  private static sentEmails: TestEmailMessage[] = [];







  /**
   * Converts Mailpit messages to TestEmailMessage format
   */
  private static convertMailpitMessages(mailpitMessages: MailpitMessage[]): TestEmailMessage[] {
    return mailpitMessages.map(msg => ({
      messageId: msg.MessageID,
      envelope: {
        from: msg.From.Address,
        to: msg.To.map(t => t.Address)
      },
      response: 'Message sent via Mailpit',
      subject: msg.Subject,
      text: msg.Text,
      html: msg.HTML,
      timestamp: msg.Created,
      previewUrl: `http://localhost:8025/view/${msg.ID}`
    }));
  }

  /**
   * Gets all emails from Mailpit
   */
  static async getSentEmails(): Promise<TestEmailMessage[]> {
    try {
      const response = await fetch(`${this.MAILPIT_API_BASE}/messages`);
      if (!response.ok) {
        throw new Error(`Failed to fetch emails: ${response.statusText}`);
      }
      const data = await response.json();
      return this.convertMailpitMessages(data.messages || []);
    } catch (error) {
      console.error('❌ Failed to get emails from Mailpit:', error);
      return [];
    }
  }

  /**
   * Gets the most recently sent email from Mailpit
   */
  static async getLastSentEmail(): Promise<TestEmailMessage | null> {
    const allEmails = await this.getSentEmails();
    return allEmails.length > 0 ? allEmails[allEmails.length - 1] : null;
  }

  /**
   * Finds emails by recipient from Mailpit
   */
  static async getEmailsTo(recipient: string): Promise<TestEmailMessage[]> {
    const allEmails = await this.getSentEmails();
    return allEmails.filter(email =>
      email.envelope.to.includes(recipient)
    );
  }

  /**
   * Finds emails by sender from Mailpit
   */
  static async getEmailsFrom(sender: string): Promise<TestEmailMessage[]> {
    const allEmails = await this.getSentEmails();
    return allEmails.filter(email =>
      email.envelope.from === sender
    );
  }

  /**
   * Clears all sent emails from Mailpit
   */
  static async clearSentEmails(): Promise<void> {
    try {
      const response = await fetch(`${this.MAILPIT_API_BASE}/messages`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        throw new Error(`Failed to clear emails: ${response.statusText}`);
      }
      this.sentEmails = [];
      console.log('🧹 Cleared all sent emails from Mailpit');
    } catch (error) {
      console.error('❌ Failed to clear emails from Mailpit:', error);
      throw error;
    }
  }

  /**
   * Gets the Mailpit web interface URL for viewing sent emails
   */
  static getWebInterfaceUrl(): string {
    return 'http://localhost:8025';
  }

  /**
   * Cleanup method to reset all test utilities
   */
  static async cleanup(): Promise<void> {
    await this.clearSentEmails();
    console.log('🧹 Email test utilities cleaned up');
  }

  /**
   * Verifies that an email matching the given criteria was sent
   * Uses Mailpit API to check emails
   */
  static async verifyEmailSent(criteria: {
    to?: string;
    from?: string;
    subject?: string;
    textContains?: string;
    htmlContains?: string;
  }): Promise<boolean> {
    const emails = await this.getSentEmails();
    return emails.some(email => {
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
  static extractVerificationLinks(email: TestEmailMessage, searchString?: string): string[] {
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
    
    // Filter URLs based on search string or default verification patterns
    const verificationLinks = links.filter(url => {
      if (searchString) {
        return url.includes(searchString);
      }
      // Default verification patterns
      return url.includes('verify') || 
        url.includes('confirm') || 
        url.includes('activate') ||
        url.includes('reset') ||
        url.includes('token=') ||
        url.includes('code=');
    });
    
    // Remove duplicates
    return [...new Set(verificationLinks)];
  }

  /**
   * Gets verification links from the most recent email to a specific recipient
   */
  static async getVerificationLinksForUser(email: string, searchString?: string): Promise<string[]> {
    const userEmails = await this.getEmailsTo(email);
    if (userEmails.length === 0) {
      return [];
    }
    
    const latestEmail = userEmails[userEmails.length - 1];
    return this.extractVerificationLinks(latestEmail, searchString);
  }

  /**
   * Gets the first verification link from the most recent email to a user
   */
  static async getFirstVerificationLink(email: string, searchString?: string): Promise<string | null> {
    const links = await this.getVerificationLinksForUser(email, searchString);
    return links.length > 0 ? links[0] : null;
  }
}

// // Helper function to create a mock email server function for testing
// export const createMockEmailServer = () => {
//   return {
//     async sendEmail(data: any) {
//       // Instead of using the production email server,
//       // use our Ethereal test utilities
//       const result = await EmailTester.sendTestEmail(data.data);
//       return result.envelope.to[0]; // Return first recipient to match production behavior
//     }
//   };
// };

// Export types for use in tests
/**
 * Creates a unique test user email using timestamp to prevent duplicate user issues
 * @returns A unique test email address
 */
export function newTestUser(): string {
  const timestamp = Date.now();
  return `test${timestamp}@${testConstants.defaultUserDomain}`;
}

/**
 * Creates a test user object with unique email
 * @param name Optional name for the test user
 * @returns Test user object with unique email
 */
export function createTestUser(name: string = testConstants.defaultUserName) {
  return {
    name,
    email: newTestUser(),
    password: 'TestPassword123!'
  };
}

export type { TestEmailMessage };

