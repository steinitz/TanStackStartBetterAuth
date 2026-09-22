import {
  queryOptions,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import { useEffect } from 'react'
import { useSession } from './auth-client'
import { getTransactions, getWalletStatus } from './wallet'
import { WALLET_EVENTS, type AnnouncedBalance } from './wallet-client'
import type { WalletStatus } from './wallet-contracts'

const walletQueryDefaults = {
  retry: false,
  staleTime: Infinity,
  gcTime: 0,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
} as const

export const walletKeys = {
  all: ['wallet'] as const,
  user: (userId: string) => [...walletKeys.all, userId] as const,
  status: (userId: string, timezoneOffset: number) =>
    [...walletKeys.user(userId), 'status', timezoneOffset] as const,
  transactions: (userId: string) =>
    [...walletKeys.user(userId), 'transactions'] as const,
}

export function getBrowserTimezoneOffset() {
  if (typeof window === 'undefined') return null

  // Send offset in milliseconds (inverted from minutes).
  // e.g. UTC+11 is -660 mins. -(-660) * 60 * 1000 = +39600000 ms.
  return -new Date().getTimezoneOffset() * 60 * 1000
}

export function walletStatusQueryOptions(
  userId: string | undefined,
  timezoneOffset: number | null,
) {
  const isEnabled = Boolean(userId && timezoneOffset !== null)

  return queryOptions({
    queryKey: userId && timezoneOffset !== null
      ? walletKeys.status(userId, timezoneOffset)
      : ([...walletKeys.all, null, 'status'] as const),
    queryFn: async () => {
      if (!userId || timezoneOffset === null) {
        throw new Error('Wallet status requires a signed-in browser session')
      }

      return getWalletStatus({ data: timezoneOffset })
    },
    enabled: isEnabled,
    ...walletQueryDefaults,
  })
}

export function transactionsQueryOptions(
  userId: string | undefined,
  isWalletReady = true,
) {
  const isEnabled = Boolean(
    userId &&
    isWalletReady &&
    typeof window !== 'undefined'
  )

  return queryOptions({
    queryKey: userId && typeof window !== 'undefined'
      ? walletKeys.transactions(userId)
      : ([...walletKeys.all, null, 'transactions'] as const),
    queryFn: async () => {
      if (!userId) {
        throw new Error('Transactions require a signed-in session')
      }

      return getTransactions()
    },
    enabled: isEnabled,
    ...walletQueryDefaults,
  })
}

/**
 * Refreshes every active wallet resource for one user after an authoritative
 * mutation. Cancellation must finish first: invalidating an initially pending
 * query can otherwise deduplicate onto its pre-mutation request.
 */
export async function refreshWalletQueries(queryClient: QueryClient, userId: string) {
  const queryKey = walletKeys.user(userId)
  const statusKey = [...queryKey, 'status'] as const

  await queryClient.cancelQueries({ queryKey })

  // Wallet status may create today's lazy grant. Let every active status read settle before
  // refreshing the ledger, so the history cannot snapshot the instant before that write.
  try {
    await queryClient.invalidateQueries(
      { queryKey: statusKey },
      { throwOnError: true },
    )
  } catch {
    // The status Query already owns and exposes the error. Keep the ledger at the same older
    // snapshot rather than publishing new history beside a balance that could not be refreshed.
    return
  }

  await queryClient.invalidateQueries({
    queryKey: walletKeys.transactions(userId),
  })
}

/**
 * Writes a balance a charged server call brought home into that user's wallet status, so the
 * display keeps up without another call. The status queries differ only by timezone offset, so
 * each of that user's is written.
 */
export function applyAnnouncedBalance(queryClient: QueryClient, { userId, credits }: AnnouncedBalance) {
  queryClient.setQueriesData<WalletStatus>(
    { queryKey: [...walletKeys.user(userId), 'status'] },
    (status) => (status ? { ...status, credits } : status),
  )
}

/**
 * Whether the balance she was last told is known to be zero, for a refusal that makes no server
 * call of its own.
 *
 * A zero learned before her day began is not known: today's grant is owed, and the next charge
 * applies it before taking anything. A page left open overnight would otherwise refuse her the
 * morning's grant. Her day is her browser's, the same local day the server counts the grant in.
 * A balance not yet read is not zero either.
 */
export function isKnownOutOfCredits(
  credits: number | null | undefined,
  learnedAt: number,
  now: number,
): boolean {
  if (credits == null || credits > 0) return false
  return learnedAt >= new Date(now).setHours(0, 0, 0, 0)
}

function createRefreshWallet(queryClient: QueryClient, userId: string | undefined) {
  return async () => {
    if (!userId) return

    await refreshWalletQueries(queryClient, userId)
  }
}

/**
 * Gives mutation producers the wallet-family refresh action without making
 * them observers of wallet status.
 */
export function useRefreshWallet() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()

  return createRefreshWallet(queryClient, session?.user?.id)
}

export function useWallet() {
  const { data: session } = useSession()
  const userId = session?.user?.id
  const queryClient = useQueryClient()
  const query = useQuery(walletStatusQueryOptions(userId, getBrowserTimezoneOffset()))
  const refreshWallet = createRefreshWallet(queryClient, userId)

  useEffect(() => {
    const onBalance = (event: Event) =>
      applyAnnouncedBalance(queryClient, (event as CustomEvent<AnnouncedBalance>).detail)
    window.addEventListener(WALLET_EVENTS.BALANCE, onBalance)
    return () => window.removeEventListener(WALLET_EVENTS.BALANCE, onBalance)
  }, [queryClient])

  return {
    ...query,
    wallet: query.data ?? null,
    credits: query.data?.credits ?? null,
    // A function, read when she acts rather than when the page rendered: the page can sit open
    // across her midnight.
    isOutOfCredits: () => isKnownOutOfCredits(query.data?.credits, query.dataUpdatedAt, Date.now()),
    refreshWallet,
  }
}

export function useTransactions() {
  const { data: session } = useSession()
  const userId = session?.user?.id
  const timezoneOffset = getBrowserTimezoneOffset()
  const walletRefreshQuery = useQuery({
    ...walletStatusQueryOptions(userId, timezoneOffset),
    // Entering Credits is a deliberate server-truth boundary. This observer shares the
    // header's status cache, but unlike the long-lived header it treats that cache as stale.
    staleTime: 0,
  })
  const isWalletReady = walletRefreshQuery.isSuccess && !walletRefreshQuery.isFetching
  const query = useQuery(transactionsQueryOptions(userId, isWalletReady))

  return {
    ...query,
    transactions: isWalletReady ? query.data : undefined,
    isPending: walletRefreshQuery.isPending || walletRefreshQuery.isFetching || query.isPending,
    isError: walletRefreshQuery.isError || query.isError,
    error: walletRefreshQuery.error ?? query.error,
  }
}
