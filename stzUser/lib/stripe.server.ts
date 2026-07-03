// Server-only Stripe client. The `.server` suffix marks that this module holds the
// secret key and must never reach the browser bundle.
//
// LAZY BY DESIGN — do not read env or construct `new Stripe(...)` at module scope.
// TanStack's generated routeTree.gen.ts imports every route module (API routes included)
// at server boot, so the webhook route — and this module with it — is evaluated at startup
// even when Stripe is off. getEnvVar returns '' for a missing key, and `new Stripe('')`
// throws immediately; a top-level instance would therefore crash a flag-off, no-Stripe-env
// boot before IS_STRIPE_ENABLED ever gets a vote. Keeping construction behind getters means
// the throw only fires when a Stripe operation is actually attempted.
import Stripe from 'stripe'
import { getEnvVar } from './env'

let stripeSingleton: Stripe | null = null

export function getStripe(): Stripe {
  if (!stripeSingleton) {
    // apiVersion intentionally omitted — inherit the SDK's pinned 2026-06-24.dahlia default.
    // If STRIPE_SECRET_KEY is unset, getEnvVar returns '' and this throws loudly (by design).
    stripeSingleton = new Stripe(getEnvVar('STRIPE_SECRET_KEY'))
  }
  return stripeSingleton
}

export function getStripeWebhookSecret(): string {
  const secret = getEnvVar('STRIPE_WEBHOOK_SECRET')
  if (!secret) {
    // Fail loudly rather than silently verifying against '' (every signature would 400).
    throw new Error('STRIPE_WEBHOOK_SECRET is not set — cannot verify Stripe webhook signatures')
  }
  return secret
}
