import { test, expect } from '@playwright/test';
import { sendEmail } from '../../lib/mail-utilities';

test.describe('Mailpit Integration', () => {
  test('should send email to Mailpit and retrieve via API', async () => {
    // Clear any existing emails first
    const clearResponse = await fetch('http://localhost:8025/api/v1/messages', {
      method: 'DELETE'
    });
    console.log('🧹 Cleared existing emails:', clearResponse.status);

    // Send a test email using the sendEmail function
    console.log('🧪 Test: About to call sendEmail');
    const testAddress = 'test@example.com';
    const testSubject = 'Test Email from E2E Test';
    const testText = 'This is a test email sent from the mailpit.spec.ts E2E test.';
    
    const result = await sendEmail({ data: {
      to: testAddress,
      from: testAddress,
      subject: testSubject,
      text: testText,
      html: '<p>This is a <strong>test email</strong> sent from the mailpit.spec.ts E2E test.</p>'
    }});
    console.log('🧪 Test: sendEmail returned:', result);

    // Wait a moment for email to be processed
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Retrieve emails from Mailpit API
    const messagesResponse = await fetch('http://localhost:8025/api/v1/messages');
    const messagesData = await messagesResponse.json();
    
    console.log('📧 Retrieved messages:', messagesData.total);
    
    // Verify we have at least one email
    expect(messagesData.total).toBeGreaterThan(0);
    
    // Get the first (most recent) email
    const firstMessage = messagesData.messages[0];
    console.log('📬 First message ID:', firstMessage.ID);
    console.log('📬 First message subject:', firstMessage.Subject);
    
    // Verify email details
    expect(firstMessage.Subject).toBe(testSubject);
    expect(firstMessage.To[0].Address).toBe(testAddress);
    expect(firstMessage.From.Address).toBe(testAddress);
    
    // Get full email content
    const emailResponse = await fetch(`http://localhost:8025/api/v1/message/${firstMessage.ID}`);
    const emailData = await emailResponse.json();
    
    console.log('📄 Email text content:', emailData.Text);
    expect(emailData.Text).toContain(testText);
    
    console.log('✅ Email sent successfully to Mailpit and retrieved via API');
  });
});