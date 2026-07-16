// src/router.tsx
import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { QueryClient } from '@tanstack/react-query'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import { routeTree } from './routeTree.gen'

// Alias required by TanStack Start virtual module resolution (1.168+)
export const getRouter = () => createRouter()

export function createRouter() {
  // TanStack Start calls this factory from a request-local router getter on the
  // server. Keep the QueryClient here so caches can never cross SSR requests.
  const queryClient = new QueryClient()
  const router = createTanStackRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
  })

  setupRouterSsrQueryIntegration({ router, queryClient })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createRouter>
  }
}
