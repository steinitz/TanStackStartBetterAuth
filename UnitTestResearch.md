# Unit Testing Research: Vitest with TanStack Router

## Overview
This document outlines the research findings for implementing unit tests using Vitest with TanStack Router, specifically focusing on component and route testing configurations.

## Key Findings

### Testing Setup

1. **Basic Test Configuration** <mcreference link="https://github.com/TanStack/router/discussions/604" index="1">1</mcreference>
```typescript
// utils.tsx - Test Utility Setup
import { Outlet, RouterProvider, createMemoryHistory, createRootRoute, createRoute, createRouter } from '@tanstack/react-router'
import { render } from '@testing-library/react'

function createTestRouter(component: () => JSX.Element) {
  const rootRoute = createRootRoute({
    component: Outlet,
  })
  
  const componentRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component,
  })

  const router = createRouter({
    routeTree: rootRoute.addChildren([componentRoute]),
    history: createMemoryHistory(),
  })

  return router
}

export function renderWithContext(component: () => JSX.Element) {
  const router = createTestRouter(component)
  return render(<RouterProvider router={router} />)
}
```

2. **Performance Considerations** <mcreference link="https://github.com/TanStack/router/discussions/655" index="2">2</mcreference>
- Test route tree generation has a performance impact:
  - ~2x slower for Jest
  - ~1.25x slower for Vitest
- Consider generating the route tree ahead of time for better performance

### Testing Components with Router Context

1. **Basic Component Test Example** <mcreference link="https://stackoverflow.com/questions/79019320/how-to-test-a-link-in-vitest-imported-from-tanstack-router" index="3">3</mcreference>
```typescript
test('Should render router component', () => {
  const rootRoute = createRootRoute()
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <Link to="/">Hello</Link>,
  })

  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute]),
    basepath: '/',
  })

  render(<RouterProvider router={router} />)
})
```

2. **Testing with TanStack Query Integration** <mcreference link="https://github.com/TanStack/router/discussions/655" index="4">4</mcreference>
```typescript
function renderRoute(route: string) {
  const testQueryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  const memoryHistory = createMemoryHistory({
    initialEntries: [route],
  })

  const router = createRouter({
    routeTree,
    context: {
      queryClient: testQueryClient,
    },
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    history: memoryHistory,
  })

  return render(
    <QueryClientProvider client={testQueryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
```

### Mocking Router Hooks

**Hook Mocking Example** <mcreference link="https://www.reddit.com/r/reactjs/comments/1bpfze1/how_can_i_test_tanstackrouter/" index="5">5</mcreference>
```typescript
const mockNavigate = vi.fn()

vi.mock("@tanstack/react-router", () => ({
  ...vi.requireActual("@tanstack/react-router"),
  useNavigate: () => mockNavigate,
}))
```

## Best Practices

1. **Test Setup**
   - Create reusable test utilities for router setup
   - Use memory history for route testing
   - Configure QueryClient with appropriate test settings

2. **Performance**
   - Generate route trees ahead of time when possible
   - Consider the performance impact in CI/CD pipelines

3. **Integration**
   - Properly integrate with TanStack Query when needed
   - Mock router hooks for isolated component testing

## Known Challenges

1. **Type Errors**
   - Some type mismatches may occur with RouterProvider when using certain configurations
   - Ensure proper type definitions for router context and state

2. **Testing Complex Scenarios**
   - Route transitions may require additional setup
   - Some hooks might need special handling for testing

## Recommendations

1. Use Vitest over Jest for better performance with TanStack Router
2. Create utility functions for common test scenarios
3. Implement proper mocking strategies for router hooks
4. Consider generating route trees ahead of time for performance
5. Maintain separate test configurations for router and query client