/**
 * @vitest-environment node
 *
 * Step 3 gate (check side) — checkPurchaseInternal against the real DB. The load-bearing property is
 * the `user_id` scope: a purchase is visible to its owner and to NO ONE else, so an authenticated
 * user can never poll another user's PI id and learn { granted, amount } (a cross-user leak).
 *
 * PI ids carry a per-run token so a persisted test DB doesn't collide across runs.
 */
import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { grantPurchaseCredits, checkPurchaseInternal, type PurchasePaymentIntent } from '~stzUser/lib/wallet.logic'
import { auth } from '~stzUser/lib/auth'
import { ensureAdditionalTables } from '~stzUser/lib/migrations'
import { testConstants } from '~stzUser/test/constants'

describe.sequential('checkPurchaseInternal (user-scoped purchase lookup)', () => {
  const runId = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`
  let ownerId: string
  let strangerId: string
  let piCounter = 0

  const makeUser = async (label: string): Promise<string> => {
    const email = `checkpurchase-${label}-${runId}-${Math.random()}@${testConstants.defaultUserDomain}`
    const res = await (auth.api as any).createUser({
      body: { email, password: testConstants.defaultPassword, name: 'CheckPurchase Tester', role: 'user' },
    })
    if (!res?.user) throw new Error('Failed to create test user')
    return res.user.id
  }

  const grantedPiFor = async (userId: string): Promise<string> => {
    const pi: PurchasePaymentIntent = {
      id: `pi_check_${runId}_${piCounter++}`,
      amount: 500,
      currency: 'aud',
      metadata: { userId, creditsRequested: '10', amountCents: '500' },
    }
    await grantPurchaseCredits(pi)
    return pi.id
  }

  beforeAll(async () => {
    await ensureAdditionalTables()
  })

  beforeEach(async () => {
    ownerId = await makeUser('owner')
    strangerId = await makeUser('stranger')
  })

  it('returns granted + amount for the owner of a granted purchase', async () => {
    const piId = await grantedPiFor(ownerId)
    expect(await checkPurchaseInternal(ownerId, piId)).toEqual({ granted: true, amount: 10 })
  })

  it('returns not-granted for an unknown PaymentIntent id', async () => {
    expect(await checkPurchaseInternal(ownerId, `pi_never_${runId}`)).toEqual({ granted: false })
  })

  it('returns not-granted when another user polls the purchase (user_id scope closes the leak)', async () => {
    const piId = await grantedPiFor(ownerId)
    // The stranger knows the PI id but must not learn anything about it.
    expect(await checkPurchaseInternal(strangerId, piId)).toEqual({ granted: false })
  })
})
