/**
 * @vitest-environment node
 *
 * Step 2 Chunk A gate — the idempotent purchase-grant logic core (no HTTP boundary yet).
 * Exercises `grantPurchaseCredits` against the real DB:
 *   - a fresh PaymentIntent grants exactly its credits and bumps the balance
 *   - the same PI id twice is a duplicate no-op (the second insert loses the UNIQUE race)
 *   - amount / currency mismatch is a permanent failure, no grant (Correction 12)
 *   - missing/garbage metadata is a permanent failure (§3.8)
 *   - a vanished user is a permanent failure that leaves NO orphan ledger row (Correction 14)
 *
 * PI ids carry a per-run token so a persisted test DB doesn't collide across runs.
 */
import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { db } from '~stzUser/lib/database'
import { grantPurchaseCredits, StripeFulfillmentError, type PurchasePaymentIntent } from '~stzUser/lib/wallet.logic'
import { auth } from '~stzUser/lib/auth'
import { ensureAdditionalTables } from '~stzUser/lib/migrations'
import { testConstants } from '~stzUser/test/constants'

describe.sequential('Stripe purchase grant (idempotent)', () => {
  const runId = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`
  let testUserId: string
  let piCounter = 0

  // A valid succeeded PaymentIntent for the current test user: 10 credits @ 500 AUD cents.
  const validPi = (overrides: Partial<PurchasePaymentIntent> = {}, metaOverrides: Record<string, string> = {}): PurchasePaymentIntent => ({
    id: `pi_grant_${runId}_${piCounter++}`,
    amount: 500,
    currency: 'aud',
    metadata: { userId: testUserId, creditsRequested: '10', amountCents: '500', ...metaOverrides },
    ...overrides,
  })

  const creditsOf = async (userId: string): Promise<number> => {
    const row = await db.selectFrom('user').select('credits').where('id', '=', userId).executeTakeFirst()
    return Number(row?.credits ?? 0)
  }

  const ledgerRowsForPi = async (piId: string) =>
    db.selectFrom('transactions').selectAll().where('stripe_payment_intent_id', '=', piId).execute()

  beforeAll(async () => {
    await ensureAdditionalTables()
  })

  beforeEach(async () => {
    const email = `stripe-grant-${runId}-${piCounter}-${Math.random()}@${testConstants.defaultUserDomain}`
    const res = await (auth.api as any).createUser({
      body: { email, password: testConstants.defaultPassword, name: 'Stripe Grant Tester', role: 'user' },
    })
    if (!res?.user) throw new Error('Failed to create test user')
    testUserId = res.user.id
  })

  it('grants exactly the requested credits on a fresh PaymentIntent', async () => {
    const pi = validPi()
    const before = await creditsOf(testUserId)

    const result = await grantPurchaseCredits(pi)

    expect(result).toEqual({ granted: true })
    expect(await creditsOf(testUserId)).toBe(before + 10)
    expect(await ledgerRowsForPi(pi.id)).toHaveLength(1)
  })

  it('is a duplicate no-op when the same PaymentIntent is replayed', async () => {
    const pi = validPi()
    const before = await creditsOf(testUserId)

    const first = await grantPurchaseCredits(pi)
    const afterFirst = await creditsOf(testUserId)
    const second = await grantPurchaseCredits(pi)

    expect(first).toEqual({ granted: true })
    expect(second).toEqual({ granted: false, duplicate: true })
    // Balance moved once, not twice; exactly one ledger row for the PI.
    expect(afterFirst).toBe(before + 10)
    expect(await creditsOf(testUserId)).toBe(before + 10)
    expect(await ledgerRowsForPi(pi.id)).toHaveLength(1)
  })

  it('permanently fails and does not grant when the collected amount mismatches the stamp', async () => {
    // Stripe collected 999 cents but metadata stamped 500 — our own bug / stale config guard.
    const pi = validPi({ amount: 999 })
    const before = await creditsOf(testUserId)

    await expect(grantPurchaseCredits(pi)).rejects.toMatchObject({ permanent: true })
    await expect(grantPurchaseCredits(pi)).rejects.toBeInstanceOf(StripeFulfillmentError)
    expect(await creditsOf(testUserId)).toBe(before)
    expect(await ledgerRowsForPi(pi.id)).toHaveLength(0)
  })

  it('permanently fails and does not grant on a non-AUD currency', async () => {
    const pi = validPi({ currency: 'usd' })
    const before = await creditsOf(testUserId)

    await expect(grantPurchaseCredits(pi)).rejects.toMatchObject({ permanent: true })
    expect(await creditsOf(testUserId)).toBe(before)
    expect(await ledgerRowsForPi(pi.id)).toHaveLength(0)
  })

  it('permanently fails on missing metadata (no userId)', async () => {
    const pi = validPi({ metadata: { creditsRequested: '10', amountCents: '500' } })
    await expect(grantPurchaseCredits(pi)).rejects.toBeInstanceOf(StripeFulfillmentError)
    await expect(grantPurchaseCredits(pi)).rejects.toMatchObject({ permanent: true })
  })

  it('permanently fails on garbage metadata (non-numeric creditsRequested)', async () => {
    const pi = validPi({}, { creditsRequested: 'lots' })
    await expect(grantPurchaseCredits(pi)).rejects.toMatchObject({ permanent: true })
  })

  it('permanently fails on a vanished user and leaves NO orphan ledger row', async () => {
    // Valid, self-consistent PI whose userId names an account that no longer exists.
    const pi = validPi({ metadata: { userId: `ghost-${runId}`, creditsRequested: '10', amountCents: '500' } })

    await expect(grantPurchaseCredits(pi)).rejects.toMatchObject({ permanent: true })
    // The transaction rolled back: the ledger insert must NOT survive.
    expect(await ledgerRowsForPi(pi.id)).toHaveLength(0)
  })
})
