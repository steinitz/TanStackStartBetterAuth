import { queryOptions, useQuery } from '@tanstack/react-query'
import { useSession } from './auth-client'
import { getAdminStatus } from './admin'
import type { AdminStatus } from './admin-identity'

const signedOutAdminStatus: AdminStatus = {
  isAdmin: false,
  source: 'none',
}

export function adminStatusQueryOptions(userId: string | undefined) {
  return queryOptions({
    queryKey: ['admin-status', userId ?? 'signed-out'],
    queryFn: () => getAdminStatus(),
    enabled: Boolean(userId && typeof window !== 'undefined'),
    retry: false,
    staleTime: Infinity,
    gcTime: 0,
  })
}

export function useAdminStatus() {
  const { data: session } = useSession()
  const userId = session?.user?.id
  const query = useQuery(adminStatusQueryOptions(userId))

  return {
    ...query,
    data: userId ? query.data : signedOutAdminStatus,
  }
}
