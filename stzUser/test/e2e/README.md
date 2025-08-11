# E2E Testing Documentation

This directory contains comprehensive end-to-end testing utilities and documentation for the application, including specialized email testing with **Ethereal Email** - a fake SMTP service perfect for testing email functionality without sending real emails.

## Test Files Overview

- **`signup-flow.spec.ts`** - Tests the complete user signup flow with form validation and success confirmation
- **`contact-form-shows-email-success.spec.ts`** - Tests contact form submission and email functionality
- **`smoke.spec.ts`** - Basic smoke tests for core application functionality

## Email Testing with Ethereal Email

## What is Ethereal Email?

Ethereal Email is a fake SMTP service that:
- **Captures emails** instead of delivering them
- **Provides a web interface** to view captured emails
- **Works seamlessly with Nodemailer** (which you already use)
- **Creates temporary test accounts** automatically
- **Is completely free** and requires no signup
- **Keeps your production email code untouched**

## How It Works

### 1. Automatic Test Account Creation
```typescript
// Creates a temporary Ethereal account automatically
const testAccount = await EmailTester.createTestAccount();
// Returns: { user: 'test123@ethereal.email', pass: 'abc123', smtp: {...}, web: 'https://ethereal.email/...' }
```

### 2. Test Email Sending
```typescript
// Sends email to Ethereal instead of real recipients
const result = await EmailTester.sendTestEmail({
  to: 'user@example.com',
  from: 'noreply@yourapp.com',
  subject: 'Test Email',
  text: 'This is a test',
  html: '<p>This is a test</p>'
});
// Returns: { messageId, envelope, previewUrl }
```

### 3. Web Interface Viewing
Each test run provides a unique URL where you can view all captured emails in a Gmail-like interface:
```
📧 View emails at: https://ethereal.email/messages/abc123def456
📧 Email preview URL: https://ethereal.email/message/xyz789
```

## Files Overview

### `utils/EmailTester.ts`
Core utilities for Ethereal Email testing:
- **`EmailTester.createTestAccount()`** - Creates temporary Ethereal account
- **`EmailTester.sendTestEmail()`** - Sends emails to Ethereal for testing
- **`EmailTester.getSentEmails()`** - Retrieves all sent emails in current session
- **`EmailTester.verifyEmailSent()`** - Verifies emails were sent with specific criteria
- **`EmailTester.cleanup()`** - Cleans up test session

### `utils/user-verification.ts`
User verification and database utilities for E2E testing:

**Functions:**
- **`findUserByEmail(email: string)`**: Locates user records in the test database
- **`isUserVerified(email: string)`**: Checks if a user's email is verified
- **`verifyUserEmail(email: string)`**: Marks a user's email as verified in the database
- **`getUserVerificationStatus(email: string)`**: Returns detailed verification status

**Database Integration:**
- **SQLite Connection**: Direct database access for test data manipulation using better-sqlite3
- **Environment Awareness**: Uses `isPlaywrightRunning()` to ensure test-only execution
- **Transaction Safety**: Proper database transaction handling
- **Test Isolation**: Safe operations that don't affect production data
- **Error Handling**: Comprehensive error management for database operations

**Use Cases:**
- **Email Verification Testing**: Simulate email verification workflows in signup tests
- **User State Management**: Set up specific user states for authentication testing
- **Test Data Preparation**: Create verified users for authentication flow tests
- **Debugging Support**: Inspect user verification states during test development
- **Signup Flow Testing**: Complete end-to-end user registration and verification testing

**Usage Example:**
```typescript
// In E2E tests - verify user email is not verified after signup
const emailVerified = await isUserVerified('user@example.com');
expect(emailVerified).toBe(false);

// Get complete user data for verification
const user = await findUserByEmail('user@example.com');
expect(user?.emailVerified).toBe(false);

// Simulate email verification for testing
await verifyUserEmail('user@example.com');
const verificationStatus = await getUserVerificationStatus('user@example.com');
expect(verificationStatus.verified).toBe(true);
```

### `contact-form-email.spec.ts`
Comprehensive E2E tests for contact form email functionality:
- **Email sending verification** - Confirms emails are sent when form is submitted
- **Content validation** - Verifies email contains user's name, email, and message
- **Error handling** - Tests graceful failure when email service is unavailable
- **Form validation** - Ensures invalid forms don't trigger emails

## Running Email Tests

### Prerequisites
```bash
# Ensure your development server is running
pnpm dev
```

### Run Email Tests
```bash
# Run all E2E tests (including email tests)
pnpm test:e2e

# Run only email tests
pnpm test:e2e -- contact-form-email.spec.ts

# Run with UI to see browser interactions
pnpm test:e2e:ui -- contact-form-email.spec.ts
```

### Test Output
When tests run, you'll see output like:
```
✅ Ethereal test account created: { user: 'test123@ethereal.email', webInterface: 'https://ethereal.email/...' }
🚀 Ethereal test account ready for email testing
📧 View emails at: https://ethereal.email/messages/abc123def456
✅ Test email sent: { messageId: '<abc@ethereal.email>', to: 'support@yourapp.com', subject: 'Contact form for Your Company', previewUrl: 'https://ethereal.email/message/xyz789' }
📧 Email preview URL: https://ethereal.email/message/xyz789
✅ Contact form email test completed successfully
```

## Key Benefits

### 🔒 **Production Safety**
- **Zero impact** on your production email setup
- **No real emails sent** during testing
- **No configuration changes** needed in your app

### 🚀 **Easy Integration**
- **Works with existing Nodemailer code** - no changes needed
- **Automatic test account creation** - no manual setup
- **Drop-in replacement** for production email sending

### 🔍 **Comprehensive Verification**
- **Visual email inspection** via web interface
- **Programmatic verification** of email content and recipients
- **Email capture and analysis** for automated testing

### 🧪 **Perfect for Testing**
- **Isolated test environment** - each test run gets fresh account
- **Deterministic results** - no external email service dependencies
- **Fast execution** - no real SMTP delays

## Understanding the Test Flow

### 1. Test Setup
```typescript
test.beforeAll(async () => {
  // Creates temporary Ethereal account for this test session
  await EmailTester.createTestAccount();
});
```

### 2. Request Interception
```typescript
// Intercepts your app's email sending requests
await page.route('**/api/**', async (route) => {
  if (request.url().includes('sendEmail')) {
    // Redirects to Ethereal instead of production SMTP
    const emailResult = await EmailTester.sendTestEmail(postData.data);
    await route.fulfill({ status: 200, body: JSON.stringify(result) });
  }
});
```

### 3. Form Interaction
```typescript
// Normal user interactions - no changes needed
await page.fill('input[name="email"]', 'user@example.com');
await page.fill('textarea[name="message"]', 'Test message');
await page.click('button[type="submit"]');
```

### 4. Email Verification
```typescript
// Verify email was captured by Ethereal
const sentEmails = EmailTester.getSentEmails();
expect(sentEmails).toHaveLength(1);
expect(sentEmails[0].envelope.to).toContain('support@yourapp.com');
```

### 5. Manual Inspection (Optional)
```typescript
// Get URL to view email in browser
const previewUrl = sentEmails[0].previewUrl;
console.log('📧 View email at:', previewUrl);
```

## Advanced Usage

### Testing Multiple Email Scenarios
```typescript
// Test different email types
test('should send welcome email', async () => {
  // Test signup email
});

test('should send password reset email', async () => {
  // Test password reset email
});

test('should send contact form email', async () => {
  // Test contact form email
});
```

### Email Content Verification
```typescript
// Verify specific email content
const emails = EmailTester.getEmailsTo('user@example.com');
expect(emails[0].previewUrl).toBeTruthy();

// You can also store email content during interception
let capturedEmailContent;
await page.route('**/sendEmail', async (route) => {
  capturedEmailContent = route.request().postDataJSON();
  // ... send to Ethereal
});

// Then verify content
expect(capturedEmailContent.subject).toContain('Welcome');
expect(capturedEmailContent.html).toContain('<h1>Welcome!</h1>');
```

### Error Scenario Testing
```typescript
// Test email service failures
await page.route('**/sendEmail', async (route) => {
  await route.fulfill({ status: 500, body: 'Email service down' });
});

// Verify app handles email failures gracefully
expect(EmailTestUtils.getSentEmails()).toHaveLength(0);
```

## Troubleshooting

### Common Issues

**"Error: connect ECONNREFUSED"**
- The development server isn't running with proper test environment
- Ensure `.env.test` file exists with `PLAYWRIGHT_RUNNING=true`
- Start server manually with `pnpx dotenv-cli -e .env.test -- pnpm dev`
- Check server environment with `checkServerTestEnvironment()`

**"Server running without test environment"**
- Tests detected a server without `PLAYWRIGHT_RUNNING=true`
- Stop existing server and restart with `.env.test`: `pnpx dotenv-cli -e .env.test -- pnpm dev`
- Verify `.env.test` file contains required environment variables

**"Could not create test email account"**
- Check internet connection
- Ethereal service might be temporarily unavailable
- Try running tests again

**"Email not captured"**
- Verify route interception is working
- Check that the intercepted URL matches your email endpoint
- Ensure `EmailTestUtils.sendTestEmail()` is called in the route handler

**"Preview URL not working"**
- Ethereal URLs expire after some time
- Generate fresh test account for new test sessions
- Check console output for correct URLs

**"Environment variable issues"**
- Verify `.env.test` file exists in project root
- Check `isPlaywrightRunning()` returns `true` during tests
- Ensure `dotenv-cli` is installed: `pnpm add -D dotenv-cli`

### Debug Tips

```typescript
// Add debug logging
test('debug email flow', async ({ page }) => {
  // Log all network requests
  page.on('request', request => {
    console.log('Request:', request.method(), request.url());
  });
  
  // Log email test utilities state
  console.log('Sent emails:', EmailTestUtils.getSentEmails());
  console.log('Web interface:', EmailTestUtils.getWebInterfaceUrl());
});
```

## Server Management

The E2E tests use robust server management with environment variable validation to ensure proper test execution:

### How It Works
- **Environment Validation**: Verifies servers are running with `.env.test` environment variables
- **Smart Detection**: Checks if a test-configured server is already running on `http://localhost:3000`
- **Automatic Startup**: Starts server with `pnpx dotenv-cli -e .env.test -- pnpm dev` if needed
- **Environment Enforcement**: Prevents tests from running against misconfigured servers
- **Clean Shutdown**: Only stops servers it started, preserving manual dev servers

### Environment Variable System
Tests require a dedicated `.env.test` file with `PLAYWRIGHT_RUNNING=true`:

```bash
# .env.test
PLAYWRIGHT_RUNNING=true
# ... other test-specific environment variables
```

### Server Utilities
Server management is handled by `utils/server-check.ts`:
- **`ensureServerRunning()`** - Starts server with `.env.test` if needed
- **`checkServerTestEnvironment()`** - Validates running servers use test environment
- **`isPlaywrightRunning()`** - Simple detection: `process.env.PLAYWRIGHT_RUNNING === 'true'`

### Benefits
- **Test Environment Isolation**: Guarantees proper test configuration
- **Environment Variable Propagation**: Reliable loading of `.env.test` variables
- **Development Friendly**: Reuses compatible servers, starts new ones when needed
- **CI Optimized**: Always starts fresh servers with test environment
- **Error Prevention**: Blocks tests from running against wrong environment

## Integration with CI/CD

Ethereal Email works perfectly in CI environments:
- **No external dependencies** - works offline
- **No API keys required** - completely free
- **Deterministic results** - same behavior every time
- **Fast execution** - no real email delays

```yaml
# GitHub Actions example
- name: Run E2E Email Tests
  run: |
    pnpm dev &
    sleep 5
    pnpm test:e2e -- contact-form-email.spec.ts
```

## Next Steps

### Extend Email Testing
1. **Add more email scenarios** - signup, password reset, notifications
2. **Test email templates** - verify HTML rendering and styling
3. **Test email attachments** - if your app sends files
4. **Test email scheduling** - if you have delayed email sending

### Integration Ideas
1. **Screenshot email previews** - capture email appearance for visual regression testing
2. **Email performance testing** - measure email sending speed
3. **Email accessibility testing** - verify emails work with screen readers
4. **Multi-language email testing** - test internationalized email content

## Resources

- **Ethereal Email**: https://ethereal.email/
- **Nodemailer Testing**: https://nodemailer.com/about/#testing
- **Playwright Network Interception**: https://playwright.dev/docs/network
- **Your Production Email Code**: `stzUser/lib/mail-utilities.ts` (unchanged!)

This email testing setup gives you confidence that your email functionality works correctly while keeping your production email system completely isolated and safe! 🚀📧
