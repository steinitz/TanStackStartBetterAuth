import { createServerFn } from '@tanstack/react-start'

// Database schema types
interface UserTable {
  id: string
  name: string
  email: string
  emailVerified: number
  image: string | null
  createdAt: string
  updatedAt: string
}

interface DatabaseSchema {
  user: UserTable
}

export const getAllUsers = createServerFn({
  method: 'GET',
}).handler(async () => {
  // Import database dependencies only on server side
  const { Kysely, SqliteDialect } = await import('kysely')
  const Database = (await import('better-sqlite3')).default
  
  // Create kysely instance
  const database = new Database('sqlite.db')
  const db = new Kysely<DatabaseSchema>({
    dialect: new SqliteDialect({
      database,
    }),
  })
  
  try {
    const users = await db
      .selectFrom('user')
      .selectAll()
      .execute()
    
    return users
  } catch (error) {
    console.error('Error fetching users:', error)
    return []
  }
})

export const deleteUserById = createServerFn({ method: 'POST' })
  .validator((userId: string) => userId)
  .handler(async ({ data: userId }) => {
    // Import better-auth on server side
    const { auth } = await import('./auth')
    console.log('userId', userId)
    
    try {
      // Use Better-auth's admin API to remove user by ID
      const result = await auth.api.removeUser({
        body: {
          userId: userId
        }
      })
      
      return { success: true, result }
    } catch (error) {
      console.error('Error deleting user:', error)
      throw new Error(`Failed to delete user: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

export type User = UserTable