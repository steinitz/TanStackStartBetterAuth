// Embedded Stripe Payment Element + dual-path completion (Step 4).
//
// Trust boundary — the load-bearing rule of this whole file: credits are NEVER granted on the
// client. The client only (a) asks the server to price + create a PaymentIntent (quantity in,
// clientSecret out — the server is the sole price authority), (b) collects card details in Stripe's
// iframe, (c) confirms, and then (d) POLLS the server for a grant that only the webhook can make.
// Nothing here writes a balance; a tampered client can at worst lie to itself about a pending state.
//
// Client-bundle note: this module is imported by the credits route (client), so it must pull only
// the BROWSER Stripe packages (@stripe/stripe-js, @stripe/react-stripe-js) — never the Node `stripe`
// SDK. The server SDK is reached only through the createStripePaymentIntent server fn, whose handler
// dynamic-imports it (Codex Step-3 P2). Keep it that way; verify with a client-bundle grep after build.
//
// No useEffect for user actions (architecture/BanningUseEffect.md): create → confirm → poll all run
// inside click handlers (Rule 3). The single mount-once effect is the SCA-return resume — a genuine
// external-system sync on mount (Rule 4), and its component is only rendered by the parent when the
// return search params are present.
import { loadStripe, type Appearance, type Stripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { useState, type ReactNode } from 'react'
import { clientEnv } from '~stzUser/lib/env'
import { createStripePaymentIntent, checkPurchase } from '~stzUser/lib/wallet'
import { useGoBack } from '~stzUser/lib/useGoBack'
import { ContactLink } from '~stzUser/components/Legal/Links'
import { creditsStrings } from '~stzUser/components/RouteComponents/Credits'
import { isDarkMode } from '~stzUtils/components/styles'
import { AppleButtonGroup } from '~stzUtils/components/AppleButtonGroup'

// Provisioning poll cadence (plan Step 4): the webhook normally lands in 1–3s; poll gently, cap at
// 20s, and treat a timeout as reassuring (the charge succeeded — only the grant is lagging), never
// an error.
const POLL_INTERVAL_MS = 1500
const POLL_TIMEOUT_MS = 20_000

// loadStripe must run once, lazily, and client-side only. Module-level memo so re-renders and both
// entry components (PaymentForm, StripeReturnHandler) share one instance.
let stripePromise: Promise<Stripe | null> | null = null
function getStripePromise(): Promise<Stripe | null> {
  if (!stripePromise) stripePromise = loadStripe(clientEnv.STRIPE_PUBLISHABLE_KEY ?? '')
  return stripePromise
}

// Theme-aware Appearance, read from the real mvp.css theme vars once at mount (plan §2.3–2.4) so the
// Payment Element matches light/dark without hardcoded hex. Only defined vars are passed; Stripe
// falls back to its own defaults for the rest.
function readStripeAppearance(): Appearance {
  if (typeof window === 'undefined') return { theme: 'stripe' }
  const cs = getComputedStyle(document.documentElement)
  const map: Record<string, string> = {
    colorPrimary: '--color-text',
    colorBackground: '--color-bg',
    colorText: '--color-text',
    colorDanger: '--color-error',
  }
  const variables: Record<string, string> = {}
  for (const [stripeVar, cssVar] of Object.entries(map)) {
    const value = cs.getPropertyValue(cssVar).trim()
    if (value) variables[stripeVar] = value
  }
  const dark = isDarkMode()
  return { theme: dark ? 'night' : 'stripe', variables: variables as Appearance['variables'] }
}

// Poll the server until the webhook has granted this purchase, or the cap elapses. checkPurchase is
// user-scoped server-side, so this can only ever read the caller's own grant status.
async function pollForGrant(paymentIntentId: string): Promise<{ granted: boolean; amount?: number }> {
  const deadline = Date.now() + POLL_TIMEOUT_MS
  while (Date.now() < deadline) {
    const result = await checkPurchase({ data: { paymentIntentId } })
    if (result.granted) return result
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
  }
  return { granted: false }
}

// The absolute return_url Stripe redirects to after an SCA/redirect payment. Must be absolute (Stripe
// requires it) and is mandatory even under redirect:'if_required'. Stripe appends
// payment_intent_client_secret + redirect_status to it on return.
function stripeReturnUrl(): string {
  return new URL('/auth/credits?stripe_return=1', window.location.origin).toString()
}

// ── Shared provisioning / result view ────────────────────────────────────────────────────────────
// Both completion paths (inline and SCA-return) converge on this identical provisional UI.
type Provisional =
  | { name: 'provisioning' }
  | { name: 'granted'; amount?: number }
  | { name: 'timeout' }
  | { name: 'failed'; message: string }

function ProvisionalView({ state }: { state: Provisional }) {
  const goBack = useGoBack()

  // Provisioning is in progress — no escape button, just the reassuring message.
  if (state.name === 'provisioning') {
    return <p style={{ margin: 0 }}>{creditsStrings.provisioning}</p>
  }

  // Every terminal state ends with a right-justified Exit so the user is never stranded
  // (the page's own Exit link sits below a long ledger and is effectively never seen). States
  // that may warrant support pass a leading node — it sits at the left, a calm standing offer
  // rather than an alarm bolted to the error text (which invited a ticket for every mistyped amount).
  const exitRow = (leading?: ReactNode) => (
    <div style={{ display: 'flex', justifyContent: leading ? 'space-between' : 'flex-end',
                 alignItems: 'center', marginTop: '1rem' }}>
      {leading}
      <button onClick={goBack}>Exit</button>
    </div>
  )

  switch (state.name) {
    case 'granted':
      return (
        <>
          <p style={{ margin: 0, color: 'var(--color-text)' }}>
            Success — {state.amount ? <strong>{state.amount} credits</strong> : 'your credits'} have been added.
          </p>
          {exitRow()}
        </>
      )
    case 'timeout':
      return (
        <>
          <p style={{ margin: 0 }}>
            Payment received — your credits are being added and will appear shortly.
          </p>
          {exitRow(<ContactLink />)}
        </>
      )
    case 'failed':
      return (
        <>
          <p style={{ margin: 0, color: 'var(--color-error)' }}>{state.message}</p>
          {exitRow(<ContactLink />)}
        </>
      )
  }
}

// ── Inner card form (must live inside <Elements> to use the Stripe hooks) ─────────────────────────
function CheckoutForm({
  amountLabel,
  onPaid,
  onCancel,
}: {
  amountLabel: string
  onPaid: (paymentIntentId: string) => void
  onCancel: () => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return // Stripe.js still loading
    setSubmitting(true)
    setError(null)

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
      confirmParams: { return_url: stripeReturnUrl() },
    })

    if (confirmError) {
      // Card declined, validation, etc. The user can correct and retry with the same Element.
      setError(confirmError.message ?? 'Payment could not be completed.')
      setSubmitting(false)
      return
    }
    // Reached only on the inline (no-redirect) path; SCA payments leave via return_url instead.
    if (paymentIntent) onPaid(paymentIntent.id)
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <PaymentElement />
      {error && <p style={{ margin: 0, color: 'var(--color-error)' }}>{error}</p>}
      <AppleButtonGroup
        alternativeButton={{
          label: 'Cancel',
          onClick: onCancel,
          disabled: submitting,
        }}
        defaultButton={{
          label: submitting ? 'Processing…' : `Pay ${amountLabel}`,
          type: 'submit',
          disabled: !stripe || submitting,
        }}
      />
    </form>
  )
}

// ── Entry point: quantity → create intent → collect card → provision ──────────────────────────────
type Phase =
  | { name: 'idle' }
  | { name: 'creating' }
  | { name: 'collecting'; clientSecret: string; appearance: Appearance }
  | Provisional

export function PaymentForm({ onCreditsGranted }: { onCreditsGranted?: () => void }) {
  const [creditsRequested, setCreditsRequested] = useState<number | ''>(clientEnv.DEFAULT_CREDITS_PURCHASE)
  const [phase, setPhase] = useState<Phase>({ name: 'idle' })
  const goBack = useGoBack()

  if (!clientEnv.STRIPE_PUBLISHABLE_KEY) {
    return <p>Card payments are momentarily unavailable.</p>
  }

  const amount = Number(creditsRequested || 0)
  const totalCost = (amount * clientEnv.CREDIT_PRICE_AUD).toFixed(2)
  const belowMin = !creditsRequested || amount < clientEnv.MIN_CREDITS_PURCHASE

  const handleCreateIntent = async () => {
    setPhase({ name: 'creating' })
    try {
      const { clientSecret } = await createStripePaymentIntent({
        data: { creditsRequested: amount, idempotencyKey: crypto.randomUUID() },
      })
      setPhase({ name: 'collecting', clientSecret, appearance: readStripeAppearance() })
    } catch (err: any) {
      setPhase({ name: 'failed', message: err?.message ?? 'Could not start the payment.' })
    }
  }

  // Inline completion: poll for the webhook grant from the click-driven handler (no effect). A poll
  // error is not a payment failure — the charge already succeeded — so it falls to the reassuring
  // timeout state, never an error.
  const handlePaid = async (paymentIntentId: string) => {
    setPhase({ name: 'provisioning' })
    try {
      const result = await pollForGrant(paymentIntentId)
      if (result.granted) {
        setPhase({ name: 'granted', amount: result.amount })
        onCreditsGranted?.()
        return
      }
    } catch {
      // fall through to timeout
    }
    setPhase({ name: 'timeout' })
  }

  if (phase.name === 'collecting') {
    return (
      <Elements stripe={getStripePromise()} options={{ clientSecret: phase.clientSecret, appearance: phase.appearance }}>
        <CheckoutForm
          amountLabel={`AUD$${totalCost}`}
          onPaid={handlePaid}
          onCancel={() => setPhase({ name: 'idle' })}
        />
      </Elements>
    )
  }

  if (phase.name === 'provisioning' || phase.name === 'granted' || phase.name === 'timeout' || phase.name === 'failed') {
    return <ProvisionalView state={phase} />
  }

  // idle / creating: the quantity form (mirrors the bank-transfer branch's layout).
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <p>
        Purchase credits by card (AUD${clientEnv.CREDIT_PRICE_AUD.toFixed(3)} per credit).
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', margin: 0, lineHeight: 'normal' }}>
          Credits:
          <input
            type="number"
            min={clientEnv.MIN_CREDITS_PURCHASE}
            value={creditsRequested}
            onChange={(e) => setCreditsRequested(e.target.value === '' ? '' : Number(e.target.value))}
            style={{ width: '3.5rem', minWidth: 0, margin: 0, textAlign: 'right' }}
          />
        </label>

        <span>
          Total Cost: AUD${totalCost}
        </span>
      </div>

      <AppleButtonGroup
        alternativeButton={{
          // Always enabled: no charge exists yet at the quantity step, so the escape is never trapped
          // (unlike the card step, where a payment may be in flight).
          label: 'Cancel',
          onClick: goBack,
        }}
        defaultButton={{
          label: phase.name === 'creating' ? creditsStrings.startingPayment : creditsStrings.payWithCard,
          onClick: handleCreateIntent,
          disabled: phase.name === 'creating' || belowMin,
        }}
      />
    </div>
  )
}

// ── SCA-return entry point ────────────────────────────────────────────────────────────────────────
// Rendered by the credits route ONLY when it lands with ?stripe_return=1. On mount it reads the
// client secret Stripe put on the return URL, retrieves the intent to learn the outcome, then
// converges on the same provisioning poll. The single useEffect here is the sanctioned mount-once
// external sync (Rule 4); it has no reactive deps, so there is no dependency-array coupling.
import { useEffect } from 'react'

export function StripeReturnHandler({
  clientSecret,
  onCreditsGranted,
  onHandled,
}: {
  clientSecret: string | undefined
  onCreditsGranted?: () => void
  onHandled?: () => void
}) {
  const [state, setState] = useState<Provisional>({ name: 'provisioning' })

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      // Clear the Stripe params from the URL immediately (belt-and-suspenders; the browser default
      // Referrer-Policy already withholds them cross-origin). The grant is webhook-only, so the secret
      // in the URL cannot move credits regardless.
      onHandled?.()

      if (!clientSecret) {
        setState({ name: 'failed', message: 'Missing payment reference on return.' })
        return
      }
      const stripe = await getStripePromise()
      if (!stripe) {
        setState({ name: 'failed', message: 'Payment library unavailable.' })
        return
      }
      const { paymentIntent, error } = await stripe.retrievePaymentIntent(clientSecret)
      if (cancelled) return
      if (error || !paymentIntent) {
        setState({ name: 'failed', message: error?.message ?? 'Could not confirm the payment.' })
        return
      }
      if (paymentIntent.status !== 'succeeded' && paymentIntent.status !== 'processing') {
        setState({ name: 'failed', message: 'Payment was not completed.' })
        return
      }
      // A poll error here is not a payment failure (the charge already succeeded) → reassuring timeout.
      let result: { granted: boolean; amount?: number } = { granted: false }
      try {
        result = await pollForGrant(paymentIntent.id)
      } catch {
        /* fall through to timeout */
      }
      if (cancelled) return
      if (result.granted) {
        setState({ name: 'granted', amount: result.amount })
        onCreditsGranted?.()
      } else {
        setState({ name: 'timeout' })
      }
    }
    void run()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <ProvisionalView state={state} />
}
