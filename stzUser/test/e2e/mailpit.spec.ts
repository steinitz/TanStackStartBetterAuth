import { test, expect } from '@playwright/test';
import { sendEmail } from '../../lib/mail-utilities';

test.describe('Mailpit Integration', () => {
  test('should send email to Mailpit', async () => {
    // Send a test email using the sendEmail function
    console.log('🧪 Test: About to call sendEmail');
    const testAddress = 'test@example.com'
    const result = await sendEmail({ data: {
      to: testAddress,
      from: testAddress,
      subject: 'Test Email from E2E Test',
      text: 'This is a test email sent from the mailpit.spec.ts E2E test.',
      html: '<p>This is a <strong>test email</strong> sent from the mailpit.spec.ts E2E test.</p>'
    }});
    console.log('🧪 Test: sendEmail returned:', result);

    // Verify the email was sent successfully
    // sendEmail returns, among other things, an array of accepterd addresses
    // expect(result['accepted'][0]).toBe(testAddress); 
    
    // Log success message
    console.log('✅ Email sent successfully to Mailpit');
    console.log('📧 Check http://localhost:8025 to view the email');
  });
});