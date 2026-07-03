/**
 * @vitest-environment node
 *
 * Step 1 gate: the stripe_payment_intent_id column + UNIQUE index. Three properties:
 *   - the column is nullable (a non-Stripe row can omit it)
 *   - multiple NULL rows coexist (partial-unique semantics — SQLite treats NULLs as distinct)
 *   - a duplicate non-null value is rejected (the idempotency lock the webhook relies on)
 *
 * PI ids are namespaced with a per-run token so a persisted test DB doesn't collide across runs.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { db } from '~stzUser/lib/database'
import { ensureAdditionalTables } from '~stzUser/lib/migrations'

describe.sequential('Stripe PI-id idempotency column', () => {
  const runId = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`
  const userId = `mig-user-${runId}`

  const baseRow = (id: string) => ({
    id,
    user_id: userId,
    amount: 100,
    type: 'purchase' as const,
    description: 'stripe migration test',
    created_at: new Date().toISOString(),
  })

  beforeAll(async () => {
    await ensureAdditionalTables()
  })

  it('accepts a row with a NULL stripe_payment_intent_id (column is nullable)', async () => {
    await db.insertInto('transactions').values(baseRow(`t-null-a-${runId}`)).execute()
    const row = await db
      .selectFrom('transactions')
      .selectAll()
      .where('id', '=', `t-null-a-${runId}`)
      .executeTakeFirst()
    expect(row?.stripe_payment_intent_id ?? null).toBeNull()
  })

  it('allows multiple NULL rows to coexist (partial-unique semantics)', async () => {
    await db.insertInto('transactions').values(baseRow(`t-null-b-${runId}`)).execute()
    await db.insertInto('transactions').values(baseRow(`t-null-c-${runId}`)).execute()
    const nullRows = await db
      .selectFrom('transactions')
      .selectAll()
      .where('user_id', '=', userId)
      .where('stripe_payment_intent_id', 'is', null)
      .execute()
    expect(nullRows.length).toBeGreaterThanOrEqual(3)
  })

  it('rejects a duplicate non-null stripe_payment_intent_id (UNIQUE lock)', async () => {
    const pi = `pi_test_${runId}`
    await db
      .insertInto('transactions')
      .values({ ...baseRow(`t-pi-1-${runId}`), stripe_payment_intent_id: pi })
      .execute()

    await expect(
      db
        .insertInto('transactions')
        .values({ ...baseRow(`t-pi-2-${runId}`), stripe_payment_intent_id: pi })
        .execute()
    ).rejects.toThrow()
  })
})
