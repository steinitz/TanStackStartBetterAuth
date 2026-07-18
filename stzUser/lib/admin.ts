import { createServerFn } from '@tanstack/react-start'
import { getCurrentAdminStatus } from './server-auth'

export const getAdminStatus = createServerFn({ method: 'GET' })
  .handler(() => getCurrentAdminStatus())
