import { createServerFn } from '@tanstack/react-start'
import { getWebRequest } from '@tanstack/react-start/server'

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

export const setUserRole = createServerFn({ method: 'POST' })
  .validator((data: { userId: string; role: "admin" | "user" }) => data)
  .handler(async ({ data }) => {
    // Import better-auth on server side
    const { auth } = await import('./auth')
    
    // Get request context for authentication
    const request = getWebRequest()
    if (!request?.headers) {
      throw new Error('Request headers not available')
    }
    
    try {
      // Use Better Auth admin API to set user role with proper authentication
      const result = await auth.api.setRole({
        body: {
          userId: data.userId,
          role: data.role
        },
        headers: request.headers
      })
      
      return { success: true, result }
    } catch (error) {
      console.error('Error setting user role:', error)
      throw new Error('Failed to set user role')
    }
  })

export const removeUserRole = createServerFn({ method: 'POST' })
  .validator((data: { userId: string }) => data)
  .handler(async ({ data }) => {
    // Import better-auth on server side
    const { auth } = await import('./auth')
    
    // Get request context for authentication
    const request = getWebRequest()
    if (!request?.headers) {
      throw new Error('Request headers not available')
    }
    
    try {
      // Use Better Auth admin API to set user role to default "user"
      const result = await auth.api.setRole({
        body: {
          userId: data.userId,
          role: "user"
        },
        headers: request.headers
      })
      
      return { success: true, result }
    } catch (error) {
      console.error('Error removing user role:', error)
      throw new Error('Failed to remove user role')
    }
  })

export type User = UserTable