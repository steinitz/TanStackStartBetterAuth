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

import { TransactionLedger } from '~stzUser/components/RouteComponents/TransactionLedger'
import { useSession } from '~stzUser/lib/auth-client'
import { getTransactions, getWalletStatus, type WalletTransaction } from '~stzUser/lib/wallet'
import {
  refreshWalletQueries,
  transactionsQueryOptions,
  useTransactions,
  useWallet,
  walletKeys,
} from '~stzUser/lib/wallet-queries'

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

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise
  })

  return { promise, resolve }
}

const transaction: WalletTransaction = {
  id: 'transaction-1',
  user_id: 'user-1',
  amount: 10,
  type: 'purchase',
  description: 'Card purchase',
  created_at: '2026-07-16T00:00:00.000Z',
  stripe_payment_intent_id: 'pi_1',
}

describe('transaction queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useSession).mockReturnValue({ data: null } as any)
    vi.mocked(getWalletStatus).mockResolvedValue({
      credits: 10,
      welcomeClaimed: false,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('disables transaction reads while signed out', () => {
    const queryClient = createQueryClient()
    const { result } = renderHook(() => useTransactions(), {
      wrapper: wrapperFor(queryClient),
    })

    expect(getTransactions).not.toHaveBeenCalled()
    expect(result.current.transactions).toBeUndefined()
  })

  it('fetches one ledger shared by multiple observers for the same user', async () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: 'user-1' } },
    } as any)
    vi.mocked(getTransactions).mockResolvedValue([transaction])
    const queryClient = createQueryClient()

    function TransactionsProbe() {
      const { transactions } = useTransactions()
      return <p>{transactions?.length ?? 'pending'}</p>
    }

    const view = render(
      <QueryClientProvider client={queryClient}>
        <TransactionsProbe />
        <TransactionsProbe />
      </QueryClientProvider>,
    )

    await waitFor(() => expect(view.getAllByText('1')).toHaveLength(2))
    expect(getTransactions).toHaveBeenCalledTimes(1)
  })

  it('refreshes active wallet and transaction observers as one user family', async () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: 'user-1' } },
    } as any)
    vi.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(0)
    vi.mocked(getWalletStatus)
      .mockResolvedValueOnce({ credits: 10, welcomeClaimed: false })
      .mockResolvedValueOnce({ credits: 20, welcomeClaimed: true })
    vi.mocked(getTransactions)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([transaction])
    const queryClient = createQueryClient()
    const { result } = renderHook(() => ({
      wallet: useWallet(),
      ledger: useTransactions(),
    }), {
      wrapper: wrapperFor(queryClient),
    })

    await waitFor(() => {
      expect(result.current.wallet.credits).toBe(10)
      expect(result.current.ledger.transactions).toEqual([])
    })

    await act(async () => {
      await result.current.wallet.refreshWallet()
    })

    await waitFor(() => {
      expect(result.current.wallet.credits).toBe(20)
      expect(result.current.ledger.transactions).toEqual([transaction])
    })
    expect(getWalletStatus).toHaveBeenCalledTimes(2)
    expect(getTransactions).toHaveBeenCalledTimes(2)
  })

  it('protects an initially pending ledger read from its pre-mutation result', async () => {
    const queryClient = createQueryClient()
    const firstRead = deferred<WalletTransaction[]>()
    const postMutationRead = deferred<WalletTransaction[]>()
    vi.mocked(getTransactions)
      .mockReturnValueOnce(firstRead.promise as ReturnType<typeof getTransactions>)
      .mockReturnValueOnce(postMutationRead.promise as ReturnType<typeof getTransactions>)
    const observer = new QueryObserver(queryClient, transactionsQueryOptions('user-1'))
    const unsubscribe = observer.subscribe(() => undefined)

    await waitFor(() => expect(getTransactions).toHaveBeenCalledTimes(1))

    const refresh = refreshWalletQueries(queryClient, 'user-1')
    await waitFor(() => expect(getTransactions).toHaveBeenCalledTimes(2))

    postMutationRead.resolve([transaction])
    await refresh
    expect(queryClient.getQueryData(walletKeys.transactions('user-1'))).toEqual([transaction])

    firstRead.resolve([])
    await firstRead.promise
    await Promise.resolve()
    expect(queryClient.getQueryData(walletKeys.transactions('user-1'))).toEqual([transaction])

    unsubscribe()
  })
})

describe('TransactionLedger', () => {
  it('renders loading, error, empty and populated states distinctly', () => {
    const view = render(
      <TransactionLedger transactions={undefined} isPending={true} isError={false} />,
    )
    expect(view.getByText('Loading transactions...')).toBeInTheDocument()

    view.rerender(
      <TransactionLedger transactions={undefined} isPending={false} isError={true} />,
    )
    expect(view.getByText(/could not be loaded/i)).toBeInTheDocument()
    expect(view.queryByText('No transactions found.')).not.toBeInTheDocument()

    view.rerender(
      <TransactionLedger transactions={[]} isPending={false} isError={false} />,
    )
    expect(view.getByText('No transactions found.')).toBeInTheDocument()

    view.rerender(
      <TransactionLedger transactions={[transaction]} isPending={false} isError={false} />,
    )
    expect(view.getByText('Card purchase')).toBeInTheDocument()
    expect(view.getByText('+10')).toBeInTheDocument()
  })
})
