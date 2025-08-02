'use client'

import { createServerFn } from '@tanstack/react-start'
import { getWebRequest } from '@tanstack/react-start/server'
import { getAllUsers, deleteUserById, setUserRole, demoteUserToUserRole, type User } from './users'
import {userRolesType} from '~stzUser/constants'

// Client-side server functions that call the server functions
export const useGetAllUsers = createServerFn({
  method: 'GET',
}).handler(async () => {
  return await getAllUsers()
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

// Re-export the User type for convenience
export type { User }