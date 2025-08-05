'use client'

import { createServerFn } from '@tanstack/react-start'
import { getWebRequest } from '@tanstack/react-start/server'
import { getAllUsers, deleteUserById, setUserRole, demoteUserToUserRole, updateEmailVerificationStatus, type User } from './users'
import {userRolesType} from '~stzUser/constants'

// Client-side server functions that call the server functions
export const useGetAllUsers = createServerFn({
  method: 'GET',
}).handler(async () => {
  // Better Auth requires authentication headers for admin operations like listUsers
  // getWebRequest() provides access to the incoming HTTP request context,
  // including cookies and session data needed for authentication
  // This is required because Better Auth's admin.listUsers API validates
  // that the requesting user has admin privileges before returning user data
  const request = getWebRequest()
  if (!request?.headers) {
    throw new Error('Request headers not available')
  }
  
  return await getAllUsers(request.headers)
})

export const useDeleteUserById = createServerFn({ method: 'POST' })
  .validator((userId: string) => userId)
  .handler(async ({ data: userId }) => {
    // Get request context for authentication
    const request = getWebRequest()
    if (!request?.headers) {
      throw new Error('Request headers not available')
    }
    
    return await deleteUserById(userId, request.headers)
  })

export const useSetUserRole = createServerFn({ method: 'POST' })
  .validator((data: { userId: string; role: userRolesType }) => data)
  .handler(async ({ data }) => {
    // Get request context for authentication
    const request = getWebRequest()
    if (!request?.headers) {
      throw new Error('Request headers not available')
    }
    
    return await setUserRole(data, request.headers)
  })

export const useDemoteUserToUserRole = createServerFn({ method: 'POST' })
  .validator((data: { userId: string }) => data)
  .handler(async ({ data }) => {
    // Get request context for authentication
    const request = getWebRequest()
    if (!request?.headers) {
      throw new Error('Request headers not available')
    }
    
    return await demoteUserToUserRole(data, request.headers)
  })

export const useUpdateEmailVerificationStatus = createServerFn({ method: 'POST' })
  .validator((data: { userId: string; emailVerified: boolean }) => data)
  .handler(async ({ data }) => {
    // Get request context for authentication
    const request = getWebRequest()
    if (!request?.headers) {
      throw new Error('Request headers not available')
    }
    
    return await updateEmailVerificationStatus(data, request.headers)
  })

// Re-export the User type for convenience
export type { User }