'use server'

import { auth } from './auth'
import { adminUserIds } from './admin-config.server'
import { resolveAdminStatus } from './admin-identity'
import { UserWithRole, ListUsersResponse, db, type AdminManagedUser } from './database'

/**
 * Query users directly from the database using Kysely
 * This function bypasses the Better Auth API and queries the user table directly
 *
 * Diagnostic helper only. It must never be used as an authorization fallback:
 * a rejected Better Auth admin request must fail closed.
 */
export async function queryUsersWithKysely(): Promise<UserWithRole[]> {
  try {
    const basicUsers = await db
      .selectFrom('user')
      .selectAll()
      .execute()

    // Convert string dates to Date objects and add role-related fields
    return basicUsers.map(user => ({
      ...user,
      createdAt: new Date(user.createdAt),
      updatedAt: new Date(user.updatedAt),
      role: null,
      banned: null,
      banReason: null,
      banExpires: null
    })) as UserWithRole[]
  } catch (dbError) {
    console.error('Database query failed:', dbError)
    return []
  }
}

/**
 * Query a single user by email directly from the database using Kysely
 * This function bypasses the Better Auth API and queries the user table directly
 */
export async function queryUserWithKysely(email: string): Promise<UserWithRole | null> {
  try {
    const user = await db
      .selectFrom('user')
      .selectAll()
      .where('email', '=', email)
      .executeTakeFirst()

    if (!user) {
      return null
    }

    // Convert string dates to Date objects and add role-related fields
    return {
      ...user,
      createdAt: new Date(user.createdAt),
      updatedAt: new Date(user.updatedAt),
      role: null,
      banned: null,
      banReason: null,
      banExpires: null
    } as UserWithRole
  } catch (dbError) {
    console.error('Database query failed:', dbError)
    return null
  }
}

export async function getAllUsers(headers: Headers): Promise<AdminManagedUser[]> {
  try {
    // Use Better Auth API to get users with role information
    const result = await (auth.api as any).listUsers({
      query: {},
      headers
    }) as ListUsersResponse

    // Annotate only the authorized result. The raw configured ID list remains
    // server-only while each visible row tells the truth about effective access.
    return (result.users || []).map((user) => ({
      ...user,
      adminSource: resolveAdminStatus(user, adminUserIds).source,
    }))
  } catch (error) {
    console.error('Error fetching users from Better Auth API:', error)
    throw error
  }
}

export async function deleteUserById(userId: string, headers: Headers) {
  console.log('deleteUserById', userId)

  try {
    // Get current session
    const session = await auth.api.getSession({ headers })

    if (!session) {
      throw new Error('Not authenticated')
    }

    // Prevent self-deletion for all users
    if (session.user.id === userId) {
      throw new Error('Cannot delete your own account. Please have another admin delete your account.')
    }

    // Use Better-auth's admin API to remove user by ID
    const result = await (auth.api as any).removeUser({
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
    const result = await (auth.api as any).setRole({
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

export async function demoteUserToUserRole(data: { userId: string }, headers: Headers) {
  try {
    // Use Better Auth admin API to set user role to default "user"
    const result = await (auth.api as any).setRole({
      body: {
        userId: data.userId,
        role: "user"
      },
      headers
    })

    return { success: true, result }
  } catch (error) {
    console.error('Error demoting user to regular user role:', error)
    throw new Error('Failed to demote user to regular user role')
  }
}

export async function updateEmailVerificationStatus(data: { userId: string; emailVerified: boolean }, headers: Headers) {
  try {
    // Keep authorization inside Better Auth's admin endpoint. In particular, do
    // not reduce this mutation to a mere "has a session" database write.
    const result = await (auth.api as any).adminUpdateUser({
      body: {
        userId: data.userId,
        data: {
          emailVerified: data.emailVerified,
        },
      },
      headers,
    })

    return { success: true, result }
  } catch (error) {
    console.error('Error updating email verification status:', error)
    throw new Error(`Failed to update email verification status: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Export the authorized management view as User for backward compatibility
// with the legacy component and route names.
export type User = AdminManagedUser
