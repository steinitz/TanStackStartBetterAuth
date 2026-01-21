import { createServerFn } from '@tanstack/react-start'
import { getWebRequest } from '@tanstack/react-start/server'
import { auth } from './auth'
import { db } from './database'
import crypto from 'crypto'

export type WalletStatus = {
  allowance: number
  credits: number
  usageToday: number
}

// Fixed daily allowance for now
const DAILY_ALLOWANCE = 3

/**
 * Calculates the current wallet status for the logged-in user.
 */
export const getWalletStatus = createServerFn({
  method: 'GET',
}).handler(async () => {
  const request = getWebRequest()
  const headers = request?.headers

  if (!headers) {
    throw new Error('Not authenticated')
  }

  const session = await auth.api.getSession({ headers })

  if (!session?.user) {
    throw new Error('Not authenticated')
  }

  const userId = session.user.id
  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

  // 1. Get usage today
  const usageCount = await db
    .selectFrom('resource_usage')
    .select(db.fn.count('id').as('count'))
    .where('user_id', '=', userId)
    .where('created_at', '>=', today)
    .executeTakeFirst()

  const usageToday = Number(usageCount?.count || 0)

  // 2. Get total credits (sum of transaction amounts)
  const creditSum = await db
    .selectFrom('transactions')
    .select(db.fn.sum('amount').as('total'))
    .where('user_id', '=', userId)
    .executeTakeFirst()

  const credits = Number(creditSum?.total || 0)

  return {
    allowance: DAILY_ALLOWANCE,
    credits,
    usageToday,
  } as WalletStatus
})

/**
 * Server function to consume a resource for the current user.
 * Logic: Uses allowance first, then credits.
 */
export const useConsumeResource = createServerFn({
  method: 'POST',
})
  .validator((resourceType: string) => resourceType)
  .handler(async ({ data: resourceType }) => {
    const request = getWebRequest()
    const headers = request?.headers
    if (!headers) throw new Error('Not authenticated')

    const session = await auth.api.getSession({ headers })
    if (!session?.user) throw new Error('Not authenticated')

    const userId = session.user.id
    const today = new Date().toISOString().split('T')[0]

    // Check current usage
    const usageCount = await db
      .selectFrom('resource_usage')
      .select(db.fn.count('id').as('count'))
      .where('user_id', '=', userId)
      .where('created_at', '>=', today)
      .executeTakeFirst()

    const usageToday = Number(usageCount?.count || 0)

    if (usageToday < DAILY_ALLOWANCE) {
      // Consume from allowance
      await db
        .insertInto('resource_usage')
        .values({
          id: crypto.randomUUID(),
          user_id: userId,
          resource_type: resourceType,
          created_at: new Date().toISOString(),
        })
        .execute()

      return { success: true, message: 'Resource consumed from daily allowance' }
    }

    // Allowance exhausted, check credits
    const creditSum = await db
      .selectFrom('transactions')
      .select(db.fn.sum('amount').as('total'))
      .where('user_id', '=', userId)
      .executeTakeFirst()

    const currentCredits = Number(creditSum?.total || 0)

    if (currentCredits >= 1) {
      // Consume 1 credit
      await db.transaction().execute(async (trx) => {
        // 1. Record transaction
        await trx
          .insertInto('transactions')
          .values({
            id: crypto.randomUUID(),
            user_id: userId,
            amount: -1,
            description: `Resource consumption: ${resourceType}`,
            created_at: new Date().toISOString(),
          })
          .execute()

        // 2. Record usage
        await trx
          .insertInto('resource_usage')
          .values({
            id: crypto.randomUUID(),
            user_id: userId,
            resource_type: resourceType,
            created_at: new Date().toISOString(),
          })
          .execute()
      })

      return { success: true, message: 'Resource consumed from credits' }
    }

    return { success: false, message: 'Insufficient actions or credits' }
  })

/**
 * Server function to grant credits to a user (e.g., for testing).
 */
export const useGrantCredits = createServerFn({
  method: 'POST',
})
  .validator((data: { amount: number; description: string }) => data)
  .handler(async ({ data }) => {
    const request = getWebRequest()
    const headers = request?.headers
    if (!headers) throw new Error('Not authenticated')

    const session = await auth.api.getSession({ headers })
    if (!session?.user) throw new Error('Not authenticated')

    await db
      .insertInto('transactions')
      .values({
        id: crypto.randomUUID(),
        user_id: session.user.id,
        amount: data.amount,
        description: data.description,
        created_at: new Date().toISOString(),
      })
      .execute()

    return { success: true }
  })
