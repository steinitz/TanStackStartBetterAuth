import { QueryClient, QueryClientProvider, QueryObserver } from '@tanstack/react-query'
import { act, render, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('~stzUser/lib/auth-client', () => ({
  useSession: vi.fn(),
}))

vi.mock('~stzUser/lib/wallet', () => ({
  getTransactions: vi.fn(),
  getWalletStatus: vi.fn(),
}))

import { useSession } from '~stzUser/lib/auth-client'
import { getWalletStatus } from '~stzUser/lib/wallet'
import {
  refreshWalletQueries,
  useRefreshWallet,
  useWallet,
  walletKeys,
  walletStatusQueryOptions,
} from '~stzUser/lib/wallet-queries'

type Deferred<T> = {
  promise: Promise<T>
  resolve: (value: T) => void
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise
  })

  return { promise, resolve }
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

function wrapperFor(queryClient: QueryClient) {
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('wallet queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useSession).mockReturnValue({ data: null } as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('does not request or invent a balance while signed out', () => {
    const queryClient = createQueryClient()
    const { result } = renderHook(() => useWallet(), {
      wrapper: wrapperFor(queryClient),
    })

    expect(getWalletStatus).not.toHaveBeenCalled()
    expect(result.current.wallet).toBeNull()
    expect(result.current.credits).toBeNull()
  })

  it('gives signed-in producers a user-scoped refresh without observing wallet status', async () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: 'user-1' } },
    } as any)
    const queryClient = createQueryClient()
    const cancelQueries = vi.spyOn(queryClient, 'cancelQueries')
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useRefreshWallet(), {
      wrapper: wrapperFor(queryClient),
    })

    expect(getWalletStatus).not.toHaveBeenCalled()

    await act(async () => {
      await result.current()
    })

    const queryKey = walletKeys.user('user-1')
    expect(cancelQueries).toHaveBeenCalledWith({ queryKey })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey })
    expect(getWalletStatus).not.toHaveBeenCalled()
  })

  it('performs one timezone-aware read shared by multiple observers', async () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: 'user-1' } },
    } as any)
    vi.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(-660)
    vi.mocked(getWalletStatus).mockResolvedValue({
      credits: 50,
      welcomeClaimed: false,
    })
    const queryClient = createQueryClient()

    function WalletProbe() {
      const { credits } = useWallet()
      return <p>{credits ?? 'pending'}</p>
    }

    const view = render(
      <QueryClientProvider client={queryClient}>
        <WalletProbe />
        <WalletProbe />
      </QueryClientProvider>,
    )

    expect(await view.findAllByText('50')).toHaveLength(2)
    expect(getWalletStatus).toHaveBeenCalledTimes(1)
    expect(getWalletStatus).toHaveBeenCalledWith({ data: 39_600_000 })
  })

  it('does not display or retain the previous user wallet after identity changes', async () => {
    let userId = 'user-1'
    vi.mocked(useSession).mockImplementation(() => ({
      data: { user: { id: userId } },
    }) as any)
    vi.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(0)

    const secondWallet = deferred<{ credits: number; welcomeClaimed: boolean }>()
    vi.mocked(getWalletStatus)
      .mockResolvedValueOnce({ credits: 10, welcomeClaimed: false })
      .mockReturnValueOnce(secondWallet.promise as ReturnType<typeof getWalletStatus>)

    const queryClient = createQueryClient()
    const { result, rerender } = renderHook(() => useWallet(), {
      wrapper: wrapperFor(queryClient),
    })

    await waitFor(() => expect(result.current.credits).toBe(10))

    userId = 'user-2'
    rerender()

    expect(result.current.wallet).toBeNull()
    expect(result.current.credits).toBeNull()
    await waitFor(() => {
      expect(queryClient.getQueryData(walletKeys.status('user-1', 0))).toBeUndefined()
    })

    await act(async () => {
      secondWallet.resolve({ credits: 20, welcomeClaimed: true })
    })
    await waitFor(() => expect(result.current.credits).toBe(20))
  })

  it('keeps wallet errors distinct from a real zero-credit balance', async () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: 'user-1' } },
    } as any)
    vi.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(0)
    vi.mocked(getWalletStatus).mockRejectedValue(new Error('wallet unavailable'))
    const queryClient = createQueryClient()
    const { result } = renderHook(() => useWallet(), {
      wrapper: wrapperFor(queryClient),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.wallet).toBeNull()
    expect(result.current.credits).toBeNull()
  })

  it('cancels an initially pending read before invalidation and ignores its late result', async () => {
    const queryClient = createQueryClient()
    const firstRead = deferred<{ credits: number; welcomeClaimed: boolean }>()
    const postMutationRead = deferred<{ credits: number; welcomeClaimed: boolean }>()
    let calls = 0
    const options = {
      ...walletStatusQueryOptions('user-1', 0),
      queryFn: () => {
        calls += 1
        return calls === 1 ? firstRead.promise : postMutationRead.promise
      },
    }
    const observer = new QueryObserver(queryClient, options)
    const unsubscribe = observer.subscribe(() => undefined)

    await waitFor(() => expect(calls).toBe(1))

    const refresh = refreshWalletQueries(queryClient, 'user-1')
    await waitFor(() => expect(calls).toBe(2))

    postMutationRead.resolve({ credits: 25, welcomeClaimed: true })
    await refresh

    expect(queryClient.getQueryData(walletKeys.status('user-1', 0))).toEqual({
      credits: 25,
      welcomeClaimed: true,
    })

    firstRead.resolve({ credits: 5, welcomeClaimed: false })
    await firstRead.promise
    await Promise.resolve()

    expect(queryClient.getQueryData(walletKeys.status('user-1', 0))).toEqual({
      credits: 25,
      welcomeClaimed: true,
    })

    unsubscribe()
  })
})
