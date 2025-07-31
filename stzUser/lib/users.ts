'use server'

import { Kysely, SqliteDialect } from 'kysely'
import Database from 'better-sqlite3'
import { auth } from './auth'

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

// Create kysely instance
const database = new Database('sqlite.db')
const db = new Kysely<DatabaseSchema>({
  dialect: new SqliteDialect({
    database,
  }),
})

export async function getAllUsers() {
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
}

export async function deleteUserById(userId: string, headers: Headers) {
  console.log('userId', userId)
  
  try {
    // Get current session to prevent self-deletion
    const session = await auth.api.getSession({ headers })
    
    if (session?.user?.id === userId) {
      throw new Error('Cannot delete your own account. Please have another admin delete your account or create another admin first.')
    }
    
    // Use Better-auth's admin API to remove user by ID
    const result = await auth.api.removeUser({
      body: {
        userId: userId
      },
      headers
    })
    
    return { success: true, result }
  } catch (error) {
    console.error('Error deleting user:', error)
    throw new Error(`Failed to delete user: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function setUserRole(data: { userId: string; role: "admin" | "user" }, headers: Headers) {
  try {
    // Use Better Auth admin API to set user role with proper authentication
    const result = await auth.api.setRole({
      body: {
        userId: data.userId,
        role: data.role
      },
      headers
    })
    
    return { success: true, result }
  } catch (error) {
    console.error('Error setting user role:', error)
    throw new Error('Failed to set user role')
  }
}

export async function removeUserRole(data: { userId: string }, headers: Headers) {
  try {
    // Use Better Auth admin API to set user role to default "user"
    const result = await auth.api.setRole({
      body: {
        userId: data.userId,
        role: "user"
      },
      headers
    })
    
    return { success: true, result }
  } catch (error) {
    console.error('Error removing user role:', error)
    throw new Error('Failed to remove user role')
  }
}

export type User = UserTable