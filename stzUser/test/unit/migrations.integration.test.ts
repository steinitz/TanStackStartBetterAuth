/**
 * @vitest-environment node
 *
 * The setup runs on every server start, so a second run must pass, and a column add that fails
 * for any reason but "already there" must stop it. Both against the real driver, whose error text
 * is what addColumnIfMissing reads.
 */
import { describe, it, expect } from 'vitest'
import { db } from '~stzUser/lib/database'
import { addColumnIfMissing, ensureAdditionalTables } from '~stzUser/lib/migrations'

describe.sequential('ensureAdditionalTables', () => {
  it('runs twice without throwing', async () => {
    await ensureAdditionalTables()
    await expect(ensureAdditionalTables()).resolves.toBeUndefined()
  })

  it('ignores a column that is already there', async () => {
    await expect(
      addColumnIfMissing(() => db.schema.alterTable('user').addColumn('credits', 'integer').execute()),
    ).resolves.toBeUndefined()
  })

  it('rethrows any other failure', async () => {
    await expect(
      addColumnIfMissing(() =>
        db.schema.alterTable('no_such_table').addColumn('x', 'integer').execute(),
      ),
    ).rejects.toThrow(/no such table/i)
  })
})
