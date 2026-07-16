# Testing Setup

This directory contains the comprehensive testing infrastructure for our TanStack Start application with Better Auth integration.

## Overview

We use a multi-layered testing approach:
- **Unit Tests**: **Vitest** with **React Testing Library** for component and route testing
- **E2E Tests**: **Playwright** for end-to-end browser testing in Chromium by default, with additional browser project templates available

## File Structure

stzUser/test/
├── README.md              # This file - comprehensive testing documentation
├── e2e/
│   ├── config/
│   │   ├── e2e-env.ts           # Sealed E2E environment contract
│   │   ├── e2e-web-servers.ts   # Turso, Mailpit, and built-app topology
│   │   ├── playwright.config.ts # Playwright E2E test configuration
│   │   └── global-setup.ts      # Read-only readiness assertions
│   ├── utils/
│   │   ├── EmailTester.ts       # Mailpit email testing class
│   │   ├── isPlaywrightRunning.ts # Playwright detection utility
│   │   └── testAuthUtils.ts     # Authenticated E2E user helpers
│   ├── environment-contract.spec.ts # Worker/server/browser env canary
│   ├── contact-flow.spec.ts     # Contact form email functionality tests
│   ├── smoke-navigation.spec.ts # E2E navigation and functionality tests
│   ├── wallet-visibility.spec.ts # Ledger balance and badge reactivity tests
│   ├── README.md                # E2E and email testing documentation
│   └── .output/                 # Generated reports and test artifacts
├── unit/
│   ├── setup.ts           # Test environment setup (jest-dom matchers)
│   ├── test-utils.tsx     # TanStack Router testing utilities
│   ├── routes.test.tsx    # Simple component smoke tests
│   ├── route-imports.test.tsx # Route import and rendering tests
│   ├── users-integration.test.ts # Direct database/Kysely interaction tests
│   └── wallet.integration.test.ts # Ledger and consumption logic tests
```

## Quick Start

### Unit Tests
```bash
# Run all unit tests (watch mode)
pnpm test

# Run unit tests with interactive UI
pnpm test:ui

# Run unit tests once (CI mode)
pnpm test:run
```

### E2E Tests
```bash
# Run all E2E tests (headless)
pnpm test:e2e

# Run E2E tests with interactive UI
pnpm test:e2e:ui

# Run specific test file
pnpm test:e2e -- smoke-navigation.spec.ts

# Run tests with specific browser
pnpm test:e2e -- --project=chromium
```

### Complete Test Suite
```bash
# Run all tests (unit + E2E)
pnpm test:all
```

## Server Management

Playwright owns a built-application E2E topology. Tests run against `http://localhost:3019`; ordinary `pnpm dev` remains independent on `http://localhost:3000`.

The server is created with `vite build --mode e2e` and served from `dist/server` by the pinned `srvx` dependency. This exercises production-style output instead of Vite's transform-on-request development path.

### How It Works
- **Sealed Environment**: `e2e-env.ts` validates `.env.e2e` against the tracked `.env.e2e.example` schema before Playwright starts anything
- **External Tool Preflight**: Missing Turso or Mailpit fails immediately with a named installation command
- **Owned Services**: Playwright starts ephemeral Turso, Mailpit when needed, and the built application through its `webServer` configuration
- **Read-Only Readiness**: Global setup checks the application, Better Auth, and database without creating a user or deleting data
- **Clean Shutdown**: Playwright tears down every process group it started, including after failed tests

### Environment Variable System
Create the ignored local E2E file from the tracked schema:

```bash
cp .env.e2e.example .env.e2e
```

`.env.e2e` is the sole local source of E2E values. File values beat inherited shell values, omitted optional managed keys become empty, undocumented keys fail, and `.env.e2e.local` is forbidden. Stripe keys remain optional so the ordinary suite can skip the card spec loudly.

### External Tools

```bash
brew install tursodatabase/tap/turso
brew install mailpit
```

The locally verified baseline is Turso CLI `1.0.26` and Mailpit `1.27.5`. These are known-good versions, not maximum supported versions. `srvx` is installed by `pnpm install` at the exact version recorded in `package.json`.

### Benefits
✅ **Test Environment Isolation**: Ensures tests always run with proper test configuration
✅ **Environment Variable Propagation**: One sanitized contract reaches services, workers, server, and browser
✅ **Development Safety**: E2E does not reuse, commandeer, or kill the ordinary dev server
✅ **Production Fidelity**: Browser tests exercise a production build
✅ **Deterministic Database**: Each run owns a fresh ephemeral Turso process
✅ **Actionable Failure**: Missing files, keys, relationships, and tools fail by name before startup

# Unit Testing

## Test Files

### `unit/setup.ts`
Configures the test environment with jest-dom matchers for enhanced assertions like `toBeInTheDocument()`.

### `unit/routes.test.tsx`
Contains basic smoke tests that verify components can render without errors. These tests use simple mocking and don't require complex router setup.

**Tests:**
- Basic component rendering
- Sign-in component functionality
- User management with empty state

### `unit/route-imports.test.tsx`
More comprehensive tests that verify actual route imports and component rendering with proper TanStack Router integration.

**Tests:**
- Route module imports without errors
- Route component rendering
- Loader function execution

**Framework Resilience Mocks:**
This file includes generic mocks for `@tanstack/react-start` and `@tanstack/react-start/server`. This ensures application-specific routes that use `createServerFn` or `getWebRequest` can be safely imported and rendered in foundation tests without project-specific configuration.

### `unit/test-utils.tsx`
Provides utilities for testing TanStack Router components with proper context setup, including memory history.

## Test Utilities

### `e2e/config/e2e-env.ts`
Owns the E2E schema, file loading, validation, process sealing, and typed worker projection. No other E2E helper reads an env file.

### `e2e/config/e2e-web-servers.ts`
Defines the shared Turso, Mailpit, and built-app topology and performs the external-tool preflight.

# E2E Testing

## Test Files

### `e2e/config/playwright.config.ts`
Playwright configuration for the shared E2E suite:
- **Browser**: Chromium by default; commented project templates make additional browsers opt-in
- **Base URL**: `http://localhost:3019`, returned by the sealed E2E environment loader
- **Output**: Reports and artifacts in `stzUser/test/e2e/.output/`
- **Retries**: 2 retries on CI, 0 locally for faster development
- **Global Setup**: Read-only application, Better Auth, and database readiness checks
- **Web Servers**: Playwright-owned Turso, Mailpit, and built application
- **Timeouts**: 30s test timeout, 120s server startup timeout
- **Parallel Execution**: Disabled; the shared database suite runs with one worker

### `e2e/config/global-setup.ts`
Global test setup and utilities:
- **Application Readiness**: Requires `/api/test-env` to report Playwright and production mode
- **Auth/Database Readiness**: Requires an anonymous Better Auth session request to succeed
- **No Mutation**: Does not sign up users, reset databases, or manage processes

### `e2e/smoke-navigation.spec.ts`
Comprehensive navigation and functionality tests:

**Tests:**
- **Home Page**: Logo, navigation, footer verification
- **Contact Page**: Navigation, form elements, content verification
- **Cross-Navigation**: Bidirectional page navigation flows

**Coverage:**
- Core user journeys and page functionality in the configured Chromium project
- Visual element verification and interaction testing

### `e2e/wallet-visibility.spec.ts`
Tests the ledger balance and UI badge reactivity:

**Tests:**
- **Badge Visibility**: Confirms the wallet badge appears after login
- **Reactivity**: Verifies the balance updates immediately after transactions (grants/consumption)
- **Insufficient Credits**: Verifies the `CreditsRequiredDialog` appears when balance is too low

### `e2e/contact-flow.spec.ts`
Comprehensive contact form functionality testing:

**Tests:**
- **Form Submission**: Complete contact form workflow testing
- **Email Integration**: Verification of email sending functionality
- **UI State Management**: Success message display and form reset
- **Validation Flow**: Form validation and error handling

**Features:**
- **Mailpit Integration**: Uses the Playwright-owned local SMTP service
- **End-to-End Workflow**: Tests the complete user journey from form to captured email
- **Production-Safe**: No messages leave the local test topology
- **Automated Verification**: Programmatic email content and delivery assertions

### `e2e/README.md`
Comprehensive documentation for E2E testing including email testing setup and strategies:

**Coverage:**
- **Mailpit Setup**: Local SMTP capture and API inspection
- **Testing Strategies**: Best practices for email functionality testing
- **Troubleshooting**: Common issues and solutions for email tests
- **Integration Examples**: Code examples and implementation patterns

**Benefits:**
- **Production Safety**: Zero impact on production email systems
- **Visual Verification**: Web interface for manual email inspection
- **Automated Testing**: Programmatic email content validation
- **Developer Friendly**: Easy setup and maintenance

### `e2e/utils/EmailTester.ts`
Class for Mailpit email testing:

**Core Functions:**
- `EmailTester.getSentEmails()` - Retrieves captured emails for verification
- `EmailTester.verifyEmailSent()` - Validates email sending with criteria
- `EmailTester.clearSentEmails()` - Clears captured messages between tests
- `EmailTester.getWebInterfaceUrl()` - Returns the local inspection UI

**Benefits:**
- **Real SMTP Path**: The application sends through its normal SMTP code to local Mailpit
- **Visual Inspection**: Web interface for manual email review
- **Safe Testing**: No real emails sent, production code unchanged
- **Comprehensive Coverage**: Full email workflow testing

## Testing Architecture

**Our testing setup is designed specifically for TanStack Start applications:**

### 1. **Application Dependencies**
Application components use **TanStack Start server functions** for server boundaries. The wallet UI additionally uses TanStack Query to coordinate authenticated server state:
- `useGetAllUsers()` - TanStack Start server function created with `createServerFn()`
- `useDeleteUserById()` - TanStack Start server function created with `createServerFn()`
- `useWallet()` / `useTransactions()` - domain hooks backed by server functions and one user-scoped Query cache family

### 2. **Testing Strategy**
Our tests work by mocking the server functions directly:

```tsx
// Mock server functions for testing
vi.mock('~stzUser/lib/users-client', () => ({
  useGetAllUsers: vi.fn(() => Promise.resolve([])),
  useDeleteUserById: vi.fn(),
}))
```

### 3. **Fresh Query Client Per Test**
`renderWithProviders` creates a new `QueryClient` for every render, disables retries, and supplies it through `QueryClientProvider`. This prevents one test's cache or in-flight request from leaking into another.

Query-domain tests mock the underlying server functions, then exercise deduplication, identity changes, cache refresh and race handling through the real Query client.

### 4. **Clean Testing Environment**
The `renderWithProviders` utility provides:
- TanStack Router context with memory history
- A fresh TanStack Query client and provider
- Minimal route setup for component testing
- Deterministic retry and cache isolation defaults

## Configuration

### Vitest Config (`vitest.config.ts`)
- **Environment**: jsdom for DOM testing
- **Globals**: Enabled for describe/it/expect
- **Setup**: Automatic jest-dom matcher loading
- **Plugins**: React SWC for fast compilation
- **TypeScript**: Full TypeScript support with type checking

### Test Utilities
The `renderWithProviders()` utility creates a minimal testing environment:
- TanStack Router with memory history
- Simplified route structure for component testing

## Mocking Strategy

### External Dependencies
We mock all external dependencies to isolate component logic:

```tsx
// User management functions
vi.mock('~stzUser/lib/users-client', () => ({
  useGetAllUsers: vi.fn(() => Promise.resolve([])),
  useDeleteUserById: vi.fn(),
}))

// Auth components
vi.mock('~stzUser/components/RouteComponents/SignIn', () => ({
  SignIn: () => <div data-testid="signin-component">Sign In Component</div>,
}))
```

### TanStack Router
We mock `createFileRoute` to provide controlled loader data:

```tsx
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: vi.fn((path: string) => {
    return (config: any) => ({
      ...config,
      useLoaderData: mockUseLoaderData,
    })
  }),
}))
```

## Running Tests

### Unit Tests
```bash
# Run all unit tests
pnpm test

# Run unit tests with UI
pnpm test:ui

# Run unit tests once (CI mode)
pnpm test:run
```

### E2E Tests
```bash
# Run all E2E tests (headless)
pnpm test:e2e

# Run E2E tests with interactive UI
pnpm test:e2e:ui

# Run specific test patterns
pnpm test:e2e -- --grep="contact form"
pnpm test:e2e -- smoke-navigation.spec.ts

# Run with specific browser
pnpm test:e2e -- --project=firefox

# Debug mode (headed browser)
pnpm test:e2e -- --debug

# Run all tests (unit + E2E)
pnpm test:all
```

### Development Workflow
```bash
# Quick feedback loop during development
pnpm test:ui          # Unit tests with watch mode and UI
pnpm test:e2e:ui      # E2E tests with browser UI

# Pre-commit validation
pnpm test:run         # Unit tests (CI mode)
pnpm test:e2e         # E2E tests (headless)

# CI/CD pipeline
pnpm test:all         # Complete test suite (unit + E2E)
```

## Best Practices

### Test Organization
1. **File Naming**: Use descriptive names that clearly indicate what's being tested
2. **Directory Structure**: Keep tests organized by type (unit/, e2e/) and feature
3. **Configuration Separation**: Maintain test configs in dedicated config/ directories
4. **Shared Utilities**: Centralize common test utilities in utils/ directories
5. **Documentation**: Keep test documentation updated with new patterns and changes

### Unit Testing
1. **Mock External Dependencies**: Always mock API calls, external libraries, and complex components
2. **Use Test IDs**: Prefer `data-testid` attributes for reliable element selection
3. **Test Behavior, Not Implementation**: Focus on what users see and do
4. **Keep Tests Simple**: Each test should verify one specific behavior
5. **Proper Cleanup**: Use `beforeEach` to reset mocks between tests
6. **TypeScript Integration**: Leverage TypeScript for better test reliability and IDE support

### E2E Testing
1. **Page Object Pattern**: Organize selectors and actions into reusable page objects
2. **Stable Selectors**: Use `data-testid` or semantic selectors over CSS classes
3. **Wait Strategies**: Always wait for elements and state changes explicitly
4. **Test Independence**: Each test should be able to run in isolation
5. **Meaningful Assertions**: Verify user-visible behavior and outcomes
6. **Clean Test Data**: Reset application state between tests when needed

### General Testing
1. **Test Pyramid**: More unit tests, fewer E2E tests for optimal speed and reliability
2. **Fast Feedback**: Unit tests for quick iteration, E2E for confidence
3. **Clear Test Names**: Describe what the test verifies in plain language
4. **Documentation**: Keep this README updated with new patterns and practices
5. **Type Safety**: Ensure TypeScript types are properly validated across all test files
6. **CI/CD Integration**: Ensure all test commands work reliably in automated environments
7. **Development Workflow**: Keep E2E isolated from live development servers

## Future Enhancements

### Unit Testing
- **Integration Tests**: Test complete user flows with real router navigation
- **API Mocking**: Use MSW (Mock Service Worker) for more realistic API testing
- **Performance Testing**: Monitor component render times and memory usage

### E2E Testing
- **Email Testing**: Extend the existing Mailpit scenarios and content assertions
- **Wallet Testing**: Integrated tests for Ledger balances, UI badge reactivity, and **Atomic Concurrency**.
- **Race Condition Verification**: Automated tests for daily grant double-allocations and negative balance prevention.
- **Visual Regression**: Add screenshot comparison testing
- **Authentication Flows**: Test sign-in/sign-up user journeys
- **Form Interactions**: Comprehensive form validation and submission testing
- **Mobile Testing**: Add mobile device emulation
- **API Integration**: Test real API interactions and data flows
- **Performance Monitoring**: Add Lighthouse audits and performance metrics

## Troubleshooting

### Unit Testing Issues

**"createFileRoute is not a function"**
- Ensure TanStack Router is properly mocked before importing route components
- Check that the mock is applied at the module level

**TypeScript errors with route properties**
- Access route properties via `RouteConfig.options?.component` instead of direct property access
- Ensure route mocks have proper TypeScript types

**Tests hanging or timing out**
- Check that all async operations are properly mocked
- Ensure server functions are mocked before component imports
- Verify no real network requests are being made

**Server function mocking issues**
- Mock server functions at the module level using `vi.mock()`
- Ensure mocks return appropriate Promise-based responses
- Clear mocks between tests using `vi.clearAllMocks()`
- Use proper TypeScript types for mock return values

### E2E Testing Issues

**"Error: connect ECONNREFUSED"**
- Confirm `.env.e2e` matches `.env.e2e.example`
- Check that ports 3019, 8081, 8025, and 1025 are free
- Read the forwarded web-server stderr; do not start `pnpm dev` as an E2E substitute

**"Missing E2E tool"**
- Run the installation command printed for Turso or Mailpit
- Run `pnpm install` if the pinned `srvx` executable is missing

**Browser launch failures**
- Install Playwright browsers: `npx playwright install`
- Check system dependencies: `npx playwright install-deps`

**Test timeouts**
- Increase timeout in playwright.config.ts if needed
- Check for slow network requests or animations
- Use `page.waitForLoadState()` for proper page loading

**Flaky tests**
- Add proper wait conditions: `page.waitForSelector()`
- Use `expect.poll()` for dynamic content
- Increase retries in configuration for unstable environments

**Output directory issues**
- Reports and artifacts are auto-generated in `stzUser/test/e2e/.output/`
- Clean output: `rm -rf stzUser/test/e2e/.output/test-results stzUser/test/e2e/.output/playwright-report`
- Ensure proper write permissions for output directories

**Configuration path issues**
- Verify Playwright config path: `stzUser/test/e2e/config/playwright.config.ts`
- Check that global setup and both shared config helpers exist under `stzUser/test/e2e/config/`
- Ensure all config files are properly typed and exported

### Development Workflow Issues

**Tests interfering with development server**
- The E2E built app uses port 3019 and never reuses the ordinary port-3000 dev server
- Check listeners with `lsof -nP -iTCP:3019 -iTCP:8081 -iTCP:8025 -iTCP:1025 -sTCP:LISTEN`
- Let Playwright own shutdown; avoid broad process-name cleanup commands

**CI/CD pipeline failures**
- Run complete test suite: `pnpm test:all`
- Verify TypeScript compilation is passing
- Check that all dependencies are properly installed
- Ensure proper environment variables are set
