import { createServerFn } from '@tanstack/react-start'
import * as v from 'valibot'
import { requireSessionUser } from './server-auth'
import { getWalletStatusInternal, consumeResourceInternal, grantCreditsInternal, type WalletStatus, getTransactionsInternal, claimWelcomeGrantInternal, checkPurchaseInternal } from './wallet.logic'
import { clientEnv } from './env'
import { sendEmail } from './mail-utilities'

// Defensive upper bound on a single purchase, independent of the Stripe cents ceiling. Generous —
// the real gate is the cents floor/ceiling in the create core — but it stops an absurd quantity here.
const MAX_CREDITS_PURCHASE = 10_000_000
// The client sends a per-attempt UUID (crypto.randomUUID) for double-click dedupe; we namespace it
// to the user before handing it to Stripe (keys are account-global). Shape-check it here.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Runtime validation, not just types: the client controls this payload, and a TypeScript annotation
// on `.inputValidator` validates nothing at run time (Codex P2). `v.integer` also rejects NaN and
// Infinity (Number.isInteger is false for both). The input is quantity-only — never a money amount
// (the server is the sole price authority; the `creditsRequested` name keeps that self-documenting).
// SDK-free (valibot only) so it stays client-safe — the Stripe-touching create core lives in
// stripe-purchase.server.ts and is reached only via a dynamic import inside the handler below.
export const CreatePaymentIntentSchema = v.object({
  creditsRequested: v.pipe(
    v.number('creditsRequested must be a number'),
    v.integer('creditsRequested must be a whole number'),
    v.minValue(1, 'creditsRequested must be positive'),
    v.maxValue(MAX_CREDITS_PURCHASE, 'creditsRequested exceeds the maximum'),
  ),
  idempotencyKey: v.pipe(
    v.string('idempotencyKey must be a string'),
    v.regex(UUID_RE, 'idempotencyKey must be a UUID'),
  ),
})

const CheckPurchaseSchema = v.object({
  paymentIntentId: v.pipe(v.string(), v.nonEmpty()),
})

export type { WalletStatus }
export type WalletTransaction = Awaited<ReturnType<typeof getTransactionsInternal>>[number]

/**
 * Server function to get the current user's wallet status.
 */
export const getWalletStatus = createServerFn({
  method: 'GET',
})
  .inputValidator((data?: number) => data) // Accepts optional timezone offset
  .handler(async ({ data: timezoneOffset }) => {
    const user = await requireSessionUser()

    // Pass offset to internal logic (defaults to 0 if undefined, but validator expects number)
    // Client should send 0 if unknown.
    return getWalletStatusInternal(user.id, timezoneOffset)
  })

/**
 * Server function to consume a resource for the current user.
 */
export const useConsumeResource = createServerFn({
  method: 'POST',
})
  .inputValidator((data: { resourceType: string; amount?: number }) => data)
  .handler(async ({ data }) => {
    const user = await requireSessionUser()

    return consumeResourceInternal(user.id, data.resourceType, data.amount ?? 1)
  })

/**
 * Server function to grant credits to a user (e.g., for testing).
 */
export const useGrantCredits = createServerFn({
  method: 'POST',
})
  .inputValidator((data: { amount: number; type?: 'manual_adjustment' | 'purchase'; description: string }) => data)
  .handler(async ({ data }) => {
    const user = await requireSessionUser()

    return grantCreditsInternal(
      user.id,
      data.amount,
      data.type || 'manual_adjustment',
      data.description
    )
  })

/**
 * Server function to get the current user's transaction history.
 */
export const getTransactions = createServerFn({
  method: 'GET',
}).handler(async () => {
  const user = await requireSessionUser()

  return getTransactionsInternal(user.id)
})

/**
 * Server function to claim the one-time welcome grant.
 */
export const claimWelcomeGrant = createServerFn({
  method: 'POST',
}).handler(async () => {
  const user = await requireSessionUser()

  return claimWelcomeGrantInternal(user.id)
})

/**
 * Server function to request a manual bank transfer purchase.
 */
export const requestBankTransfer = createServerFn({
  method: 'POST',
})
  .inputValidator((data: { amount: number }) => data)
  .handler(async ({ data }) => {
    const user = await requireSessionUser()

    if (data.amount < clientEnv.MIN_CREDITS_PURCHASE) {
      throw new Error(`Minimum purchase is ${clientEnv.MIN_CREDITS_PURCHASE} credits`)
    }

    const cost = (data.amount * clientEnv.CREDIT_PRICE_AUD).toFixed(2)

    // Notify developer
    await sendEmail({
      data: {
        to: clientEnv.SUPPORT_EMAIL_ADDRESS,
        from: clientEnv.SUPPORT_EMAIL_ADDRESS,
        subject: `💰 Credit Purchase Request: ${user.email}`,
        text: `User ${user.email} (ID: ${user.id}) has requested to purchase ${data.amount} credits for AUD$${cost} via bank transfer.`,
        html: `
          <h3>Credit Purchase Request</h3>
          <p><strong>User:</strong> ${user.email}</p>
          <p><strong>User ID:</strong> ${user.id}</p>
          <p><strong>Requested Credits:</strong> ${data.amount}</p>
          <p><strong>Total Cost:</strong> AUD$${cost}</p>
          <p>Please wait for payment verification before manually granting credits via the Admin panel.</p>
        `
      }
    })

    return { success: true }
  })

/**
 * Server function to create a Stripe PaymentIntent for the authenticated user. Quantity-only input;
 * the server prices it. Thin wrapper: runtime-validate → auth → delegate to createPaymentIntentForUser.
 */
export const createStripePaymentIntent = createServerFn({
  method: 'POST',
})
  .inputValidator((data: unknown) => v.parse(CreatePaymentIntentSchema, data))
  .handler(async ({ data }) => {
    const user = await requireSessionUser()
    // Dynamic import keeps the Node Stripe SDK out of the client bundle: wallet.ts is client-imported,
    // so a top-level import of the server-only create core would leak SDK code into the browser graph
    // (Codex Step-3 P2). Inside the handler it's a server-only async chunk.
    const { createPaymentIntentForUser } = await import('./stripe-purchase.server')

    return createPaymentIntentForUser(user.id, data)
  })

/**
 * Server function: has the webhook granted credits for this PaymentIntent yet? Scoped to the caller
 * (checkPurchaseInternal enforces user_id) so a user can only ever read their own purchase status.
 */
export const checkPurchase = createServerFn({
  method: 'GET',
})
  .inputValidator((data: unknown) => v.parse(CheckPurchaseSchema, data))
  .handler(async ({ data }) => {
    const user = await requireSessionUser()

    return checkPurchaseInternal(user.id, data.paymentIntentId)
  })
