// The Stripe webhook handler — the money path's sole grantor. Kept router-free (a plain
// request→response function) so the boundary is unit-testable without the router; the app wires it
// into a route in src/routes/api/stripe-webhook.ts.
//
// The route that calls this is imported *eagerly* by the generated routeTree at server boot, which
// is exactly why stripe.server.ts is lazy: nothing here reads env or constructs Stripe until a real
// request lands, so a flag-off / no-Stripe-env boot can't crash on it.
import Stripe from 'stripe'
import { getStripe, getStripeWebhookSecret } from '~stzUser/lib/stripe.server'
import { isDevRuntime } from '~stzUser/lib/env'
import {
  grantPurchaseCredits,
  notifyStripeFulfillmentFailure,
  StripeFulfillmentError,
} from '~stzUser/lib/wallet.logic'

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

/**
 * Verify, filter, and fulfil a Stripe webhook.
 *
 * The one rule the whole 3-way posture exists to guarantee (research §3.8): **no path returns 200
 * without either granting or alerting.** A silent 200 deletes the event from Stripe's retry queue
 * and loses the money — the #1 self-inflicted webhook wound.
 *   - bad signature                 → 400 (forged/malformed; Stripe should not retry, and won't)
 *   - signed but unparseable JSON    → 400 (terminal — retrying can't fix malformed bytes)
 *   - verification unavailable       → 500 (secret unset / init failure — our config, so let Stripe retry)
 *   - not `payment_intent.succeeded` → 200 no-op (the load-bearing single-event-type filter, Correction 10)
 *   - permanent fulfilment failure   → alert + 200 (retrying can't help; stop the storm, but never silently)
 *   - transient failure              → 500 (DB write-lock etc.; let Stripe redeliver)
 */
export async function handleStripeWebhook(request: Request): Promise<Response> {
  // Raw body BEFORE any parse — signature verification is over the exact received bytes.
  const rawBody = await request.text()
  const signature = request.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event
  try {
    // Getters called INSIDE the handler (never at import) so a flag-off boot never constructs Stripe.
    event = getStripe().webhooks.constructEvent(rawBody, signature, getStripeWebhookSecret())
  } catch (err) {
    if (err instanceof Stripe.errors.StripeSignatureVerificationError) {
      // Genuine signature mismatch — forged or malformed. 400: Stripe should not retry this.
      // Dev-only guidance: locally this almost always means a stale/mismatched secret, which is
      // otherwise silent (this returns 400 without logging). Response is unchanged.
      if (isDevRuntime()) {
        console.warn('⚠️ Stripe webhook signature verification failed — STRIPE_WEBHOOK_SECRET likely does not match your current `stripe listen` session. Restart with `pnpm dev` to wire a fresh secret automatically, or run `stripe listen --print-secret` and update .env.development. See README → "Testing Stripe purchases locally".')
      }
      return json({ error: 'invalid signature' }, 400)
    }
    if (err instanceof SyntaxError) {
      // constructEvent verifies the signature BEFORE JSON.parse, so a SyntaxError here means the body
      // was validly signed but unparseable — terminal, retrying can't fix malformed JSON. 400, not 500.
      return json({ error: 'invalid payload' }, 400)
    }
    // Secret unset or SDK init failure — our misconfiguration, not the caller's. 500 so the event
    // stays in Stripe's retry queue and succeeds once config is fixed. Must NOT be a terminal 400.
    if (isDevRuntime()) {
      console.warn('⚠️ Stripe webhook could not be verified — STRIPE_WEBHOOK_SECRET may be unset, or the Stripe SDK failed to initialise. Use `pnpm dev` to wire the secret, or see README → "Testing Stripe purchases locally".')
    }
    return json({ error: 'verification unavailable' }, 500)
  }

  // Single-event-type filter — load-bearing (Correction 10). One PaymentIntent emits many events
  // sharing one PI id (created / processing / succeeded / charge.*); dedup on the PI id is safe ONLY
  // because exactly one event type ever writes a grant row. Never grant from a second type.
  if (event.type !== 'payment_intent.succeeded') {
    return json({ received: true, ignored: event.type }, 200)
  }

  const paymentIntent = event.data.object as Stripe.PaymentIntent

  try {
    await grantPurchaseCredits(paymentIntent)
    return json({ received: true }, 200)
  } catch (err) {
    if (err instanceof StripeFulfillmentError && err.permanent) {
      // Permanent: retrying can't fix it (bad metadata, amount/currency mismatch, vanished user).
      // Alert loudly, then 200 to stop the retry storm — but never a bare 200 without the alert.
      await notifyStripeFulfillmentFailure({
        reason: err.message,
        eventId: event.id,
        paymentIntentId: paymentIntent.id,
        userId: paymentIntent.metadata?.userId,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        metadata: paymentIntent.metadata ?? undefined,
      })
      return json({ received: true, fulfillment: 'permanent-failure' }, 200)
    }
    // Transient (DB unreachable, libSQL write-lock/timeout — our likely real case). 500 so Stripe
    // redelivers. Deliberately NOT swallowed into a 200.
    return json({ error: 'transient failure' }, 500)
  }
}
