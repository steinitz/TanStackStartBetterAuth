// @vitest-environment node
//
// Step 3 MANUAL GATE — proves createPaymentIntentForUser makes a real Stripe TEST call.
//
// This is NOT a unit test. It reaches out to the live Stripe TEST API and mints a real
// (test-mode) PaymentIntent, so it must never run in CI or the normal suite. It is gated on
// STRIPE_MANUAL=1 and skips otherwise (`it.runIf`), the same "committed but inert" posture as
// ManualWebhookTests.md. Run it by hand when you want to confirm the create path end-to-end:
//
//   cd <upstream root>
//   STRIPE_MANUAL=1 CI=true ./node_modules/.bin/vitest run stzUser/test/manual/stripe-create.test.ts
//
// It prints the returned clientSecret and the parsed PaymentIntent id; then confirm that intent
// appears in the Stripe TEST dashboard (Payments → search the pi_… id). Requires a sk_test_… key
// in .env.development (loaded in the test body below).
//
// Why the mock instead of just setting env: clientEnv is a frozen snapshot computed once, the
// first time env.ts is imported — and a vitest setup file imports it before this test runs, so
// setting process.env + vi.resetModules() does NOT recompute it (env.ts is cached as a server
// external). So we mock env.ts to force the flag on and pin dev pricing, while keeping the real
// getEnvVar so getStripe() still reads the real sk_test_… key from process.env (loaded below).
import { describe, it, expect, vi } from 'vitest'
import * as dotenv from 'dotenv'
import { randomUUID } from 'node:crypto'

vi.mock('../../lib/env', async (importActual) => {
  const actual = await importActual<typeof import('../../lib/env')>()
  return {
    ...actual, // keep the real getEnvVar/getOptionalEnvVar — they read process.env at call time
    clientEnv: {
      ...actual.clientEnv,
      IS_STRIPE_ENABLED: true, // force the master kill-switch on for this manual run
      MIN_CREDITS_PURCHASE: 10, // pin the guards deterministically, independent of .env.test
      CREDIT_PRICE_AUD: 0.001, // 5000 credits → $5.00 AUD → 500 cents, safely above the min floor
    },
  }
})

describe('manual: Stripe create-intent gate', () => {
  it.runIf(process.env.STRIPE_MANUAL === '1')(
    'mints a real TEST PaymentIntent and returns a client secret',
    async () => {
      // Populate process.env with the dev sk_test_… key so getStripe() can construct the client.
      dotenv.config({ path: '.env.development', override: true })

      const { createPaymentIntentForUser } = await import('../../lib/stripe-purchase.server')

      const creditsRequested = 5000 // DEFAULT_CREDITS_PURCHASE; well above the min floors
      const { clientSecret } = await createPaymentIntentForUser('manual-gate-user', {
        creditsRequested,
        idempotencyKey: randomUUID(),
      })

      // client_secret is `pi_XXX_secret_YYY`; the searchable dashboard id is the `pi_…` prefix.
      const paymentIntentId = clientSecret.split('_secret')[0]
      console.log('\n✅ Stripe create path OK')
      console.log('   creditsRequested  :', creditsRequested)
      console.log('   PaymentIntent id  :', paymentIntentId, '(search this in the Stripe TEST dashboard)')
      console.log('   clientSecret      :', clientSecret, '\n')

      expect(clientSecret).toMatch(/^pi_/)
      expect(clientSecret).toContain('_secret')
    },
  )
})
