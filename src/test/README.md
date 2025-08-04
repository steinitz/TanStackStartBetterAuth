# Testing Setup

This directory contains the comprehensive testing infrastructure for our TanStack Start application with Better Auth integration.

## Overview

We use a multi-layered testing approach:
- **Unit Tests**: **Vitest** with **React Testing Library** for component and route testing
- **E2E Tests**: **Playwright** for end-to-end browser testing across multiple browsers

## File Structure

```
src/test/
├── README.md              # This file - comprehensive testing documentation
├── config/
│   └── playwright.config.ts # Playwright E2E test configuration
├── e2e/
│   └── smoke-navigation.spec.ts # E2E navigation and functionality tests
├── output/
│   ├── playwright-report/ # E2E test reports (auto-generated)
│   └── test-results/      # E2E test artifacts (auto-generated)
└── unit/
    ├── setup.ts           # Test environment setup (jest-dom matchers)
    ├── test-utils.tsx     # TanStack Router testing utilities
    ├── routes.test.tsx    # Simple component smoke tests
    └── route-imports.test.tsx # Route import and rendering tests
```

## Quick Start

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

# Run all tests (unit + E2E)
pnpm test:all
```

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

### `unit/test-utils.tsx`
Provides utilities for testing TanStack Router components with proper context setup, including memory history.

# E2E Testing

## Test Files

### `config/playwright.config.ts`
Playwright configuration for multi-browser E2E testing:
- **Browsers**: Chromium, Firefox, WebKit
- **Base URL**: http://localhost:3000
- **Output**: Reports and artifacts in `output/` directory
- **Retries**: 2 retries on CI, 0 locally

### `e2e/smoke-navigation.spec.ts`
Comprehensive navigation and functionality tests:

**Tests:**
- **Home Page**: Logo, navigation, footer verification
- **Contact Page**: Navigation, form elements, content verification
- **Cross-Navigation**: Bidirectional page navigation flows

**Coverage:**
- 9 tests across 3 browsers (27 total test executions)
- Core user journeys and page functionality
- Visual element verification and interaction testing

## Testing Architecture

**Our testing setup is designed specifically for TanStack Start applications:**

### 1. **Application Dependencies**
Our application components use **TanStack Start server functions**, not TanStack Query hooks:
- `useGetAllUsers()` - TanStack Start server function created with `createServerFn()`
- `useDeleteUserById()` - TanStack Start server function created with `createServerFn()`
- These provide server-side functionality with client-side interfaces

### 2. **Testing Strategy**
Our tests work by mocking the server functions directly:

```tsx
// Mock server functions for testing
vi.mock('~stzUser/lib/users-client', () => ({
  useGetAllUsers: vi.fn(() => Promise.resolve([])),
  useDeleteUserById: vi.fn(),
}))
```

### 3. **No Query Client Needed**
Since we use TanStack Start server functions instead of TanStack Query:
- No `QueryClientProvider` is required
- No query cache management needed
- Tests focus on component behavior with mocked server responses

### 4. **Clean Testing Environment**
The `renderWithProviders` utility provides:
- TanStack Router context with memory history
- Minimal route setup for component testing
- No unnecessary dependencies or providers

## Configuration

### Vitest Config (`vitest.config.ts`)
- **Environment**: jsdom for DOM testing
- **Globals**: Enabled for describe/it/expect
- **Setup**: Automatic jest-dom matcher loading
- **Plugins**: React SWC for fast compilation

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

# Run all tests (unit + E2E)
pnpm test:all
```

### Development Workflow
```bash
# Quick feedback loop during development
pnpm test:ui          # Unit tests with watch mode
pnpm test:e2e:ui      # E2E tests with browser UI

# CI/CD pipeline
pnpm test:all         # Complete test suite
```

## Best Practices

### Unit Testing
1. **Mock External Dependencies**: Always mock API calls, external libraries, and complex components
2. **Use Test IDs**: Prefer `data-testid` attributes for reliable element selection
3. **Test Behavior, Not Implementation**: Focus on what users see and do
4. **Keep Tests Simple**: Each test should verify one specific behavior
5. **Proper Cleanup**: Use `beforeEach` to reset mocks between tests

### E2E Testing
1. **Page Object Pattern**: Organize selectors and actions into reusable page objects
2. **Stable Selectors**: Use `data-testid` or semantic selectors over CSS classes
3. **Wait Strategies**: Always wait for elements and state changes explicitly
4. **Test Independence**: Each test should be able to run in isolation
5. **Meaningful Assertions**: Verify user-visible behavior and outcomes
6. **Clean Test Data**: Reset application state between tests when needed

### General Testing
1. **Test Pyramid**: More unit tests, fewer E2E tests
2. **Fast Feedback**: Unit tests for quick iteration, E2E for confidence
3. **Clear Test Names**: Describe what the test verifies in plain language
4. **Documentation**: Keep this README updated with new patterns and practices

## Future Enhancements

### Unit Testing
- **Integration Tests**: Test complete user flows with real router navigation
- **API Mocking**: Use MSW (Mock Service Worker) for more realistic API testing
- **Performance Testing**: Monitor component render times and memory usage

### E2E Testing
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

**TypeScript errors with route properties**
- Access route properties via `RouteConfig.options?.component` instead of direct property access

**Tests hanging or timing out**
- Check that all async operations are properly mocked
- Ensure server functions are mocked before component imports

**Server function mocking issues**
- Mock server functions at the module level using `vi.mock()`
- Ensure mocks return appropriate Promise-based responses
- Clear mocks between tests using `vi.clearAllMocks()`

### E2E Testing Issues

**"Error: connect ECONNREFUSED"**
- Ensure the development server is running on http://localhost:3000
- Start server with `pnpm dev` before running E2E tests

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
- Reports and artifacts are auto-generated in `src/test/output/`
- Clean output: `rm -rf src/test/output/test-results src/test/output/playwright-report`