# Testing Setup

This directory contains the testing infrastructure for our TanStack Start application with Better Auth integration.

## Overview

We use **Vitest** with **React Testing Library** to test our TanStack Router components and routes. The setup includes proper mocking strategies and utilities for testing router-based applications.

## File Structure

```
src/test/
├── README.md              # This file - testing documentation
├── setup.ts               # Test environment setup (jest-dom matchers)
├── test-utils.tsx         # TanStack Router testing utilities
├── routes.test.tsx        # Simple component smoke tests
└── route-imports.test.tsx # Route import and rendering tests
```

## Test Files

### `setup.ts`
Configures the test environment with jest-dom matchers for enhanced assertions like `toBeInTheDocument()`.

### `routes.test.tsx`
Contains basic smoke tests that verify components can render without errors. These tests use simple mocking and don't require complex router setup.

**Tests:**
- Basic component rendering
- Sign-in component functionality
- User management with empty state

### `route-imports.test.tsx`
More comprehensive tests that verify actual route imports and component rendering with proper TanStack Router integration.

**Tests:**
- Route module imports without errors
- Route component rendering
- Loader function execution

### `test-utils.tsx`
Provides utilities for testing TanStack Router components with proper context setup, including memory history.

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

```bash
# Run all tests
pnpm test

# Run tests with UI
pnpm test:ui

# Run tests once (CI mode)
pnpm test:run
```

## Best Practices

1. **Mock External Dependencies**: Always mock API calls, external libraries, and complex components
2. **Use Test IDs**: Prefer `data-testid` attributes for reliable element selection
3. **Test Behavior, Not Implementation**: Focus on what users see and do
4. **Keep Tests Simple**: Each test should verify one specific behavior
5. **Proper Cleanup**: Use `beforeEach` to reset mocks between tests

## Future Enhancements

- **Integration Tests**: Test complete user flows with real router navigation
- **API Mocking**: Use MSW (Mock Service Worker) for more realistic API testing
- **Visual Regression**: Add screenshot testing for UI components
- **Performance Testing**: Monitor component render times and memory usage

## Troubleshooting

### Common Issues

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