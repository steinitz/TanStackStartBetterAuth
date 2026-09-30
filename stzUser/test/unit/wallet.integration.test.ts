/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, beforeAll, afterEach, inject, vi } from 'vitest'
import { db } from '~stzUser/lib/database'
import { getWalletStatusInternal, grantCreditsInternal, claimWelcomeGrantInternal, takeCreditsUpTo } from '~stzUser/lib/wallet.logic'
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

  // Her first act of a day may be a charged one, before anything has read her wallet. The charge
  // grants the day first, so it takes from today's credits rather than finding none.
  it('grants the day before taking, when a charge is the first thing she does', async () => {
    const charge = await takeCreditsUpTo(testUserId, 'Game saved', 1, { refuseBelowPrice: true })

    expect(charge).toMatchObject({ refused: false, taken: 1, credits: 99 })
  })

  // What an event costs, taken from whatever is left. The middleware charges through this, so
  // these three cases are the whole of "the balance stops at zero".
  describe('taking an event price', () => {
    it('takes the whole price when she can afford it, and records it', async () => {
      const { credits: before } = await getWalletStatusInternal(testUserId)

      const charge = await takeCreditsUpTo(testUserId, 'Game saved', 5, { refuseBelowPrice: false })

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
      await takeCreditsUpTo(testUserId, 'Game saved', before - 3, { refuseBelowPrice: false })

      const charge = await takeCreditsUpTo(testUserId, 'Game saved', 5, { refuseBelowPrice: false })

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

    it('refuses new work below its price, takes nothing and writes no row', async () => {
      const { credits: before } = await getWalletStatusInternal(testUserId)
      await takeCreditsUpTo(testUserId, 'Game saved', before - 5, { refuseBelowPrice: false })
      const rowsAtFive = await db.selectFrom('transactions').select('id').where('user_id', '=', testUserId).execute()

      // Five left and a run priced eight: refused whole, and her five stay hers.
      const run = await takeCreditsUpTo(testUserId, 'Game analysed', 8, { refuseBelowPrice: true })

      expect(run).toMatchObject({ refused: true, taken: 0, credits: 5 })
      const rowsAfter = await db.selectFrom('transactions').select('id').where('user_id', '=', testUserId).execute()
      expect(rowsAfter).toHaveLength(rowsAtFive.length)
      expect((await getWalletStatusInternal(testUserId)).credits).toBe(5)
    })

    it('takes new work priced exactly what she has', async () => {
      const { credits: before } = await getWalletStatusInternal(testUserId)
      await takeCreditsUpTo(testUserId, 'Game saved', before - 8, { refuseBelowPrice: false })

      const run = await takeCreditsUpTo(testUserId, 'Game analysed', 8, { refuseBelowPrice: true })

      expect(run).toMatchObject({ refused: false, taken: 8, credits: 0 })
    })

    it('refuses at zero only what is refusable, and writes no row either way', async () => {
      const { credits: before } = await getWalletStatusInternal(testUserId)
      await takeCreditsUpTo(testUserId, 'Game saved', before, { refuseBelowPrice: false })
      const rowsAtZero = await db
        .selectFrom('transactions')
        .select('id')
        .where('user_id', '=', testUserId)
        .execute()

      const run = await takeCreditsUpTo(testUserId, 'Game analysed', 8, { refuseBelowPrice: true })
      const save = await takeCreditsUpTo(testUserId, 'Game saved', 5, { refuseBelowPrice: false })

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
    const gathered = { refuseBelowPrice: false, oneRowPerDay: true }

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
      await takeCreditsUpTo(testUserId, 'Game saved', 5, { refuseBelowPrice: false })
      await takeCreditsUpTo(testUserId, 'Game saved', 5, { refuseBelowPrice: false })
      await takeCreditsUpTo(testUserId, PRACTISED, 1, gathered)
      await takeCreditsUpTo(testUserId, 'Lessons practised', 1, gathered)

      expect(await rowsOf('Game saved')).toHaveLength(2)
      expect(await rowsOf(PRACTISED)).toHaveLength(1)
      expect(await rowsOf('Lessons practised')).toHaveLength(1)
    })
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
      await takeCreditsUpTo(testUserId, 'Game saved', 1, { refuseBelowPrice: false })

      const grants = await db.selectFrom('transactions').select('id')
        .where('user_id', '=', testUserId).where('type', '=', 'daily_grant').execute()
      expect(grants).toHaveLength(1)
    })
  })

  it('should handle granting credits correctly', async () => {
    await grantCreditsInternal(testUserId, 50, 'purchase', 'Huge Grant')
    await removeCreditsInternal(testUserId, 10, 'Adjustment')

    const status = await getWalletStatusInternal(testUserId)
    // 100 initial + 50 - 10 = 140
    expect(status.credits).toBe(140)
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
