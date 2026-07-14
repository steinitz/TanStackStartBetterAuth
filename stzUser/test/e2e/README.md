# E2E Testing Documentation

This directory contains comprehensive end-to-end testing utilities and documentation for the application, including specialized email testing with **Mailpit** - a local SMTP testing server perfect for testing email functionality without sending real emails.

## Test Files Overview

- **signup-flow.spec.ts** - Tests the complete user signup flow with form validation and success confirmation
- **contact-flow.spec.ts** - Tests contact form submission and email functionality
- **wallet-visibility.spec.ts** - Tests credit balance visibility, daily grants, and reactive UI updates
- **smoke-navigation.spec.ts** - Basic navigation and core application smoke coverage
- **environment-contract.spec.ts** - Confirms sanitized values reach the worker, server, and browser

## Email Testing with Mailpit

## What is Mailpit?

Mailpit is a local SMTP testing server that:
- **Captures emails** instead of delivering them
- **Provides a web interface** to view captured emails at http://localhost:8025
- **Works with any SMTP client** (including your production email code)
- **Runs locally** for fast, reliable testing
- **Is completely free** and open source
- **Requires no external accounts** or internet connection
- **Automatically starts** during E2E tests - no manual setup required!

## How It Works

### Automatic Mailpit Management

Playwright's shared `webServer` topology manages Mailpit for you:
- **Reuses** a compatible Mailpit already listening on the configured ports
- **Starts** Mailpit when none is running
- **Waits** for the Mailpit API before running tests
- **Tears down** the process when Playwright started it

No manual server startup is required. The `assertE2eToolsInstalled()` preflight fails immediately with an installation command if Mailpit is unavailable.

### 1. Mailpit Server (Automatic)
```bash
# Playwright starts Mailpit automatically during E2E tests.
# Start it manually only for independent email inspection:
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

### `contact-flow.spec.ts`
Comprehensive E2E tests for contact form email functionality:
- **Email sending verification** - Confirms emails are sent when form is submitted
- **Error handling** - Tests graceful failure when email service is unavailable
- **Form validation** - Ensures invalid forms don't trigger emails

### `wallet-visibility.spec.ts`
Tests the unified credit system and wallet UI:
- **Daily Grant** - Verifies a new user starts with the daily allowance (3 credits)
- **Manual Grants** - Verifies credits increment correctly after simulated top-ups
- **Consumption** - Verifies credits decrement correctly after actions
- **Insufficient Credits** - Verifies the `CreditsRequiredDialog` appears when balance is too low
- **UI Reactivity** - Verifies the wallet badge updates without page refreshes

## Running Email Tests

### Prerequisites
```bash
# One-time local setup
cp .env.e2e.example .env.e2e
brew install tursodatabase/tap/turso
brew install mailpit
pnpm install
```

Fill the required local values in `.env.e2e`. Do not start `pnpm dev` for E2E: Playwright builds and owns the test application, ephemeral Turso server, and Mailpit lifecycle. The locally verified tool baseline is Turso CLI `1.0.26` and Mailpit `1.27.5`; these are known-good versions, not maximums.

### Run Email Tests
```bash
# Run all E2E tests (including email tests)
pnpm test:e2e

# Run the Mailpit boundary test
pnpm test:e2e -- mailpit.spec.ts

# Run with UI to see browser interactions
pnpm test:e2e:ui -- mailpit.spec.ts
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

## Bot Protection Testing (Cloudflare Turnstile)

The application uses Cloudflare Turnstile to protect the sign-up flow from bots. This presents a challenge for automated tests, which we handle using Cloudflare's dedicated test keys.

### How It Works in Tests

1.  **Always Pass Keys**: In `.env.e2e`, we use Cloudflare's "Always Pass" dummy keys:
    *   `TURNSTILE_SITE_KEY`: `1x00000000000000000000AA`
    *   `TURNSTILE_SECRET_KEY`: `1x0000000000000000000000000000000AA`
2.  **Readiness**: Global setup checks `/api/test-env` plus an anonymous Better Auth session request without creating a user or bypassing Turnstile.
3.  **Client-Side**: The Turnstile widget automatically "solves" the challenge in the test environment because of the dummy site key, rendering a valid token that is sent to the server.

### Manual Verification of Protection

To verify that the server correctly *rejects* sign-ups without a token:
- Temporarily remove the `x-turnstile-token` from the request in `SignUp.tsx`.
- The server will return a `400 Bad Request` with an `INVALID_TURNSTILE_TOKEN` error code.

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
- Confirm `.env.e2e` exists and matches the topology in `.env.e2e.example`
- Check that ports 3019, 8081, 8025, and 1025 are free
- Read the forwarded web-server stderr for the failing Turso, Mailpit, build, or built-app command
- Do not substitute a manually started development server; the built application is the authoritative E2E target

**"Missing E2E tool"**
- Install the exact tool named by the preflight message
- On macOS, use `brew install tursodatabase/tap/turso` or `brew install mailpit`
- `srvx` is a pinned project dependency and is installed by `pnpm install`

**"Mailpit connection failed"**
- Check Mailpit is listening on localhost:1025 (SMTP) and localhost:8025 (web)
- Verify no other services are using these ports
- Check the Playwright web-server stderr for its startup error

**"Email not captured"**
- Verify your app is configured to use localhost:1025 for SMTP
- Check `.env.e2e` has the example's SMTP settings
- Ensure Mailpit server is running before starting tests

**"Web interface not accessible"**
- Mailpit web interface should be at http://localhost:8025
- Check Mailpit server logs for any startup errors
- Verify port 8025 is not blocked by firewall

**"Environment variable issues"**
- Verify `.env.e2e` and `.env.e2e.example` exist in the project root
- Remove `.env.e2e.local`; hidden E2E override tiers are forbidden
- Check `isPlaywrightRunning()` returns `true` during tests
- Read the contract error by key name; diagnostics deliberately omit values and secrets

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

The authoritative E2E target is a production build served over plain HTTP at `http://localhost:3019`, not a Vite development server. Ordinary `pnpm dev` remains independent on port 3000.

### How It Works
- `e2e-env.ts` reads the tracked `.env.e2e.example` schema, overlays `.env.e2e`, rejects undocumented keys, and clears inherited optional values.
- `e2e-web-servers.ts` gives Playwright three services: ephemeral Turso on 8081, Mailpit on 8025/1025, and `pnpm build:e2e && pnpm serve:built` on 3019.
- Turso and the built app never reuse existing processes. Mailpit may be reused when a developer already owns a compatible instance.
- `global-setup.ts` performs read-only readiness checks against `/api/test-env` and Better Auth. It creates no users and deletes no data.
- Playwright tears down the process groups it starts, including after test failures.

### Environment Variable System
Tests require the local ignored `.env.e2e` file with `PLAYWRIGHT_RUNNING=true`:

```bash
# Create once, then fill the required local values
cp .env.e2e.example .env.e2e
```

### Benefits
- **Test Environment Isolation**: Guarantees proper test configuration
- **Environment Variable Propagation**: One sealed `.env.e2e` contract reaches config, services, workers, server, and browser
- **Development Safety**: E2E never commandeers or kills an ordinary Vite dev server
- **Production Fidelity**: Tests exercise the built server rather than transform-on-request development behavior
- **Deterministic Database**: Every run owns a fresh ephemeral Turso process
- **Clean Shutdown**: Playwright owns lifecycle instead of broad process-name termination

## Integration with CI/CD

Mailpit works perfectly in CI environments:
- **Local server** - no external dependencies
- **No API keys required** - completely free
- **Deterministic results** - same behavior every time
- **Fast execution** - local SMTP processing

CI must install the external `turso` and `mailpit` executables before the test step. Once installed, use the same command as local development; Playwright owns all three service processes:

```yaml
- name: Run E2E tests
  run: pnpm test:e2e
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

## Test Utilities & Stability

### Waiting Utilities (`utils/testActions.ts`)

The E2E test suite includes sophisticated waiting utilities that have proven crucial for test stability:

#### `waitWithExponentialBackoff()`
Generic utility for retrying async operations with exponential backoff:

```typescript
import { waitWithExponentialBackoff } from './utils/testActions';

// Wait for any async operation with retries
await waitWithExponentialBackoff(
  async () => {
    const response = await fetch('/api/status');
    if (!response.ok) throw new Error('API not ready');
    return response;
  },
  {
    maxAttempts: 10,
    baseWaitMs: 500,
    maxWaitMs: 3000,
    multiplier: 1.5,
    errorMessage: 'API failed to become ready'
  }
);
```

#### `waitForElementVisible()`
Specialized utility for Playwright element visibility with exponential backoff:

```typescript
import { waitForElementVisible } from './utils/testActions';

// Wait for element visibility with robust retry logic
const submitButton = page.locator('button[type="submit"]');
await waitForElementVisible(submitButton, {
  maxAttempts: 8,
  baseWaitMs: 300,
  timeout: 1000,
  errorMessage: 'Submit button never became visible'
});
```

#### `signInUser()`
Reusable authentication helper with error handling:

```typescript
import { signInUser } from './utils/testActions';

// Sign in with automatic error detection and navigation verification
await signInUser(page, 'user@example.com', 'password123');
```

### Test Stability Best Practices

1. **Use Exponential Backoff**: Prefer `waitWithExponentialBackoff()` over simple timeouts for unreliable operations
2. **Element Visibility**: Use `waitForElementVisible()` instead of basic `toBeVisible()` for dynamic elements
3. **Focused Waiting**: Target specific conditions rather than arbitrary delays
4. **Error Context**: Provide meaningful error messages for debugging failures
5. **SlowMo Configuration**: Use `slowMo: 1000` in browser launch options for timing-sensitive tests

### Recent Stability Improvements

#### Password Change & Reset Tests
The password change (`password-change.spec.ts`) and password reset (`password-reset-flow.spec.ts`) tests have been stabilized using:

- **Exponential backoff patterns** for element visibility
- **Robust email verification** with retry logic
- **Improved error handling** for form submissions
- **Consistent waiting strategies** across test flows

#### Code Abstraction Benefits
- **Reduced duplication**: Common waiting patterns extracted to `testActions.ts`
- **Improved maintainability**: Centralized retry logic for easier updates
- **Better error messages**: Contextual failure information for debugging
- **Consistent behavior**: Standardized waiting across all E2E tests

### Test Cleanup & Server Management

#### Playwright-Owned Teardown
Playwright owns the Turso and built-app process groups and stops them after the run, including failure paths. It also stops Mailpit when it started that instance; an already-running reusable Mailpit remains the developer's process. There is no custom global teardown and no broad `pkill` fallback.

#### Manual Cleanup (if needed)
```bash
# Identify listeners without killing unrelated development processes
lsof -nP -iTCP:3019 -iTCP:8081 -iTCP:8025 -iTCP:1025 -sTCP:LISTEN
```

#### Development vs Test Mode
- **E2E Mode**: Built app plus isolated services, configured by `.env.e2e`
- **Development Mode**: Independent Vite server configured by `.env.development`
- **Environment Detection**: E2E retains the sanitized `PLAYWRIGHT_RUNNING=true` flag

## Resources

- **Mailpit**: https://mailpit.axllent.org/
- **Mailpit GitHub**: https://github.com/axllent/mailpit
- **Playwright Testing**: https://playwright.dev/docs/
- **Test Utilities**: `stzUser/test/e2e/utils/testActions.ts`
- **Your Production Email Code**: `stzUser/lib/mail-utilities.ts` (unchanged!)

This email testing setup gives you confidence that your email functionality works correctly while keeping your production email system completely isolated and safe! 🚀📧
