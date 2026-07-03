/**
 * @vitest-environment node
 *
 * Step 0 gate: stripe.server.ts must be lazy so the eager route-tree import can't crash a
 * flag-off, no-Stripe-env boot (Correction 11). The load-bearing assertions:
 *   - importing the module reads no env and constructs no Stripe (no throw at import)
 *   - the getters throw only when CALLED with their keys missing
 */
import { describe, it, expect, beforeEach } from 'vitest'

describe.sequential('stripe.server (lazy init — boot safety)', () => {
  beforeEach(() => {
    delete process.env.STRIPE_SECRET_KEY
    delete process.env.STRIPE_WEBHOOK_SECRET
  })

  it('imports without throwing when Stripe env is absent (boot-safe)', async () => {
    await expect(import('~stzUser/lib/stripe.server')).resolves.toBeDefined()
  })

  it('getStripe() throws only when called with STRIPE_SECRET_KEY missing', async () => {
    const { getStripe } = await import('~stzUser/lib/stripe.server')
    expect(() => getStripe()).toThrow()
  })

  it('getStripeWebhookSecret() throws when STRIPE_WEBHOOK_SECRET missing', async () => {
    const { getStripeWebhookSecret } = await import('~stzUser/lib/stripe.server')
    expect(() => getStripeWebhookSecret()).toThrow()
  })

  it('getStripe() returns one memoized instance once the key is present', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_dummy_key_for_construction_only'
    const { getStripe } = await import('~stzUser/lib/stripe.server')
    const a = getStripe()
    const b = getStripe()
    expect(a).toBe(b)
  })
})
