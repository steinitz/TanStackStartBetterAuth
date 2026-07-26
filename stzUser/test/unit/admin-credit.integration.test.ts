/**
 * @vitest-environment node
 */
import { beforeAll, describe, expect, it } from 'vitest'
import {
  addCreditsInternal,
  getAdminCreditTargetInternal,
  getLedgerPurgePreviewInternal,
  purgeLedgerInternal,
  removeCreditsInternal,
} from '~stzUser/lib/admin-credit.logic'
import { auth } from '~stzUser/lib/auth'
import { db, libsqlClient } from '~stzUser/lib/database'
import { ensureAdditionalTables } from '~stzUser/lib/migrations'
import {
  consumeResourceInternal,
  getWalletStatusInternal,
  grantCreditsInternal,
} from '~stzUser/lib/wallet.logic'
import { testConstants } from '~stzUser/test/constants'

describe.sequential('admin credit accounting integration', () => {
  const runId = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`
  let userCounter = 0

  beforeAll(async () => {
    await ensureAdditionalTables()
  })

  async function createUser(label: string) {
    const result = await (auth.api as any).createUser({
      body: {
        email: `${label}-${runId}-${userCounter++}@${testConstants.defaultUserDomain}`,
        password: testConstants.defaultPassword,
        name: label,
        role: 'user',
      },
    })
    if (!result?.user) throw new Error('Failed to create credit test user')
    return result.user as { id: string; name: string; email: string }
  }

  async function storedCredits(userId: string) {
    const row = await db
      .selectFrom('user')
      .select('credits')
      .where('id', '=', userId)
      .executeTakeFirstOrThrow()
    return Number(row.credits)
  }

  async function ledgerRows(userId: string) {
    return db
      .selectFrom('transactions')
      .selectAll()
      .where('user_id', '=', userId)
      .orderBy('created_at')
      .execute()
  }

  async function insertLedgerRow(
    userId: string,
    amount: number,
    stripePaymentIntentId?: string,
    type: 'purchase' | 'manual_adjustment' =
      stripePaymentIntentId ? 'purchase' : 'manual_adjustment',
  ) {
    await db
      .insertInto('transactions')
      .values({
        id: crypto.randomUUID(),
        user_id: userId,
        amount,
        type,
        description: stripePaymentIntentId ? 'Stripe purchase' : 'Adjustment',
        created_at: new Date().toISOString(),
        stripe_payment_intent_id: stripePaymentIntentId,
      })
      .execute()
  }

  it('rejects invalid direct consumption before daily grant, balance, or ledger mutation', async () => {
    const user = await createUser('invalid-consumption')

    for (const amount of [-1, 0, 1.5, NaN, Infinity, 1_000_001]) {
      await expect(
        consumeResourceInternal(user.id, 'analysis', amount),
      ).rejects.toThrow(/positive whole number/)
    }
    await expect(
      consumeResourceInternal(user.id, ' ', 1),
    ).rejects.toThrow(/resourceType/)

    expect(await storedCredits(user.id)).toBe(0)
    expect(await ledgerRows(user.id)).toEqual([])
  })

  it('keeps all internal credit grants positive-only', async () => {
    const user = await createUser('invalid-grant')

    for (const amount of [-1, 0, 1.5, NaN, Infinity]) {
      await expect(
        grantCreditsInternal(user.id, amount, 'manual_adjustment', 'Invalid grant'),
      ).rejects.toThrow(/positive whole number/)
    }

    expect(await storedCredits(user.id)).toBe(0)
    expect(await ledgerRows(user.id)).toEqual([])
  })

  it('looks up only exact confirmation fields without applying a daily grant', async () => {
    const user = await createUser('lookup-target')
    await db.updateTable('user').set({ credits: 17 }).where('id', '=', user.id).execute()

    await expect(getAdminCreditTargetInternal(user.id)).resolves.toEqual({
      id: user.id,
      name: user.name,
      email: user.email,
      credits: 17,
    })
    expect(await storedCredits(user.id)).toBe(17)
    expect(await ledgerRows(user.id)).toEqual([])
  })

  it('reports a missing lookup as an unknown user ID', async () => {
    await expect(
      getAdminCreditTargetInternal(`missing-${runId}`),
    ).rejects.toThrow('User ID not found')
  })

  it('adds credits and its positive ledger adjustment atomically', async () => {
    const user = await createUser('add-target')

    await expect(addCreditsInternal(
      user.id,
      25,
      ' Bank transfer received ',
    )).resolves.toEqual({
      userId: user.id,
      amountAdded: 25,
      oldBalance: 0,
      newBalance: 25,
      description: 'Bank transfer received',
    })

    expect(await storedCredits(user.id)).toBe(25)
    expect(await ledgerRows(user.id)).toEqual([
      expect.objectContaining({
        user_id: user.id,
        amount: 25,
        type: 'manual_adjustment',
        description: 'Bank transfer received',
      }),
    ])
  })

  it('rolls back an add-credit ledger row if the target vanishes before its balance update', async () => {
    const user = await createUser('vanishing-add-target')
    const triggerName = `delete_add_target_${userCounter}`

    await libsqlClient.execute(`
      CREATE TRIGGER "${triggerName}"
      BEFORE INSERT ON transactions
      WHEN NEW.user_id = '${user.id}'
      BEGIN
        DELETE FROM user WHERE id = '${user.id}';
      END
    `)

    try {
      await expect(
        addCreditsInternal(user.id, 10, 'Should roll back'),
      ).rejects.toThrow(/does not exist/)
    } finally {
      await libsqlClient.execute(`DROP TRIGGER IF EXISTS "${triggerName}"`)
    }

    expect(await storedCredits(user.id)).toBe(0)
    expect(await ledgerRows(user.id)).toEqual([])
  })

  it('rejects missing add/remove targets without orphan ledger rows', async () => {
    const missingUserId = `missing-${runId}`

    await expect(
      addCreditsInternal(missingUserId, 10, 'Missing add'),
    ).rejects.toThrow(/does not exist/)
    await expect(
      removeCreditsInternal(missingUserId, 10, 'Missing removal'),
    ).rejects.toThrow(/does not exist/)

    expect(await ledgerRows(missingUserId)).toEqual([])
  })

  it('removes credits atomically and rejects overdraw without a ledger row', async () => {
    const user = await createUser('remove-target')
    await grantCreditsInternal(user.id, 20, 'manual_adjustment', 'Opening test balance')

    await expect(removeCreditsInternal(
      user.id,
      7,
      ' Support correction ',
    )).resolves.toEqual({
      userId: user.id,
      amountRemoved: 7,
      oldBalance: 20,
      newBalance: 13,
      description: 'Support correction',
    })
    await expect(
      removeCreditsInternal(user.id, 14, 'Too much'),
    ).rejects.toThrow(/Insufficient/)

    expect(await storedCredits(user.id)).toBe(13)
    expect(await ledgerRows(user.id)).toEqual([
      expect.objectContaining({ amount: 20 }),
      expect.objectContaining({
        amount: -7,
        type: 'manual_adjustment',
        description: 'Support correction',
      }),
    ])
  })

  it('allows only one affordable winner across competing removals', async () => {
    const user = await createUser('competing-remove')
    await grantCreditsInternal(user.id, 10, 'manual_adjustment', 'Opening test balance')

    // SQLite serializes the writes. Model the two contenders in that execution order:
    // this documents the conditional-update invariant without claiming parallel-writer proof.
    const firstAttempt = removeCreditsInternal(user.id, 7, 'Competing removal A')
    const secondAttempt = firstAttempt.then(
      () => removeCreditsInternal(user.id, 7, 'Competing removal B'),
    )
    const results = await Promise.allSettled([
      firstAttempt,
      secondAttempt,
    ])

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1)
    expect(await storedCredits(user.id)).toBe(3)
    expect((await ledgerRows(user.id)).map((row) => row.amount).sort((a, b) => a - b))
      .toEqual([-7, 10])
  })

  it('removes to a true stored zero before a later grant-bearing read', async () => {
    const user = await createUser('remove-to-zero')
    await grantCreditsInternal(user.id, 10, 'manual_adjustment', 'Opening test balance')

    const removal = await removeCreditsInternal(user.id, 10, 'Remove displayed balance')

    expect(removal.newBalance).toBe(0)
    expect(await storedCredits(user.id)).toBe(0)
    await expect(getAdminCreditTargetInternal(user.id)).resolves.toMatchObject({ credits: 0 })
    expect(await ledgerRows(user.id)).toEqual([
      expect.objectContaining({ amount: 10 }),
      expect.objectContaining({ amount: -10 }),
    ])

    await expect(getWalletStatusInternal(user.id)).resolves.toMatchObject({ credits: 100 })
    expect(await storedCredits(user.id)).toBe(100)
  })

  it('previews and purges every self-ledger row while leaving another user untouched', async () => {
    const admin = await createUser('purge-admin')
    const other = await createUser('purge-other')
    await db.updateTable('user')
      .set({ credits: 75, welcome_claimed: 1 })
      .where('id', '=', admin.id)
      .execute()
    await db.updateTable('user').set({ credits: 30 }).where('id', '=', other.id).execute()
    await insertLedgerRow(admin.id, 50)
    // Evidence is the non-null PaymentIntent ID, not the transaction type label.
    await insertLedgerRow(admin.id, 25, `pi_${runId}_purge`, 'manual_adjustment')
    await insertLedgerRow(admin.id, 5, undefined, 'purchase')
    await insertLedgerRow(other.id, 30)

    await expect(getLedgerPurgePreviewInternal(admin.id)).resolves.toEqual({
      totalRows: 3,
      stripePurchaseRows: 1,
    })
    expect(await storedCredits(admin.id)).toBe(75)

    await expect(purgeLedgerInternal(admin.id)).resolves.toEqual({
      userId: admin.id,
      deletedRows: 3,
      deletedStripePurchaseRows: 1,
      credits: 0,
    })

    expect(await storedCredits(admin.id)).toBe(0)
    expect(await ledgerRows(admin.id)).toEqual([])
    expect(await db.selectFrom('user')
      .select('welcome_claimed')
      .where('id', '=', admin.id)
      .executeTakeFirstOrThrow()).toMatchObject({ welcome_claimed: 1 })
    expect(await storedCredits(other.id)).toBe(30)
    expect(await ledgerRows(other.id)).toHaveLength(1)
  })

  it('rolls back the deletion if the purge balance update fails', async () => {
    const admin = await createUser('purge-rollback')
    await db.updateTable('user').set({ credits: 15 }).where('id', '=', admin.id).execute()
    await insertLedgerRow(admin.id, 15)
    const triggerName = `fail_purge_balance_${userCounter}`

    await libsqlClient.execute(`
      CREATE TRIGGER "${triggerName}"
      BEFORE UPDATE OF credits ON user
      WHEN OLD.id = '${admin.id}' AND NEW.credits = 0
      BEGIN
        SELECT RAISE(ABORT, 'forced purge balance failure');
      END
    `)

    try {
      await expect(purgeLedgerInternal(admin.id)).rejects.toThrow()
    } finally {
      await libsqlClient.execute(`DROP TRIGGER IF EXISTS "${triggerName}"`)
    }

    expect(await storedCredits(admin.id)).toBe(15)
    expect(await ledgerRows(admin.id)).toHaveLength(1)
  })
})
