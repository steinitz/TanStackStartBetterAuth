/**
 * @vitest-environment node
 *
 * Step 3 gate (create side) — the server-priced PaymentIntent core, without the RPC/auth wrapper.
 * Two surfaces:
 *   - CreatePaymentIntentSchema: RUNTIME input validation (a TS annotation validates nothing), so
 *     NaN / Infinity / string / decimal / out-of-range credits and a malformed idempotencyKey are
 *     all rejected before any pricing happens.
 *   - createPaymentIntentForUser: the server is the sole price authority — it prices via
 *     computeStripeAmountCents, enforces both floors, stamps amountCents/currency into metadata
 *     (what the webhook verifies against, Correction 12), creates card-only (Correction 13), and
 *     namespaces the idempotency key to the user (Correction 9). Stripe is mocked; no live payment.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.hoisted runs BEFORE the (hoisted) imports, so clientEnv captures the flag on and a deterministic
// price. mockCreate is created here too so the vi.mock factory can reference it without a TDZ.
const { mockCreate } = vi.hoisted(() => {
  process.env.IS_STRIPE_ENABLED = 'true'
  process.env.CREDIT_PRICE_AUD = '0.001'
  process.env.MIN_CREDITS_PURCHASE = '10'
  return { mockCreate: vi.fn() }
})

vi.mock('~stzUser/lib/stripe.server', () => ({
  getStripe: () => ({ paymentIntents: { create: mockCreate } }),
  getStripeMinCents: () => 50,
}))

import { CreatePaymentIntentSchema } from '~stzUser/lib/wallet'
import { createPaymentIntentForUser } from '~stzUser/lib/stripe-purchase.server'
import * as v from 'valibot'

const VALID_UUID = '123e4567-e89b-42d3-a456-426614174000'

describe('CreatePaymentIntentSchema (runtime validation)', () => {
  const good = { creditsRequested: 1000, idempotencyKey: VALID_UUID }

  it('accepts a positive-integer quantity with a UUID key', () => {
    expect(() => v.parse(CreatePaymentIntentSchema, good)).not.toThrow()
  })

  it.each([
    ['NaN', NaN],
    ['Infinity', Infinity],
    ['a numeric string', '1000'],
    ['a decimal', 1.5],
    ['zero', 0],
    ['negative', -5],
    ['above the max', 10_000_001],
  ])('rejects creditsRequested = %s', (_label, creditsRequested) => {
    expect(() => v.parse(CreatePaymentIntentSchema, { ...good, creditsRequested })).toThrow()
  })

  it.each([
    ['not a uuid', 'double-click-1'],
    ['empty', ''],
    ['a number', 12345],
  ])('rejects idempotencyKey = %s', (_label, idempotencyKey) => {
    expect(() => v.parse(CreatePaymentIntentSchema, { ...good, idempotencyKey })).toThrow()
  })
})

describe('createPaymentIntentForUser (server-priced create core)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreate.mockResolvedValue({ client_secret: 'pi_secret_abc' })
  })

  it('prices server-side, stamps metadata, creates card-only, namespaces the key, returns only the secret', async () => {
    // 100000 credits @ 0.001 AUD = $100 = 10000 cents.
    const res = await createPaymentIntentForUser('user_1', { creditsRequested: 100000, idempotencyKey: VALID_UUID })

    expect(res).toEqual({ clientSecret: 'pi_secret_abc' })
    expect(mockCreate).toHaveBeenCalledTimes(1)

    const [params, options] = mockCreate.mock.calls[0]
    expect(params).toMatchObject({
      amount: 10000,
      currency: 'aud',
      payment_method_types: ['card'],
      metadata: {
        userId: 'user_1',
        creditsRequested: '100000',
        amountCents: '10000',
        currency: 'aud',
      },
    })
    // All metadata values are strings (Stripe requires it).
    for (const val of Object.values(params.metadata)) expect(typeof val).toBe('string')
    // Idempotency key namespaced to the user so a client can't replay another user's key.
    expect(options).toEqual({ idempotencyKey: `user_1-${VALID_UUID}` })
  })

  it('ignores any client-supplied price — amount comes only from creditsRequested', async () => {
    await createPaymentIntentForUser('user_1', {
      creditsRequested: 100000,
      idempotencyKey: VALID_UUID,
      // A hostile extra field must have no effect on the charged amount.
      amountCents: 1,
    } as any)

    expect(mockCreate.mock.calls[0][0]).toMatchObject({ amount: 10000, metadata: { amountCents: '10000' } })
  })

  it('rejects below the business minimum (MIN_CREDITS_PURCHASE) before pricing', async () => {
    await expect(
      createPaymentIntentForUser('user_1', { creditsRequested: 5, idempotencyKey: VALID_UUID }),
    ).rejects.toThrow(/Minimum purchase/)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('rejects when the priced amount is below the Stripe charge floor', async () => {
    // 100 credits @ 0.001 = 10 cents, above the business min (10 credits) but below the 50-cent Stripe floor.
    await expect(
      createPaymentIntentForUser('user_1', { creditsRequested: 100, idempotencyKey: VALID_UUID }),
    ).rejects.toThrow(/below Stripe's minimum/)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('throws when Stripe returns no client secret (server-side invariant)', async () => {
    mockCreate.mockResolvedValueOnce({ client_secret: null })
    await expect(
      createPaymentIntentForUser('user_1', { creditsRequested: 100000, idempotencyKey: VALID_UUID }),
    ).rejects.toThrow(/client secret/)
  })

  it('rejects when the Stripe flag is off (master kill-switch)', async () => {
    vi.resetModules()
    process.env.IS_STRIPE_ENABLED = 'false'
    const { createPaymentIntentForUser: gatedCreate } = await import('~stzUser/lib/stripe-purchase.server')

    await expect(
      gatedCreate('user_1', { creditsRequested: 100000, idempotencyKey: VALID_UUID }),
    ).rejects.toThrow(/not enabled/)

    process.env.IS_STRIPE_ENABLED = 'true'
  })
})
