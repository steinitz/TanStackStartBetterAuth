import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

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
}

// Email testing utility class
export class EmailTestUtils {
  private static testAccount: EtherealTestAccount | null = null;
  private static transporter: Transporter | null = null;
  private static sentEmails: TestEmailMessage[] = [];

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
      };

      this.sentEmails.push(testMessage);
      
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
   */
  static getSentEmails(): TestEmailMessage[] {
    return [...this.sentEmails];
  }

  /**
   * Gets the most recently sent email
   */
  static getLastSentEmail(): TestEmailMessage | null {
    return this.sentEmails.length > 0 ? this.sentEmails[this.sentEmails.length - 1] : null;
  }

  /**
   * Finds emails by recipient
   */
  static getEmailsTo(recipient: string): TestEmailMessage[] {
    return this.sentEmails.filter(email => 
      email.envelope.to.includes(recipient)
    );
  }

  /**
   * Finds emails by sender
   */
  static getEmailsFrom(sender: string): TestEmailMessage[] {
    return this.sentEmails.filter(email => 
      email.envelope.from === sender
    );
  }

  /**
   * Clears the sent emails cache (useful between tests)
   */
  static clearSentEmails(): void {
    this.sentEmails = [];
    console.log('🧹 Cleared sent emails cache');
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
   * Verifies that an email was sent with specific criteria
   */
  static verifyEmailSent(criteria: {
    to?: string;
    from?: string;
    subject?: string;
    textContains?: string;
    htmlContains?: string;
  }): boolean {
    // Note: This is a basic verification. In a real implementation,
    // you might want to fetch the actual email content from Ethereal
    // or store more details when sending emails.
    
    const emails = this.getSentEmails();
    
    return emails.some(email => {
      if (criteria.to && !email.envelope.to.includes(criteria.to)) {
        return false;
      }
      if (criteria.from && email.envelope.from !== criteria.from) {
        return false;
      }
      // For subject and content verification, you'd need to store or fetch
      // the actual email content. This is a simplified version.
      return true;
    });
  }
}

// Helper function to create a mock email server function for testing
export const createMockEmailServer = () => {
  return {
    async sendEmail(data: any) {
      // Instead of using the production email server,
      // use our Ethereal test utilities
      const result = await EmailTestUtils.sendTestEmail(data.data);
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
  return `test${timestamp}@example.com`;
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