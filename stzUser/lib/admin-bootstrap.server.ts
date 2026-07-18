import { db } from './database'

export async function promoteFirstUserIfOnlyUser(userId: string): Promise<boolean> {
  return db.transaction().execute(async (transaction) => {
    const result = await transaction
      .selectFrom('user')
      .select(({ fn }) => fn.countAll<number>().as('count'))
      .executeTakeFirstOrThrow()

    if (Number(result.count) !== 1) return false

    const update = await transaction
      .updateTable('user')
      .set({ role: 'admin' })
      .where('id', '=', userId)
      .executeTakeFirst()

    if (Number(update.numUpdatedRows) !== 1) {
      throw new Error('First-user admin promotion did not update the created user')
    }

    return true
  })
}

export function createFirstUserAdminHook(
  enabled: boolean,
  promote: (userId: string) => Promise<boolean> = promoteFirstUserIfOnlyUser,
) {
  return async (user: { id: string }): Promise<void> => {
    if (!enabled) return
    await promote(user.id)
  }
}
