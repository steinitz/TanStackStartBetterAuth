import {
  queryOptions,
  useQuery,
  type QueryClient,
} from '@tanstack/react-query'
import { useSession } from './auth-client'
import {
  getAdminStatus,
  lookupAdminCreditTarget,
  previewLedgerPurge,
} from './admin'
import type { AdminStatus } from './admin-identity'
import type { WalletStatus } from './wallet-contracts'
import { walletKeys } from './wallet-queries'

const signedOutAdminStatus: AdminStatus = {
  isAdmin: false,
  source: 'none',
}

export const adminCreditKeys = {
  all: ['admin-credit'] as const,
  target: (userId: string) => [...adminCreditKeys.all, 'target', userId] as const,
  purgePreview: (userId: string) =>
    [...adminCreditKeys.all, 'purge-preview', userId] as const,
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

export function adminCreditTargetQueryOptions(userId: string | undefined) {
  return queryOptions({
    queryKey: userId
      ? adminCreditKeys.target(userId)
      : ([...adminCreditKeys.all, 'target', null] as const),
    queryFn: async () => {
      if (!userId) throw new Error('A confirmed target user ID is required')
      return lookupAdminCreditTarget({ data: { userId } })
    },
    enabled: Boolean(userId && typeof window !== 'undefined'),
    retry: false,
    staleTime: Infinity,
    gcTime: 0,
  })
}

export function ledgerPurgePreviewQueryOptions(
  userId: string | undefined,
  isAdmin: boolean,
) {
  return queryOptions({
    queryKey: userId
      ? adminCreditKeys.purgePreview(userId)
      : ([...adminCreditKeys.all, 'purge-preview', null] as const),
    queryFn: () => previewLedgerPurge(),
    enabled: Boolean(userId && isAdmin && typeof window !== 'undefined'),
    retry: false,
    staleTime: 0,
    gcTime: 0,
  })
}

export async function refreshAdminCreditTarget(
  queryClient: QueryClient,
  userId: string,
) {
  const queryKey = adminCreditKeys.target(userId)
  await queryClient.cancelQueries({ queryKey })
  await queryClient.invalidateQueries({ queryKey })
}

export async function applyLedgerPurgeResultToQueries(
  queryClient: QueryClient,
  result: { userId: string; credits: 0 },
) {
  const statusKey = [...walletKeys.user(result.userId), 'status'] as const

  queryClient.setQueriesData<WalletStatus>(
    { queryKey: statusKey },
    (current) => current ? { ...current, credits: 0 } : current,
  )
  queryClient.setQueryData(walletKeys.transactions(result.userId), [])
  queryClient.setQueryData(
    adminCreditKeys.target(result.userId),
    (current: { credits: number } | undefined) =>
      current ? { ...current, credits: 0 } : current,
  )

  // Refetch only the non-grant-bearing ledger. Invalidating wallet status here would
  // immediately create a new daily grant and make the purge's zero result untruthful.
  await queryClient.refetchQueries({
    queryKey: walletKeys.transactions(result.userId),
    type: 'active',
  })
}
