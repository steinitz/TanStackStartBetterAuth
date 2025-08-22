# E2E Testing Documentation

This directory contains comprehensive end-to-end testing utilities and documentation for the application, including specialized email testing with **Mailpit** - a local SMTP testing server perfect for testing email functionality without sending real emails.

## Test Files Overview

- **`signup-flow.spec.ts`** - Tests the complete user signup flow with form validation and success confirmation
- **`contact-form-shows-email-success.spec.ts`** - Tests contact form submission and email functionality
- **`smoke.spec.ts`** - Basic smoke tests for core application functionality

## Email Testing with Mailpit

## What is Mailpit?

Mailpit is a local SMTP testing server that:
- **Captures emails** instead of delivering them
- **Provides a web interface** to view captured emails at http://localhost:8025
- **Works with any SMTP client** (including your production email code)
- **Runs locally** for fast, reliable testing
- **Is completely free** and open source
- **Requires no external accounts** or internet connection

## How It Works

### 1. Start Mailpit Server
```bash
# Start Mailpit server (runs on localhost:1025 for SMTP, localhost:8025 for web UI)
mailpit
```

### 2. Email Retrieval and Testing
```typescript
// Retrieve emails captured by Mailpit
const emails = await EmailTester.getSentEmails();

// Verify specific email was sent
const emailSent = await EmailTester.verifyEmailSent({
  to: 'user@example.com',
  subject: 'Welcome'
});

// Extract verification links from emails
const links = EmailTester.extractVerificationLinks(email);
```

### 3. Web Interface Viewing
View all captured emails in Mailpit's web interface:
```
📧 View emails at: http://localhost:8025
📧 Mailpit captures all emails sent to localhost:1025
```

## Files Overview

### `utils/EmailTester.ts`
Core utilities for Mailpit email testing:
- **`EmailTester.getSentEmails()`** - Retrieves all emails captured by Mailpit
- **`EmailTester.getLastSentEmail()`** - Gets the most recent email
- **`EmailTester.getEmailsTo(recipient)`** - Gets emails sent to specific recipient
- **`EmailTester.verifyEmailSent(criteria)`** - Verifies emails were sent with specific criteria
- **`EmailTester.extractVerificationLinks(email)`** - Extracts verification links from email content
- **`EmailTester.clearSentEmails()`** - Clears all emails from Mailpit
- **`EmailTester.getWebInterfaceUrl()`** - Returns Mailpit web interface URL

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
🚀 Mailpit server running at http://localhost:8025
📧 Emails captured by Mailpit at localhost:1025
✅ Email verification completed: { to: 'support@yourapp.com', subject: 'Contact form for Your Company' }
📧 View emails at: http://localhost:8025
✅ Contact form email test completed successfully
```

## Key Benefits

### 🔒 **Production Safety**
- **Zero impact** on your production email setup
- **No real emails sent** during testing
- **Local testing environment** - no external dependencies

### 🚀 **Easy Integration**
- **Works with existing SMTP code** - no changes needed
- **Local SMTP server** - runs on localhost:1025
- **Drop-in replacement** for production email sending

### 🔍 **Comprehensive Verification**
- **Visual email inspection** via web interface at localhost:8025
- **Programmatic verification** via Mailpit API
- **Email capture and analysis** for automated testing

### 🧪 **Perfect for Testing**
- **Local server** - fast, reliable, no internet required
- **Deterministic results** - no external service dependencies
- **Fast execution** - local SMTP processing

## Understanding the Test Flow

### 1. Test Setup
```typescript
test.beforeAll(async () => {
  // Mailpit server should be running on localhost:1025 (SMTP) and localhost:8025 (web UI)
  // No additional setup needed - EmailTester connects to Mailpit automatically
});
```

### 2. Email Configuration
```typescript
// Your app sends emails to Mailpit's SMTP server (localhost:1025)
// No request interception needed - emails are captured automatically
// Configure your test environment to use:
// SMTP_HOST=localhost
// SMTP_PORT=1025
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
// Verify email was captured by Mailpit
const sentEmails = await EmailTester.getSentEmails();
expect(sentEmails).toHaveLength(1);
expect(sentEmails[0].to[0].address).toBe('support@yourapp.com');
```

### 5. Manual Inspection (Optional)
```typescript
// View all emails in Mailpit web interface
const webInterfaceUrl = EmailTester.getWebInterfaceUrl();
console.log('📧 View all emails at:', webInterfaceUrl); // http://localhost:8025
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
const emails = await EmailTester.getEmailsTo('user@example.com');
expect(emails).toHaveLength(1);
expect(emails[0].subject).toContain('Welcome');
expect(emails[0].html).toContain('<h1>Welcome!</h1>');

// Verify email text content
expect(emails[0].text).toContain('Welcome to our service');

// Verify sender and recipient
expect(emails[0].from.address).toBe('noreply@yourapp.com');
expect(emails[0].to[0].address).toBe('user@example.com');
```

### Error Scenario Testing
```typescript
// Test email service failures by stopping Mailpit or using wrong SMTP config
// Clear any existing emails first
await EmailTester.clearSentEmails();

// Trigger email sending with Mailpit unavailable
// Your app should handle SMTP connection failures gracefully

// Verify no emails were sent
const emails = await EmailTester.getSentEmails();
expect(emails).toHaveLength(0);
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

**"Mailpit connection failed"**
- Ensure Mailpit server is running: `mailpit`
- Check Mailpit is listening on localhost:1025 (SMTP) and localhost:8025 (web)
- Verify no other services are using these ports

**"Email not captured"**
- Verify your app is configured to use localhost:1025 for SMTP
- Check `.env.test` has correct SMTP settings
- Ensure Mailpit server is running before starting tests

**"Web interface not accessible"**
- Mailpit web interface should be at http://localhost:8025
- Check Mailpit server logs for any startup errors
- Verify port 8025 is not blocked by firewall

**"Environment variable issues"**
- Verify `.env.test` file exists in project root
- Check `isPlaywrightRunning()` returns `true` during tests
- Ensure `dotenv-cli` is installed: `pnpm add -D dotenv-cli`

### Debug Tips

```typescript
// Add debug logging
test('debug email flow', async ({ page }) => {
  // Log SMTP connections (check your app's email service logs)
  
  // Log email test utilities state
  const emails = await EmailTester.getSentEmails();
  console.log('Sent emails:', emails.length);
  console.log('Web interface:', EmailTester.getWebInterfaceUrl());
  
  // Check Mailpit server status
  console.log('Mailpit API available:', emails !== null);
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

Mailpit works perfectly in CI environments:
- **Local server** - no external dependencies
- **No API keys required** - completely free
- **Deterministic results** - same behavior every time
- **Fast execution** - local SMTP processing

```yaml
# GitHub Actions example
- name: Run E2E Email Tests
  run: |
    mailpit &
    sleep 2
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

- **Mailpit**: https://mailpit.axllent.org/
- **Mailpit GitHub**: https://github.com/axllent/mailpit
- **Playwright Testing**: https://playwright.dev/docs/
- **Your Production Email Code**: `stzUser/lib/mail-utilities.ts` (unchanged!)

This email testing setup gives you confidence that your email functionality works correctly while keeping your production email system completely isolated and safe! 🚀📧
