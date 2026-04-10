// src/routes/api/auth/$.ts
import { createFileRoute } from '@tanstack/react-router'
import { auth } from '~stzUser/lib/auth'

export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        return auth.handler(request)
      },
      POST: async ({ request }) => {
        return auth.handler(request)
      },
    },
  },
})
