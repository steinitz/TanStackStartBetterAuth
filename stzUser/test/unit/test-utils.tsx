import React from 'react'
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'

type RenderOptions = {
  pathPattern: string
  initialEntry?: string
}

/**
 * Renders a component under a minimal TanStack Router instance (memory history).
 *
 * If `initialEntry` is omitted, it defaults to `pathPattern`.
 *
 * @param Component  The React component to mount.
 * @param opts       Render options.
 * @returns { router, queryClient, renderResult }
 */
export async function renderWithProviders(
  Component: React.ComponentType,
  { pathPattern, initialEntry = pathPattern }: RenderOptions,
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  })

  // Root route with minimal Outlet for rendering child routes
  const rootRoute = createRootRoute({
    component: () => (
      <>
        <div data-testid="root-layout"></div>
        <Outlet />
      </>
    ),
  })

  // Index route so '/' always matches
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <div>Index</div>,
  })

  // Test route mounting your Component at the dynamic path
  const testRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: pathPattern,
    component: () => <Component />,
  })

  // Create the router instance with memory history
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, testRoute]),
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
    defaultPendingMinMs: 0,
  })

  // Render and wait for the route to resolve and the component to mount
  const renderResult = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  await screen.findByTestId('root-layout')

  return { router, queryClient, renderResult }
}
