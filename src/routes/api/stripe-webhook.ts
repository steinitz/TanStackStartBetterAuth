// Thin route adapter for the Stripe webhook. All logic lives in the router-free, unit-tested
// handler (stzUser/lib/stripe-webhook.ts); this file only binds it to POST /api/stripe-webhook.
import { createFileRoute } from '@tanstack/react-router'
import { handleStripeWebhook } from '~stzUser/lib/stripe-webhook'

export const Route = createFileRoute('/api/stripe-webhook')({
  server: {
    handlers: {
      POST: async ({ request }) => handleStripeWebhook(request),
    },
  },
})
