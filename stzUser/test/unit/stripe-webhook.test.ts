/**
 * @vitest-environment node
 *
 * Step 2 Chunk B gate — the webhook HTTP boundary (verify / filter / dispatch / 3-way posture).
 * The grant layer is mocked (its logic is covered by stripe-grant.integration.test.ts); here we
 * prove the boundary's own contract with REAL signature crypto:
 *   - valid sig + payment_intent.succeeded → dispatches to grantPurchaseCredits, 200
 *   - bad signature → 400, never dispatches
 *   - other event type → 200 no-op, never dispatches (the load-bearing single-event-type filter)
 *   - webhook secret unset → 500 (config problem, retryable), never dispatches
 *   - permanent fulfilment failure → alert fired + 200 (never a silent 200)
 *   - transient failure → 500, no alert
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Stripe from 'stripe'

const WEBHOOK_SECRET = 'whsec_test_chunkB'

// Real secrets so the lazy getters + real constructEvent crypto work. A dummy sk is fine: constructEvent
// verifies against the webhook secret argument, not the API key.
process.env.STRIPE_SECRET_KEY = 'sk_test_dummy'
process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET

// Mock only the two grant-layer functions so this boundary test never grants for real or sends mail;
// keep the real StripeFulfillmentError (via importOriginal) so the handler's `instanceof … &&
// .permanent` branch runs against the genuine class. The async importOriginal form also avoids the
// vi.mock factory / CJS-interop TDZ that a plain factory hits here.
// (JetBrains "Move" won't rewrite this string path — repoint by hand. See memory: reference_jetbrains_vimock.)
vi.mock('~stzUser/lib/wallet.logic', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~stzUser/lib/wallet.logic')>()
  return {
    ...actual,
    grantPurchaseCredits: vi.fn(),
    notifyStripeFulfillmentFailure: vi.fn(),
  }
})

import { handleStripeWebhook } from '~stzUser/lib/stripe-webhook'
import { grantPurchaseCredits, notifyStripeFulfillmentFailure, StripeFulfillmentError } from '~stzUser/lib/wallet.logic'

const mockGrant = grantPurchaseCredits as unknown as ReturnType<typeof vi.fn>
const mockNotify = notifyStripeFulfillmentFailure as unknown as ReturnType<typeof vi.fn>

const stripe = new Stripe('sk_test_dummy')

const succeededPI = {
  id: 'pi_chunkB_1',
  object: 'payment_intent',
  amount: 500,
  currency: 'aud',
  status: 'succeeded',
  metadata: { userId: 'u1', creditsRequested: '10', amountCents: '500' },
}

const eventPayload = (type: string, object: unknown, id = 'evt_chunkB_1') =>
  JSON.stringify({ id, object: 'event', type, data: { object } })

const signedRequest = (payload: string, header?: string) =>
  new Request('http://localhost/api/stripe-webhook', {
    method: 'POST',
    body: payload,
    headers: {
      'stripe-signature': header ?? stripe.webhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET }),
    },
  })

describe('handleStripeWebhook (boundary)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET
    mockGrant.mockResolvedValue({ granted: true })
  })

  it('dispatches a valid payment_intent.succeeded to the grant path and returns 200', async () => {
    const payload = eventPayload('payment_intent.succeeded', succeededPI)
    const res = await handleStripeWebhook(signedRequest(payload))

    expect(res.status).toBe(200)
    expect(mockGrant).toHaveBeenCalledTimes(1)
    expect(mockGrant.mock.calls[0][0]).toMatchObject({ id: 'pi_chunkB_1', amount: 500, currency: 'aud' })
  })

  it('rejects a bad signature with 400 and never dispatches', async () => {
    const payload = eventPayload('payment_intent.succeeded', succeededPI)
    // A header generated for a DIFFERENT payload won't verify against this body.
    const wrongHeader = stripe.webhooks.generateTestHeaderString({ payload: 'tampered', secret: WEBHOOK_SECRET })
    const res = await handleStripeWebhook(signedRequest(payload, wrongHeader))

    expect(res.status).toBe(400)
    expect(mockGrant).not.toHaveBeenCalled()
  })

  it('rejects a validly-signed but unparseable payload with a terminal 400, never dispatches', async () => {
    // Real signature over malformed JSON: verifyHeader passes, JSON.parse throws SyntaxError. That is
    // terminal (retrying can't fix malformed bytes) so the posture is 400, not a retryable 500.
    const payload = '{'
    const res = await handleStripeWebhook(signedRequest(payload))

    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'invalid payload' })
    expect(mockGrant).not.toHaveBeenCalled()
  })

  it('acknowledges a non-succeeded event as a 200 no-op without dispatching (event-type filter)', async () => {
    const payload = eventPayload('payment_intent.created', { ...succeededPI, status: 'requires_payment_method' })
    const res = await handleStripeWebhook(signedRequest(payload))

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ ignored: 'payment_intent.created' })
    expect(mockGrant).not.toHaveBeenCalled()
  })

  it('returns 500 (not 400) when the webhook secret is unset, so Stripe retries after config is fixed', async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET
    const payload = eventPayload('payment_intent.succeeded', succeededPI)
    const res = await handleStripeWebhook(signedRequest(payload, 't=1,v1=deadbeef'))

    expect(res.status).toBe(500)
    expect(mockGrant).not.toHaveBeenCalled()
  })

  it('on a permanent fulfilment failure fires the alert and returns 200 (never a silent 200)', async () => {
    mockGrant.mockRejectedValueOnce(new StripeFulfillmentError('amount mismatch', true, { userId: 'u1' }))
    const payload = eventPayload('payment_intent.succeeded', succeededPI)
    const res = await handleStripeWebhook(signedRequest(payload))

    expect(res.status).toBe(200)
    expect(mockNotify).toHaveBeenCalledTimes(1)
    expect(mockNotify.mock.calls[0][0]).toMatchObject({
      reason: 'amount mismatch',
      eventId: 'evt_chunkB_1',
      paymentIntentId: 'pi_chunkB_1',
    })
  })

  it('on a transient failure returns 500 for redelivery and does not alert', async () => {
    mockGrant.mockRejectedValueOnce(new Error('database is locked'))
    const payload = eventPayload('payment_intent.succeeded', succeededPI)
    const res = await handleStripeWebhook(signedRequest(payload))

    expect(res.status).toBe(500)
    expect(mockNotify).not.toHaveBeenCalled()
  })
})
