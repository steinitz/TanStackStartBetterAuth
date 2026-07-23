import {
  QueryClient,
  QueryClientProvider,
  QueryObserver,
} from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('~stzUser/lib/auth-client', () => ({
  useSession: vi.fn(),
}))

vi.mock('~stzUser/lib/admin', () => ({
  getAdminStatus: vi.fn(),
  lookupAdminCreditTarget: vi.fn(),
  previewLedgerPurge: vi.fn(),
}))

vi.mock('~stzUser/lib/wallet', () => ({
  getTransactions: vi.fn(),
  getWalletStatus: vi.fn(),
}))

import { useSession } from '~stzUser/lib/auth-client'
import { getAdminStatus } from '~stzUser/lib/admin'
import {
  adminCreditKeys,
  applyLedgerPurgeResultToQueries,
  useAdminStatus,
} from '~stzUser/lib/admin-queries'
import { getTransactions, getWalletStatus } from '~stzUser/lib/wallet'
import {
  transactionsQueryOptions,
  walletKeys,
} from '~stzUser/lib/wallet-queries'

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
}

function wrapperFor(queryClient: QueryClient) {
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('admin status query', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useSession).mockReturnValue({ data: null } as any)
  })

  it('does not call the server or invent admin access while signed out', () => {
    const { result } = renderHook(() => useAdminStatus(), {
      wrapper: wrapperFor(createQueryClient()),
    })

    expect(getAdminStatus).not.toHaveBeenCalled()
    expect(result.current.data).toEqual({ isAdmin: false, source: 'none' })
  })

  it('returns only the signed-in user effective status', async () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: 'environment-admin' } },
    } as any)
    vi.mocked(getAdminStatus).mockResolvedValue({
      isAdmin: true,
      source: 'environment',
    })

    const { result } = renderHook(() => useAdminStatus(), {
      wrapper: wrapperFor(createQueryClient()),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({
      isAdmin: true,
      source: 'environment',
    })
    expect(getAdminStatus).toHaveBeenCalledOnce()
  })
})

describe('ledger purge query cache handling', () => {
  it('sets wallet status to zero and refetches only the non-grant-bearing ledger', async () => {
    const queryClient = createQueryClient()
    const transaction = {
      id: 'transaction-1',
      user_id: 'admin-user',
      amount: 10,
      type: 'manual_adjustment' as const,
      description: 'Test adjustment',
      created_at: '2026-07-19T00:00:00.000Z',
      stripe_payment_intent_id: null,
    }
    queryClient.setQueryData(walletKeys.status('admin-user', 0), {
      credits: 10,
      welcomeClaimed: true,
    })
    queryClient.setQueryData(walletKeys.status('admin-user', 36_000_000), {
      credits: 10,
      welcomeClaimed: true,
    })
    queryClient.setQueryData(walletKeys.transactions('admin-user'), [transaction])
    queryClient.setQueryData(adminCreditKeys.target('admin-user'), {
      id: 'admin-user',
      name: 'Admin',
      email: 'admin@example.com',
      credits: 10,
    })
    vi.mocked(getTransactions).mockResolvedValue([])

    const observer = new QueryObserver(
      queryClient,
      transactionsQueryOptions('admin-user'),
    )
    const unsubscribe = observer.subscribe(() => undefined)

    await applyLedgerPurgeResultToQueries(queryClient, {
      userId: 'admin-user',
      credits: 0,
    })

    expect(queryClient.getQueryData(walletKeys.status('admin-user', 0))).toEqual({
      credits: 0,
      welcomeClaimed: true,
    })
    expect(queryClient.getQueryData(walletKeys.status('admin-user', 36_000_000))).toEqual({
      credits: 0,
      welcomeClaimed: true,
    })
    expect(queryClient.getQueryData(walletKeys.transactions('admin-user'))).toEqual([])
    expect(queryClient.getQueryData(adminCreditKeys.target('admin-user'))).toMatchObject({
      credits: 0,
    })
    expect(getTransactions).toHaveBeenCalledOnce()
    expect(getWalletStatus).not.toHaveBeenCalled()

    unsubscribe()
  })
})
