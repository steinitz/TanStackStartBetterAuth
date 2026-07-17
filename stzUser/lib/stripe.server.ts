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
import { getEnvVar, getOptionalEnvVar } from './env'

let stripeSingleton: Stripe | null = null

export function getStripe(): Stripe {
  if (!stripeSingleton) {
    // apiVersion intentionally omitted — inherit the SDK's pinned 2026-06-24.dahlia default.
    // If STRIPE_SECRET_KEY is unset, getEnvVar returns '' and this throws loudly (by design).
    stripeSingleton = new Stripe(getEnvVar('STRIPE_SECRET_KEY'))
  }
  return stripeSingleton
}

const STRIPE_MIN_CENTS_DEFAULT = 50

/**
 * The minimum charge, in AUD cents, that Stripe will accept — used as the create-time floor so we
 * never mint an intent Stripe would reject. Server-only (never client-exposed). The 50-cent default
 * is confirmed correct — a live AUD$0.50 purchase succeeded and AUD$0.20 was rejected at stage (2026-07-17).
 *
 * A malformed env value must NOT silently disable the floor (Codex Step-3 P3): `Number('abc')` is
 * NaN, and `amountCents < NaN` is always false — the guard would vanish. So reject any non-positive-
 * integer value and fall back loudly to the safe default rather than let a typo remove the floor.
 */
export function getStripeMinCents(): number {
  const raw = getOptionalEnvVar('STRIPE_MIN_CENTS', String(STRIPE_MIN_CENTS_DEFAULT))
  const parsed = Number(raw)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    console.warn(`⚠️ STRIPE_MIN_CENTS is "${raw}" — not a positive integer; falling back to ${STRIPE_MIN_CENTS_DEFAULT}.`)
    return STRIPE_MIN_CENTS_DEFAULT
  }
  return parsed
}

export function getStripeWebhookSecret(): string {
  const secret = getEnvVar('STRIPE_WEBHOOK_SECRET')
  if (!secret) {
    // Fail loudly rather than silently verifying against '' (every signature would 400).
    throw new Error('STRIPE_WEBHOOK_SECRET is not set — cannot verify Stripe webhook signatures')
  }
  return secret
}
