import type { Transaction } from 'kysely'
import { db, type Database } from './database'
import { grantCreditsTx } from './wallet.logic'
import {
  MAX_ADMIN_CREDIT_ADJUSTMENT,
  MAX_ADMIN_DESCRIPTION_LENGTH,
  MAX_USER_ID_LENGTH,
  type AdminCreditTarget,
} from './admin-credit'

function assertTargetUserId(userId: string) {
  if (
    typeof userId !== 'string' ||
    userId.trim().length === 0 ||
    userId.length > MAX_USER_ID_LENGTH
  ) {
    throw new Error(`User ID must be non-empty and no longer than ${MAX_USER_ID_LENGTH} characters`)
  }
}

function assertAdjustmentAmount(amount: number) {
  if (
    !Number.isFinite(amount) ||
    !Number.isInteger(amount) ||
    amount <= 0 ||
    amount > MAX_ADMIN_CREDIT_ADJUSTMENT
  ) {
    throw new Error(
      `Credit amount must be a positive whole number no greater than ${MAX_ADMIN_CREDIT_ADJUSTMENT}`,
    )
  }
}

function assertDescription(description: string) {
  if (
    typeof description !== 'string' ||
    description.trim().length === 0 ||
    description.length > MAX_ADMIN_DESCRIPTION_LENGTH
  ) {
    throw new Error(
      `Description must be non-empty and no longer than ${MAX_ADMIN_DESCRIPTION_LENGTH} characters`,
    )
  }
}

export async function getAdminCreditTargetInternal(userId: string): Promise<AdminCreditTarget> {
  assertTargetUserId(userId)

  const user = await db
    .selectFrom('user')
    .select(['id', 'name', 'email', 'credits'])
    .where('id', '=', userId)
    .executeTakeFirst()

  if (!user) throw new Error('User ID not found')

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    credits: Number(user.credits),
  }
}

export async function addCreditsInternal(
  userId: string,
  amount: number,
  description: string,
) {
  assertTargetUserId(userId)
  assertAdjustmentAmount(amount)
  assertDescription(description)

  return db.transaction().execute(async (transaction) => {
    const target = await transaction
      .selectFrom('user')
      .select('credits')
      .where('id', '=', userId)
      .executeTakeFirst()

    if (!target) throw new Error('Credit target does not exist')

    const oldBalance = Number(target.credits)
    await grantCreditsTx(
      transaction,
      userId,
      amount,
      'manual_adjustment',
      description.trim(),
    )

    return {
      userId,
      amountAdded: amount,
      oldBalance,
      newBalance: oldBalance + amount,
      description: description.trim(),
    }
  })
}

/**
 * Removes a positive credit quantity and records the corresponding negative adjustment.
 * Callers never pass a negative amount to mean removal.
 */
export async function removeCreditsInternal(
  userId: string,
  amount: number,
  description: string,
) {
  assertTargetUserId(userId)
  assertAdjustmentAmount(amount)
  assertDescription(description)

  return db.transaction().execute(async (transaction) => {
    const target = await transaction
      .selectFrom('user')
      .select('credits')
      .where('id', '=', userId)
      .executeTakeFirst()

    if (!target) throw new Error('Credit target does not exist')

    const oldBalance = Number(target.credits)
    const update = await transaction
      .updateTable('user')
      .set((expression) => ({
        credits: expression('credits', '-', amount),
      }))
      .where('id', '=', userId)
      .where('credits', '>=', amount)
      .executeTakeFirst()

    if (Number(update.numUpdatedRows) !== 1) {
      throw new Error('Insufficient credits')
    }

    await transaction
      .insertInto('transactions')
      .values({
        id: crypto.randomUUID(),
        user_id: userId,
        amount: -amount,
        type: 'manual_adjustment',
        description: description.trim(),
        created_at: new Date().toISOString(),
      })
      .execute()

    return {
      userId,
      amountRemoved: amount,
      oldBalance,
      newBalance: oldBalance - amount,
      description: description.trim(),
    }
  })
}

async function countLedgerRows(
  transaction: Transaction<Database>,
  userId: string,
) {
  const totalRow = await transaction
    .selectFrom('transactions')
    .select(({ fn }) => fn.countAll().as('count'))
    .where('user_id', '=', userId)
    .executeTakeFirstOrThrow()
  const stripeRow = await transaction
    .selectFrom('transactions')
    .select(({ fn }) => fn.countAll().as('count'))
    .where('user_id', '=', userId)
    .where('stripe_payment_intent_id', 'is not', null)
    .executeTakeFirstOrThrow()

  return {
    totalRows: Number(totalRow.count),
    stripePurchaseRows: Number(stripeRow.count),
  }
}

export async function getLedgerPurgePreviewInternal(userId: string) {
  assertTargetUserId(userId)
  return db.transaction().execute((transaction) => countLedgerRows(transaction, userId))
}

export async function purgeLedgerInternal(userId: string) {
  assertTargetUserId(userId)

  return db.transaction().execute(async (transaction) => {
    const user = await transaction
      .selectFrom('user')
      .select('id')
      .where('id', '=', userId)
      .executeTakeFirst()

    if (!user) throw new Error('Admin account no longer exists')

    const counts = await countLedgerRows(transaction, userId)

    const deletion = await transaction
      .deleteFrom('transactions')
      .where('user_id', '=', userId)
      .executeTakeFirst()

    const update = await transaction
      .updateTable('user')
      .set({ credits: 0 })
      .where('id', '=', userId)
      .executeTakeFirst()

    if (Number(update.numUpdatedRows) !== 1) {
      throw new Error('Admin balance could not be reset after ledger purge')
    }

    return {
      userId,
      deletedRows: Number(deletion.numDeletedRows),
      deletedStripePurchaseRows: counts.stripePurchaseRows,
      credits: 0 as const,
    }
  })
}
