/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, beforeAll, afterEach, inject, vi } from 'vitest'
import { db } from '~stzUser/lib/database'
import { getWalletStatusInternal, grantCreditsInternal, consumeResourceInternal, claimWelcomeGrantInternal, takeCreditsUpTo } from '~stzUser/lib/wallet.logic'
import { removeCreditsInternal } from '~stzUser/lib/admin-credit.logic'
import { auth } from '~stzUser/lib/auth'
import { ensureAdditionalTables } from '~stzUser/lib/migrations'
import { testConstants } from '~stzUser/test/constants'

describe.skipIf(inject('dbLocked')).sequential('Wallet Ledger Integration', () => {
  let testUserId: string

  beforeAll(async () => {
    await ensureAdditionalTables()
  })

  beforeEach(async () => {
    const timestamp = Date.now() + Math.random()
    const testEmail = `wallet-test-${timestamp}@${testConstants.defaultUserDomain}`

    // Create a fresh test user
    const res = await (auth.api as any).createUser({
      body: {
        email: testEmail,
        password: testConstants.defaultPassword,
        name: 'Wallet Tester',
        role: 'user',
      },
    })

    if (!res?.user) throw new Error('Failed to create test user')
    testUserId = res.user.id
  })

  it('should start with 100 credits (from daily grant)', async () => {
    const status = await getWalletStatusInternal(testUserId)
    expect(status.credits).toBe(100)
  })

  it('should consume resources from daily grant', async () => {
    // Consume 1
    const res1 = await consumeResourceInternal(testUserId, 'test_resource')
    expect(res1.success).toBe(true)
    expect(res1.message).toContain('Consumed 1 credits')

    let status = await getWalletStatusInternal(testUserId)
    expect(status.credits).toBe(99)

    // Consume 99 more (total 100)
    for (let i = 0; i < 99; i++) {
      await consumeResourceInternal(testUserId, 'test_resource')
    }

    status = await getWalletStatusInternal(testUserId)
    expect(status.credits).toBe(0)

    // Try to consume 4th without credits
    const res4 = await consumeResourceInternal(testUserId, 'test_resource')
    expect(res4.success).toBe(false)
    expect(res4.message).toContain('Insufficient')
  })

  // What an event costs, taken from whatever is left. The middleware charges through this, so
  // these three cases are the whole of "the balance stops at zero".
  describe('taking an event price', () => {
    it('takes the whole price when she can afford it, and records it', async () => {
      const { credits: before } = await getWalletStatusInternal(testUserId)

      const charge = await takeCreditsUpTo(testUserId, 'Game saved', 5, { refuseAtZero: false })

      expect(charge).toMatchObject({ refused: false, taken: 5, credits: before - 5 })
      const row = await db
        .selectFrom('transactions')
        .select(['amount', 'description'])
        .where('user_id', '=', testUserId)
        .orderBy('created_at', 'desc')
        .executeTakeFirst()
      expect(row).toMatchObject({ amount: -5, description: 'Game saved' })
    })

    it('takes what is left when the price is more than the balance', async () => {
      const { credits: before } = await getWalletStatusInternal(testUserId)
      await takeCreditsUpTo(testUserId, 'Game saved', before - 3, { refuseAtZero: false })

      const charge = await takeCreditsUpTo(testUserId, 'Game saved', 5, { refuseAtZero: false })

      // Three left and a price of five: she pays the three, and the row says three.
      expect(charge).toMatchObject({ refused: false, taken: 3, credits: 0 })
      const row = await db
        .selectFrom('transactions')
        .select('amount')
        .where('user_id', '=', testUserId)
        .orderBy('created_at', 'desc')
        .executeTakeFirst()
      expect(row).toMatchObject({ amount: -3 })
    })

    it('refuses at zero only what is refusable, and writes no row either way', async () => {
      const { credits: before } = await getWalletStatusInternal(testUserId)
      await takeCreditsUpTo(testUserId, 'Game saved', before, { refuseAtZero: false })
      const rowsAtZero = await db
        .selectFrom('transactions')
        .select('id')
        .where('user_id', '=', testUserId)
        .execute()

      const run = await takeCreditsUpTo(testUserId, 'Game analysed', 8, { refuseAtZero: true })
      const save = await takeCreditsUpTo(testUserId, 'Game saved', 5, { refuseAtZero: false })

      expect(run).toMatchObject({ refused: true, taken: 0, credits: 0 })
      expect(save).toMatchObject({ refused: false, taken: 0, credits: 0 })
      const rowsAfter = await db
        .selectFrom('transactions')
        .select('id')
        .where('user_id', '=', testUserId)
        .execute()
      expect(rowsAfter).toHaveLength(rowsAtZero.length)
    })
  })

  // An event she may do dozens of times a day: each charge is taken, and her history keeps one
  // row for the day.
  describe('gathering a day of charges into one row', () => {
    const PRACTISED = 'Puzzles practised'
    const gathered = { refuseAtZero: false, oneRowPerDay: true }

    // Her day by her offset, which for a new test user is none, so it began at UTC midnight.
    const startOfHerDay = () => new Date(new Date().toISOString().split('T')[0]).toISOString()

    const rowsOf = (description: string) =>
      db
        .selectFrom('transactions')
        .select(['amount', 'created_at'])
        .where('user_id', '=', testUserId)
        .where('description', '=', description)
        .execute()

    const restamp = (createdAt: string) =>
      db
        .updateTable('transactions')
        .set({ created_at: createdAt })
        .where('user_id', '=', testUserId)
        .where('description', '=', PRACTISED)
        .execute()

    it('adds a second charge on her day to the first row, and moves its time to now', async () => {
      const { credits: before } = await getWalletStatusInternal(testUserId)
      await takeCreditsUpTo(testUserId, PRACTISED, 1, gathered)
      // Stamped at the very start of her day, so the move to now shows.
      await restamp(startOfHerDay())

      await takeCreditsUpTo(testUserId, PRACTISED, 1, gathered)

      const rows = await rowsOf(PRACTISED)
      expect(rows).toHaveLength(1)
      expect(rows[0].amount).toBe(-2)
      expect(rows[0].created_at > startOfHerDay()).toBe(true)
      // Only the row is shared: both charges were taken.
      expect((await getWalletStatusInternal(testUserId)).credits).toBe(before - 2)
    })

    it('starts a new row once her day has turned', async () => {
      await takeCreditsUpTo(testUserId, PRACTISED, 1, gathered)
      await restamp(new Date(new Date(startOfHerDay()).getTime() - 1).toISOString())

      await takeCreditsUpTo(testUserId, PRACTISED, 1, gathered)

      expect((await rowsOf(PRACTISED)).map((row) => row.amount)).toEqual([-1, -1])
    })

    it('keeps a row per charge for a price not marked, and apart for another label', async () => {
      await takeCreditsUpTo(testUserId, 'Game saved', 5, { refuseAtZero: false })
      await takeCreditsUpTo(testUserId, 'Game saved', 5, { refuseAtZero: false })
      await takeCreditsUpTo(testUserId, PRACTISED, 1, gathered)
      await takeCreditsUpTo(testUserId, 'Lessons practised', 1, gathered)

      expect(await rowsOf('Game saved')).toHaveLength(2)
      expect(await rowsOf(PRACTISED)).toHaveLength(1)
      expect(await rowsOf('Lessons practised')).toHaveLength(1)
    })
  })

  it('returns the balance after a deduction, and as it stands on a refusal', async () => {
    const { credits: before } = await getWalletStatusInternal(testUserId)

    const spent = await consumeResourceInternal(testUserId, 'test_resource', 1)
    expect(spent).toMatchObject({ success: true, credits: before - 1 })

    const refused = await consumeResourceInternal(testUserId, 'test_resource', before)
    expect(refused).toMatchObject({ success: false, credits: before - 1 })
  })

  // Her day is her local day, and a charge must agree with the wallet read about which day it is.
  // The charge used the UTC day, so a Sydney player on either side of 10am local got two grants.
  describe('one daily grant per local day', () => {
    afterEach(() => { vi.useRealTimers() })

    it('a charge after UTC midnight does not grant again on the same local day', async () => {
      const SYDNEY = 10 * 3600 * 1000
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2026-09-17T21:00:00Z')) // 7:00am, 18 Sep, in Sydney
      await getWalletStatusInternal(testUserId, SYDNEY)
      vi.setSystemTime(new Date('2026-09-18T00:30:00Z')) // 10:30am, same local day
      await consumeResourceInternal(testUserId, 'test_resource', 1)

      const grants = await db.selectFrom('transactions').select('id')
        .where('user_id', '=', testUserId).where('type', '=', 'daily_grant').execute()
      expect(grants).toHaveLength(1)
    })
  })

  it('should consume from credits after grant is exhausted', async () => {
    // 1. Exhaust grant (100)
    for (let i = 0; i < 100; i++) {
      await consumeResourceInternal(testUserId, 'test_resource')
    }

    // 2. Grant credits
    await grantCreditsInternal(testUserId, 10, 'purchase', 'Test Purchase')

    let status = await getWalletStatusInternal(testUserId)
    expect(status.credits).toBe(10)

    // 3. Consume 4th action (should hit credits)
    const res4 = await consumeResourceInternal(testUserId, 'test_resource')
    expect(res4.success).toBe(true)
    expect(res4.message).toContain('Consumed 1 credits')

    status = await getWalletStatusInternal(testUserId)
    expect(status.credits).toBe(9)
  })

  it('should handle granting credits correctly', async () => {
    await grantCreditsInternal(testUserId, 50, 'purchase', 'Huge Grant')
    await removeCreditsInternal(testUserId, 10, 'Adjustment')

    const status = await getWalletStatusInternal(testUserId)
    // 100 initial + 50 - 10 = 140
    expect(status.credits).toBe(140)
  })

  it('should support consuming multiple credits at once', async () => {
    // 1. Grant extra credits
    await grantCreditsInternal(testUserId, 10, 'purchase', 'Bonus')

    // 2. Consume 5 credits (3 daily + 10 bonus = 13 total)
    const res = await consumeResourceInternal(testUserId, 'bulk_action', 5)
    expect(res.success).toBe(true)
    expect(res.message).toContain('Consumed 5 credits')

    const status = await getWalletStatusInternal(testUserId)
    expect(status.credits).toBe(105)
  })

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  it('should prevent double-granting during concurrent requests (Race Condition)', async () => {
    // 1. Create a fresh user without credits (they get 0 on construction)
    const timestamp = Date.now() + Math.random()
    const res = await (auth.api as any).createUser({
      body: {
        email: `race-test-${timestamp}@example.com`,
        password: testConstants.defaultPassword,
        name: 'Race Tester',
      },
    })
    const raceUserId = res.user!.id

    // 2. Fire 5 concurrent requests to get status (which triggers grant)
    // We use a small stagger (10ms) to allow LibSQL's queue to handle the locks
    // while still testing the atomicity of the 'ensureDailyAllowance' check.
    const requests = [
      getWalletStatusInternal(raceUserId),
      (async () => { await sleep(10); return getWalletStatusInternal(raceUserId) })(),
      (async () => { await sleep(20); return getWalletStatusInternal(raceUserId) })(),
      (async () => { await sleep(30); return getWalletStatusInternal(raceUserId) })(),
      (async () => { await sleep(40); return getWalletStatusInternal(raceUserId) })(),
    ]
    await Promise.all(requests)

    // 3. Verify exactly 100 credits were granted, not 500
    const status = await getWalletStatusInternal(raceUserId)
    expect(status.credits).toBe(100)
  })

  it('should prevent negative balance during concurrent consumption', async () => {
    // 1. Give user exactly 1 credit
    // (Note: they already have 3 from the first action, so we use that)
    const statusBefore = await getWalletStatusInternal(testUserId)
    const currentCredits = statusBefore.credits

    // We want to try to spend more than they have concurrently
    // Let's try to spend 'currentCredits + 2' credits using concurrent requests of 1 each
    const requests: Promise<{ success: boolean; message: string }>[] = []
    for (let i = 0; i < currentCredits + 2; i++) {
      const stagger = i * 10
      requests.push((async () => {
        if (stagger > 0) await sleep(stagger)
        return consumeResourceInternal(testUserId, 'race_resource', 1)
      })())
    }

    const results = await Promise.all(requests)

    // 2. Count successes
    const successes = results.filter(r => r.success).length
    expect(successes).toBe(currentCredits)

    // 3. Verify balance is exactly 0, not negative
    const statusAfter = await getWalletStatusInternal(testUserId)
    expect(statusAfter.credits).toBe(0)
  })

  it('should handle the one-time welcome grant', async () => {
    // 1. Claim grant
    const result = await claimWelcomeGrantInternal(testUserId)
    expect(result.success).toBe(true)
    if ('message' in result) {
      expect(result.message).toContain('Welcome grant of 10 credits')
    }

    const status = await getWalletStatusInternal(testUserId)
    // 100 from first action (daily grant) + 500 welcome = 600
    expect(status.credits).toBe(600)

    // 2. Try to claim again
    const result2 = await claimWelcomeGrantInternal(testUserId)
    expect(result2.success).toBe(false)
    if ('message' in result2) {
      expect(result2.message).toContain('already claimed')
    }

    // 3. Verify balance hasn't changed
    const status2 = await getWalletStatusInternal(testUserId)
    expect(status2.credits).toBe(600)
  })
})
