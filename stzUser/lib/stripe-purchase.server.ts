// Server-only create-intent core. The `.server.ts` suffix marks it Node-only (architecture/Payments.md
// "Server Function Isolation"): it imports the Stripe SDK via stripe.server, so it must never enter a
// client bundle. wallet.ts is client-imported, so it reaches this module through a *dynamic* import
// inside the server-fn handler — never a top-level import — which keeps the SDK out of the browser
// graph (Codex Step-3 P2: a top-level import here previously leaked SDK code into the client main bundle).
import { getStripe, getStripeMinCents } from './stripe.server'
import { computeStripeAmountCents } from './wallet.logic'
import { assertValidPurchaseConfiguration, clientEnv } from './env'

// Stripe's hard per-charge ceiling in the smallest currency unit. A create request above this is
// rejected by Stripe, so we reject it first with a clear error.
const STRIPE_MAX_CENTS = 99_999_999

/**
 * The create-intent core, split from the server-fn wrapper so it is unit-testable without the RPC/auth
 * machinery (the wrapper adds only auth). The server is the sole price authority: it prices via
 * `computeStripeAmountCents`, stamps `amountCents`/`currency` into metadata (exactly what the webhook
 * verifies against, Correction 12), creates card-only for v1 (Correction 13), and namespaces the
 * idempotency key to the user so a client cannot replay another user's key (Correction 9). Returns
 * only the client secret.
 */
export async function createPaymentIntentForUser(
  userId: string,
  input: { creditsRequested: number; idempotencyKey: string },
) {
  if (!clientEnv.IS_STRIPE_ENABLED) throw new Error('Stripe payments are not enabled')

  // First, because every guard below it is a comparison, and a comparison against a NaN price or
  // minimum is false — so a missing money key would clear all three in a row and let Stripe be
  // the only thing that says no.
  assertValidPurchaseConfiguration()

  const { creditsRequested, idempotencyKey } = input

  if (creditsRequested < clientEnv.MIN_CREDITS_PURCHASE) {
    throw new Error(`Minimum purchase is ${clientEnv.MIN_CREDITS_PURCHASE} credits`)
  }

  const amountCents = computeStripeAmountCents(creditsRequested)

  const minCents = getStripeMinCents()
  if (amountCents < minCents) {
    // Name the figure — the user sees an AUD total on the form, so an AUD floor is the
    // actionable thing to compare it against, not a number they have to divine.
    throw new Error(`Purchase amount is below Stripe's minimum of AUD$${(minCents / 100).toFixed(2)}`)
  }
  if (amountCents > STRIPE_MAX_CENTS) {
    throw new Error('Purchase amount exceeds the maximum Stripe will charge')
  }

  const paymentIntent = await getStripe().paymentIntents.create(
    {
      amount: amountCents,
      currency: 'aud',
      payment_method_types: ['card'],
      metadata: {
        userId,
        creditsRequested: String(creditsRequested),
        amountCents: String(amountCents),
        currency: 'aud',
      },
    },
    { idempotencyKey: `${userId}-${idempotencyKey}` },
  )

  // client_secret is typed `string | null`. A normal create returns it, so null is a server-side
  // invariant failure — fail loudly here rather than hand the Payment Element a null and turn it into
  // an obscure client-side error (Codex Step-3 P3).
  if (!paymentIntent.client_secret) {
    throw new Error('Stripe did not return a client secret for the PaymentIntent')
  }

  return { clientSecret: paymentIntent.client_secret }
}
