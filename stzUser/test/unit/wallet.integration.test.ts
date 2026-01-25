import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { db } from '~stzUser/lib/database'
import { getWalletStatusInternal, grantCreditsInternal, consumeResourceInternal } from '~stzUser/lib/wallet.logic'
import { auth } from '~stzUser/lib/auth'
import { ensureAdditionalTables } from '~stzUser/lib/migrations'
import { testConstants } from '~stzUser/test/constants'

describe('Wallet Ledger Integration', () => {
  let testUserId: string

  beforeAll(async () => {
    await ensureAdditionalTables()
  })

  beforeEach(async () => {
    const timestamp = Date.now() + Math.random()
    const testEmail = `wallet-test-${timestamp}@${testConstants.defaultUserDomain}`

    // Create a fresh test user
    const res = await auth.api.createUser({
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

  it('should start with 3 credits (from daily grant)', async () => {
    const status = await getWalletStatusInternal(testUserId)
    expect(status.credits).toBe(3)
  })

  it('should consume resources from daily grant', async () => {
    // Consume 1
    const res1 = await consumeResourceInternal(testUserId, 'test_resource')
    expect(res1.success).toBe(true)
    expect(res1.message).toContain('Consumed 1 credits')

    let status = await getWalletStatusInternal(testUserId)
    expect(status.credits).toBe(2)

    // Consume 2 more (total 3)
    await consumeResourceInternal(testUserId, 'test_resource')
    await consumeResourceInternal(testUserId, 'test_resource')

    status = await getWalletStatusInternal(testUserId)
    expect(status.credits).toBe(0)

    // Try to consume 4th without credits
    const res4 = await consumeResourceInternal(testUserId, 'test_resource')
    expect(res4.success).toBe(false)
    expect(res4.message).toContain('Insufficient')
  })

  it('should consume from credits after grant is exhausted', async () => {
    // 1. Exhaust grant (3)
    for (let i = 0; i < 3; i++) {
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
    await grantCreditsInternal(testUserId, -10, 'manual_adjustment', 'Adjustment')

    const status = await getWalletStatusInternal(testUserId)
    // 3 initial + 50 - 10 = 43
    expect(status.credits).toBe(43)
  })

  it('should support consuming multiple credits at once', async () => {
    // 1. Grant extra credits
    await grantCreditsInternal(testUserId, 10, 'purchase', 'Bonus')

    // 2. Consume 5 credits (3 daily + 10 bonus = 13 total)
    const res = await consumeResourceInternal(testUserId, 'bulk_action', 5)
    expect(res.success).toBe(true)
    expect(res.message).toContain('Consumed 5 credits')

    const status = await getWalletStatusInternal(testUserId)
    expect(status.credits).toBe(8)
  })

  it('should prevent double-granting during concurrent requests (Race Condition)', async () => {
    // 1. Create a fresh user without credits (they get 0 on construction)
    const timestamp = Date.now() + Math.random()
    const res = await auth.api.createUser({
      body: {
        email: `race-test-${timestamp}@example.com`,
        password: testConstants.defaultPassword,
        name: 'Race Tester',
      },
    })
    const raceUserId = res.user!.id

    // 2. Fire 5 concurrent requests to get status (which triggers grant)
    await Promise.all([
      getWalletStatusInternal(raceUserId),
      getWalletStatusInternal(raceUserId),
      getWalletStatusInternal(raceUserId),
      getWalletStatusInternal(raceUserId),
      getWalletStatusInternal(raceUserId),
    ])

    // 3. Verify exactly 3 credits were granted, not 15
    const status = await getWalletStatusInternal(raceUserId)
    expect(status.credits).toBe(3)
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
      requests.push(consumeResourceInternal(testUserId, 'race_resource', 1))
    }

    const results = await Promise.all(requests)

    // 2. Count successes
    const successes = results.filter(r => r.success).length
    expect(successes).toBe(currentCredits)

    // 3. Verify balance is exactly 0, not negative
    const statusAfter = await getWalletStatusInternal(testUserId)
    expect(statusAfter.credits).toBe(0)
  })
})
