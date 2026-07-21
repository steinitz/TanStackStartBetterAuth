'use client'

import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { queryOptions } from '@tanstack/react-query'
import * as v from 'valibot'
import { getAllUsers, deleteUserById, setUserRole, demoteUserToUserRole, updateEmailVerificationStatus, type User } from './users'
import {userRolesType} from '~stzUser/constants'

export const UpdateEmailVerificationStatusSchema = v.strictObject({
  userId: v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty('User ID is required'),
    v.maxLength(255, 'User ID is too long'),
  ),
  emailVerified: v.boolean(),
})

// Client-side server functions that call the server functions
export const useGetAllUsers = createServerFn({
  method: 'GET',
}).handler(async () => {
  // Better Auth requires authentication headers for admin operations like listUsers
  // getRequest() provides access to the incoming HTTP request context,
  // including cookies and session data needed for authentication
  // This is required because Better Auth's admin.listUsers API validates
  // that the requesting user has admin privileges before returning user data
  const request = getRequest()
  if (!request?.headers) {
    throw new Error('Request headers not available')
  }
  
  return await getAllUsers(request.headers)
})

export const userManagementKeys = {
  all: ['user-management'] as const,
  users: () => [...userManagementKeys.all, 'users'] as const,
}

export function adminUsersQueryOptions(isAdmin: boolean) {
  return queryOptions({
    queryKey: userManagementKeys.users(),
    queryFn: () => useGetAllUsers(),
    enabled: Boolean(isAdmin && typeof window !== 'undefined'),
    retry: false,
    staleTime: 0,
  })
}

export const useDeleteUserById = createServerFn({ method: 'POST' })
  .inputValidator((userId: string) => userId)
  .handler(async ({ data: userId }) => {
    // Get request context for authentication
    const request = getRequest()
    if (!request?.headers) {
      throw new Error('Request headers not available')
    }
    
    return await deleteUserById(userId, request.headers)
  })

export const useSetUserRole = createServerFn({ method: 'POST' })
  .inputValidator((data: { userId: string; role: userRolesType }) => data)
  .handler(async ({ data }) => {
    // Get request context for authentication
    const request = getRequest()
    if (!request?.headers) {
      throw new Error('Request headers not available')
    }
    
    return await setUserRole(data, request.headers)
  })

export const useDemoteUserToUserRole = createServerFn({ method: 'POST' })
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data }) => {
    // Get request context for authentication
    const request = getRequest()
    if (!request?.headers) {
      throw new Error('Request headers not available')
    }
    
    return await demoteUserToUserRole(data, request.headers)
  })

export const useUpdateEmailVerificationStatus = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => v.parse(UpdateEmailVerificationStatusSchema, data))
  .handler(async ({ data }) => {
    // Get request context for authentication
    const request = getRequest()
    if (!request?.headers) {
      throw new Error('Request headers not available')
    }
    
    return await updateEmailVerificationStatus(data, request.headers)
  })

// Re-export the User type for convenience
export type { User }
