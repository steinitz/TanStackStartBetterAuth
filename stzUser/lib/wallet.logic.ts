import { db } from '~stzUser/lib/database'
import { clientEnv } from '~stzUser/lib/env'
import { logWithThrottledNotification } from '~stzUser/lib/logToServer'

export type WalletStatus = {
  credits: number
  welcomeClaimed: boolean
}

/**
 * A Stripe fulfillment failure the webhook must handle *deliberately*.
 *
 * `permanent: true`  — the event will never succeed on retry (bad/missing metadata, the money
 *                      Stripe collected doesn't match what we stamped, or the user vanished).
 *                      The webhook alerts and returns 200 to stop Stripe's retry storm.
 * `permanent: false` — reserved for a caller that wants to signal "transient, retry me" via this
 *                      type; today transient failures are raw throws (DB errors) → webhook 500.
 *
 * The single load-bearing rule (research §3.8): no code path returns 200 without either granting
 * or alerting. This type is how the grant layer tells the HTTP layer which posture to take.
 */
export class StripeFulfillmentError extends Error {
  constructor(
    message: string,
    public readonly permanent: boolean,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'StripeFulfillmentError'
  }
}

/**
 * The subset of a Stripe PaymentIntent the grant path reads. Structural on purpose: the webhook
 * passes the real `event.data.object` (which satisfies this), and tests pass a plain object —
 * no need to mint a full `Stripe.PaymentIntent`, and the logic layer stays free of an SDK import.
 */
export type PurchasePaymentIntent = {
  id: string
  amount: number
  currency: string
  metadata: Record<string, string> | null | undefined
}

/**
 * The single source of truth for credits→AUD-cents pricing. Pure and rounded **exactly once** (F8):
 * create-time stamps this into `metadata.amountCents`, and the webhook then verifies the amount
 * Stripe actually collected equals that stamp (grantPurchaseCredits) rather than recomputing — so
 * create and grant can never diverge on the arithmetic even if `CREDIT_PRICE_AUD` changes between
 * them. Callers enforce the min/max floors; this only converts.
 */
export function computeStripeAmountCents(creditsRequested: number): number {
  return Math.round(creditsRequested * clientEnv.CREDIT_PRICE_AUD * 100)
}

const DAILY_ALLOWANCE = clientEnv.DAILY_GRANT_CREDITS

/**
 * Logic: Fetches wallet status for a specific user.
 * This also triggers the daily grant if it hasn't been applied yet.
 * This also triggers the daily grant if it hasn't been applied yet for the user's LOCAL day.
 */
export async function getWalletStatusInternal(userId: string, timezoneOffset = 0) {
  // 1. Ensure daily allowance is applied (lazy grant) with time-zone awareness
  await applyDailyGrant(userId, timezoneOffset)

  // 2. Simply fetch credits from user record
  const user = await db
    .selectFrom('user')
    .select(['credits', 'welcome_claimed'])
    .where('id', '=', userId)
    .executeTakeFirst()

  return {
    credits: Number(user?.credits || 0),
    welcomeClaimed: Boolean(user?.welcome_claimed),
  }
}
/**
 * Logic: Ensures a user receives their daily credit grant.
 * Wrapped in a transaction to prevent race conditions (double grants).
 */
/**
 * Logic: Ensures a user receives their daily credit grant.
 * Wrapped in a transaction to prevent race conditions (double grants).
 *
 * @param timezoneOffset - Offset in milliseconds from UTC (e.g. +11h = +39600000)
 */
export async function applyDailyGrant(userId: string, timezoneOffset: number = 0) {
  // Calculate "Local Today"
  // Server Time (UTC) + Offset = Local Time
  // e.g. 23:00 UTC + 2h = 01:00 Local (Next Day)
  const serverNow = Date.now()
  const localNow = new Date(serverNow + timezoneOffset) // Fake date object representing local time
  const localToday = localNow.toISOString().split('T')[0] // 'YYYY-MM-DD'

  // FIX: We need to check if a grant occurred within the "Local Day" window converted to UTC.
  // 1. Determine Local Start of Day in UTC milliseconds.
  // Note: new Date('YYYY-MM-DD') returns UTC midnight.
  const localStartOfDayMs = new Date(localToday).getTime() - timezoneOffset
  // 2. Convert to ISO string for DB comparison
  const localStartOfDayUTC = new Date(localStartOfDayMs).toISOString()

  await db.transaction().execute(async (trx) => {
    // Re-check inside transaction for maximum safety
    const existingGrant = await trx
      .selectFrom('transactions')
      .select('id')
      .where('user_id', '=', userId)
      .where('type', '=', 'daily_grant')
      // 3. Check if any grant exists AFTER the start of the local day (in UTC)
      .where('created_at', '>=', localStartOfDayUTC)
      .executeTakeFirst()

    if (!existingGrant) {
      console.log(`🎁 Granting daily credits to user ${userId} for local date ${localToday}`)
      // Passing trx to ensure the grant happens in the same atomic block
      await grantCreditsTx(trx, userId, DAILY_ALLOWANCE, 'daily_grant', 'Daily credit grant')
    }
  })
}

/**
 * Logic: Consumes a resource (variable credits) for a specific user.
 */
export async function consumeResourceInternal(userId: string, resourceType: string, amount: number = 1) {
  // 1. Ensure daily allowance is applied (assume 0 offset for consumption side-effects unless we want to thread it through)
  // For safety, let's just default to server time (offset 0) for consumption triggers, 
  // or we could require it. For now, default 0 is safe (worst case they miss a grant until next load).
  await applyDailyGrant(userId, 0)

  // 2. Fetch current balance
  const status = await getWalletStatusInternal(userId)

  if (status.credits >= amount) {
    // 3. Consume credits
    const updateResult = await db.transaction().execute(async (trx) => {
      // Update user balance ONLY if they still have enough credits
      const res = await trx
        .updateTable('user')
        .set((eb) => ({
          credits: eb('credits', '-', amount),
        }))
        .where('id', '=', userId)
        .where('credits', '>=', amount) // Hard safeguard against negative balance
        .executeTakeFirst()

      // If update was successful, record the ledger entry
      if (Number(res.numUpdatedRows) > 0) {
        await trx
          .insertInto('transactions')
          .values({
            id: crypto.randomUUID(),
            user_id: userId,
            amount: -amount,
            type: 'consumption',
            description: `Resource consumption: ${resourceType} (${amount} credits)`,
            created_at: new Date().toISOString(),
          })
          .execute()
        return true
      }
      return false
    })

    if (updateResult) {
      return { success: true, message: `Consumed ${amount} credits` }
    }
  }

  return { success: false, message: 'Insufficient credits' }
}

/**
 * Logic: Grants credits to a specific user.
 * Updates both the ledger and the cached balance.
 */
export async function grantCreditsInternal(
  userId: string,
  amount: number,
  type: 'daily_grant' | 'purchase' | 'manual_adjustment',
  description: string
) {
  return await db.transaction().execute(async (trx) => {
    return await grantCreditsTx(trx, userId, amount, type, description)
  })
}

/**
 * Internal helper to grant credits using an existing transaction object.
 *
 * `stripePaymentIntentId` is the optional trailing param that turns this into the idempotent
 * purchase-grant path (Correction 8, backward compatible — the three existing callers pass five
 * args and behave exactly as before):
 *   - When supplied, the PI id doubles as the dedupe lock: the ledger insert targets the UNIQUE
 *     index and `ON CONFLICT DO NOTHING`, so a redelivered/replayed event inserts zero rows and
 *     returns `{ granted: false, duplicate: true }` *without* touching the balance again.
 *   - It also enables the vanished-user guard: if the balance update touches zero rows the account
 *     was deleted between PI creation and fulfillment, so we throw (rolling back the just-inserted
 *     ledger row — no orphan 'purchase' row) rather than silently succeeding (Correction 14).
 * Existing callers (no PI id) keep the `{ success: true }` shape; the purchase path speaks
 * `{ granted, duplicate }`.
 */
async function grantCreditsTx(
  trx: any,
  userId: string,
  amount: number,
  type: 'daily_grant' | 'purchase' | 'manual_adjustment',
  description: string,
  stripePaymentIntentId?: string
) {
  // 1. Add ledger entry.
  if (stripePaymentIntentId) {
    const inserted = await trx
      .insertInto('transactions')
      .values({
        id: crypto.randomUUID(),
        user_id: userId,
        amount: amount,
        type: type,
        description: description,
        created_at: new Date().toISOString(),
        stripe_payment_intent_id: stripePaymentIntentId,
      })
      .onConflict((oc: any) => oc.column('stripe_payment_intent_id').doNothing())
      .executeTakeFirst()

    // Zero rows inserted => this PaymentIntent was already fulfilled. The first grant already
    // bumped the balance; do not touch it again.
    if (Number(inserted?.numInsertedOrUpdatedRows ?? 0n) === 0) {
      return { granted: false, duplicate: true }
    }
  } else {
    await trx
      .insertInto('transactions')
      .values({
        id: crypto.randomUUID(),
        user_id: userId,
        amount: amount,
        type: type,
        description: description,
        created_at: new Date().toISOString(),
      })
      .execute()
  }

  // 2. Update user cached balance.
  const updated = await trx
    .updateTable('user')
    .set((eb: any) => ({
      credits: eb('credits', '+', amount),
    }))
    .where('id', '=', userId)
    .executeTakeFirst()

  // Vanished-user guard — Stripe grant path only (existing callers hold a live user).
  if (stripePaymentIntentId) {
    if (Number(updated?.numUpdatedRows ?? 0n) === 0) {
      throw new StripeFulfillmentError(
        'Balance update touched no rows — user no longer exists',
        true,
        { userId, stripePaymentIntentId },
      )
    }
    return { granted: true }
  }

  return { success: true }
}

/**
 * Logic: The sole-grantor purchase path the Stripe webhook calls on `payment_intent.succeeded`.
 *
 * Not for manual or admin grants — use `grantCreditsInternal(…, 'manual_adjustment')` for those.
 * This path writes `stripe_payment_intent_id` (the idempotency + reconciliation key) and exists
 * only to fulfil a real, succeeded Stripe PaymentIntent. Precondition: the caller guarantees the
 * intent has succeeded — the webhook's `payment_intent.succeeded` event-type filter is that
 * guarantee, so this function does not re-check `status`. A future direct caller outside that
 * filter (the deferred reconciliation job is the concrete case) has to re-establish the guarantee
 * itself, e.g. a `status === 'succeeded'` check here.
 *
 * Grants credits exactly once per PaymentIntent. All checks that must never grant are *permanent*
 * failures (thrown as `StripeFulfillmentError(..., true)`) — the webhook alerts + returns 200 on
 * these; any other throw (e.g. a DB write-lock) is transient → the webhook returns 500 for Stripe
 * to redeliver.
 *
 * Trust boundary: the server priced the intent at create time (Step 3) and stamped `amountCents`
 * and `currency` into metadata. Here we re-verify that Stripe actually collected that amount before
 * crediting — a guard against our *own* bugs / Dashboard edits / stale config, not a hostile client
 * (the client can't edit PI metadata through Stripe.js). We compare against the *stamped*
 * `metadata.amountCents`, never a recompute from `creditsRequested`: if the price changed between
 * quote and fulfillment, the stamped amount is what Stripe was told to collect and is the true
 * invariant (Correction 12).
 *
 * @returns `{ granted: true }` on a fresh grant, `{ granted: false, duplicate: true }` on a replay.
 */
export async function grantPurchaseCredits(paymentIntent: PurchasePaymentIntent) {
  const metadata = paymentIntent.metadata ?? {}
  const userId = metadata.userId
  const creditsRequested = Number(metadata.creditsRequested)
  const amountCents = Number(metadata.amountCents)

  const permanentFail = (reason: string) => {
    throw new StripeFulfillmentError(reason, true, {
      paymentIntentId: paymentIntent.id,
      userId: userId ?? null,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      metadata,
    })
  }

  // Metadata must be present and sane. Missing/garbage => permanent (retrying can't fix it).
  if (typeof userId !== 'string' || userId.length === 0) {
    permanentFail('PaymentIntent metadata missing userId')
  }
  if (!Number.isInteger(creditsRequested) || creditsRequested <= 0) {
    permanentFail('PaymentIntent metadata creditsRequested is not a positive integer')
  }
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    permanentFail('PaymentIntent metadata amountCents is not a positive integer')
  }

  // Verify the money Stripe collected matches what we stamped. Mismatch => permanent.
  if (paymentIntent.currency !== 'aud') {
    permanentFail(`PaymentIntent currency ${paymentIntent.currency} is not aud`)
  }
  if (paymentIntent.amount !== amountCents) {
    permanentFail(`PaymentIntent amount ${paymentIntent.amount} does not match stamped amountCents ${amountCents}`)
  }

  // One transaction: idempotent ledger insert + balance bump + vanished-user guard.
  return await db.transaction().execute(async (trx) => {
    return await grantCreditsTx(
      trx,
      userId as string,
      creditsRequested,
      'purchase',
      `Credit purchase (${creditsRequested} credits)`,
      paymentIntent.id,
    )
  })
}

/**
 * Alert-once helper for every permanent Stripe fulfillment failure (bad metadata, amount/currency
 * mismatch, vanished user). Structured log + best-effort email via the shared `logWithThrottledNotification` core (the
 * server-side notification rail; already stamps deployment + subject, so the log is the durable
 * record — no failure table in v1). It **catches its own failure** so the webhook's 200/500 posture
 * can never be
 * flipped by an alerting hiccup: if `SUPPORT_EMAIL_ADDRESS` is unset or the mail rail throws, we
 * still return, we don't propagate (Codex P2).
 */
export async function notifyStripeFulfillmentFailure(details: {
  reason: string
  eventId?: string
  paymentIntentId?: string
  userId?: string | null
  amount?: number | null
  currency?: string | null
  metadata?: Record<string, unknown>
}): Promise<void> {
  try {
    // No suppressNotification: this alert wants the email, which is the core's default.
    await logWithThrottledNotification({
      level: 'error',
      source: 'Server',
      message: `Stripe fulfillment failed: ${details.reason}`,
      context: {
        eventId: details.eventId,
        paymentIntentId: details.paymentIntentId,
        userId: details.userId,
        amount: details.amount,
        currency: details.currency,
        metadata: details.metadata,
      },
    })
  } catch (error) {
    // logWithThrottledNotification already swallows email-send errors; this guards everything else so alerting can
    // never change the webhook's response posture.
    console.error(`[notifyStripeFulfillmentFailure] alerting failed for "${details.reason}":`, error)
  }
}

/**
 * Logic: Fetches the transaction history for a specific user.
 */
/**
 * Logic: has the webhook already granted credits for this PaymentIntent? The UI's unambiguous
 * "did the grant land?" signal after a purchase, keyed on the same PI id the grant row carries.
 *
 * The `user_id` scope is load-bearing, not cosmetic: without it any authenticated user could poll
 * another user's PI id and learn `{ granted, amount }` — a cross-user leak. A caller only ever
 * checks its own purchase, so scoping to the session user closes it for free.
 */
export async function checkPurchaseInternal(userId: string, paymentIntentId: string) {
  const row = await db
    .selectFrom('transactions')
    .select('amount')
    .where('stripe_payment_intent_id', '=', paymentIntentId)
    .where('type', '=', 'purchase')
    .where('user_id', '=', userId)
    .executeTakeFirst()

  return row ? { granted: true, amount: row.amount } : { granted: false }
}

export async function getTransactionsInternal(userId: string) {
  return await db
    .selectFrom('transactions')
    .selectAll()
    .where('user_id', '=', userId)
    .orderBy('created_at', 'desc')
    .execute()
}

/**
 * Logic: Checks if a user has already claimed their one-time welcome grant.
 */
export async function hasClaimedWelcomeGrant(userId: string) {
  const user = await db
    .selectFrom('user')
    .select('welcome_claimed')
    .where('id', '=', userId)
    .executeTakeFirst()

  return Boolean(user?.welcome_claimed)
}

/**
 * Logic: Claims the one-time welcome grant for a user.
 */
export async function claimWelcomeGrantInternal(userId: string) {
  return await db.transaction().execute(async (trx) => {
    // 1. Re-check claimed status inside transaction for safety
    const user = await trx
      .selectFrom('user')
      .select('welcome_claimed')
      .where('id', '=', userId)
      .executeTakeFirst()

    if (user?.welcome_claimed) {
      return { success: false, message: 'Welcome grant already claimed.' }
    }

    // 2. Grant credits (this updates both user balance and transaction ledger)
    await grantCreditsTx(trx, userId, clientEnv.WELCOME_GRANT_CREDITS, 'manual_adjustment', 'One-time Welcome Grant')

    // 3. Mark as claimed
    await trx
      .updateTable('user')
      .set({ welcome_claimed: 1 })
      .where('id', '=', userId)
      .execute()

    return { success: true }
  })
}
