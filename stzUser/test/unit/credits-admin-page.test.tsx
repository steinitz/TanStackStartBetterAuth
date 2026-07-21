import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('~stzUser/lib/auth-client', () => ({
  useSession: vi.fn(),
}))

vi.mock('~stzUser/lib/admin', () => ({
  PURGE_LEDGER_CONFIRMATION: 'PURGE MY LEDGER',
  getAdminStatus: vi.fn(),
  lookupAdminCreditTarget: vi.fn(),
  previewLedgerPurge: vi.fn(),
  addCredits: vi.fn(),
  removeCredits: vi.fn(),
  purgeLedger: vi.fn(),
}))

vi.mock('~stzUser/lib/wallet', () => ({
  getTransactions: vi.fn(),
  getWalletStatus: vi.fn(),
}))

import { CreditsAdminPage } from '~stzUser/components/RouteComponents/CreditsAdminPage'
import {
  addCredits,
  getAdminStatus,
  lookupAdminCreditTarget,
  previewLedgerPurge,
  purgeLedger,
  removeCredits,
} from '~stzUser/lib/admin'
import { useSession } from '~stzUser/lib/auth-client'
import { getWalletStatus } from '~stzUser/lib/wallet'

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

function wrapper(queryClient: QueryClient) {
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

function renderPage() {
  const queryClient = createQueryClient()
  return {
    queryClient,
    view: render(<CreditsAdminPage />, { wrapper: wrapper(queryClient) }),
  }
}

describe('CreditsAdminPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: {
          id: 'admin-user',
          email: 'admin@example.com',
          role: 'admin',
        },
      },
    } as any)
    vi.mocked(getAdminStatus).mockResolvedValue({
      isAdmin: true,
      source: 'role',
    })
    vi.mocked(previewLedgerPurge).mockResolvedValue({
      totalRows: 4,
      stripePurchaseRows: 2,
    })
    vi.mocked(lookupAdminCreditTarget).mockResolvedValue({
      id: 'target-user',
      name: 'Target Person',
      email: 'target@example.com',
      credits: 5,
    })
  })

  it('offers user management to an environment administrator', async () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: {
          id: 'environment-admin',
          email: 'environment@example.com',
          role: 'user',
        },
      },
    } as any)
    vi.mocked(getAdminStatus).mockResolvedValue({
      isAdmin: true,
      source: 'environment',
    })

    const { view } = renderPage()

    expect(await view.findByRole('link', { name: 'View Users' }))
      .toHaveAttribute('href', '/auth/users')
    expect(view.getByText(/effective admin via environment configuration/))
      .toBeInTheDocument()
  })

  it('requires an exact lookup and clears confirmation as soon as the ID changes', async () => {
    const { view } = renderPage()

    await view.findByRole('heading', { name: 'Credit administration' })
    const addButton = view.getByRole('button', { name: 'Add credits' })
    const removeButton = view.getByRole('button', { name: 'Remove credits' })
    expect(addButton).toBeDisabled()
    expect(removeButton).toBeDisabled()

    fireEvent.change(view.getByLabelText('Exact user ID'), {
      target: { value: 'target-user' },
    })
    fireEvent.click(view.getByRole('button', { name: 'Look up user' }))

    await view.findByText('Target Person')
    expect(view.getByText(/Cached balance:/)).toHaveTextContent('5 credits')
    expect(addButton).toBeEnabled()
    expect(removeButton).toBeEnabled()

    fireEvent.change(view.getByLabelText('Exact user ID'), {
      target: { value: 'target-user-edited' },
    })

    expect(view.queryByText('Target Person')).not.toBeInTheDocument()
    expect(addButton).toBeDisabled()
    expect(removeButton).toBeDisabled()
  })

  it('refreshes the confirmed target after reversible add and remove mutations', async () => {
    vi.mocked(lookupAdminCreditTarget)
      .mockResolvedValueOnce({
        id: 'target-user',
        name: 'Target Person',
        email: 'target@example.com',
        credits: 5,
      })
      .mockResolvedValueOnce({
        id: 'target-user',
        name: 'Target Person',
        email: 'target@example.com',
        credits: 15,
      })
      .mockResolvedValueOnce({
        id: 'target-user',
        name: 'Target Person',
        email: 'target@example.com',
        credits: 13,
      })
    vi.mocked(addCredits).mockResolvedValue({
      userId: 'target-user',
      amountAdded: 10,
      oldBalance: 5,
      newBalance: 15,
      description: 'Manual bank transfer',
    })
    vi.mocked(removeCredits).mockResolvedValue({
      userId: 'target-user',
      amountRemoved: 2,
      oldBalance: 15,
      newBalance: 13,
      description: 'Manual credit removal',
    })
    const { view } = renderPage()
    await view.findByRole('heading', { name: 'Credit administration' })

    fireEvent.change(view.getByLabelText('Exact user ID'), {
      target: { value: 'target-user' },
    })
    fireEvent.click(view.getByRole('button', { name: 'Look up user' }))
    await view.findByText('Target Person')

    fireEvent.click(view.getByRole('button', { name: 'Add credits' }))
    await view.findByText(/Credits added: 5 → 15 credits/)
    await waitFor(() => expect(lookupAdminCreditTarget).toHaveBeenCalledTimes(2))

    fireEvent.change(view.getByLabelText('Amount', { selector: '#admin-remove-amount' }), {
      target: { value: '2' },
    })
    fireEvent.click(view.getByRole('button', { name: 'Remove credits' }))
    await view.findByText(/Credits removed: 15 → 13 credits/)
    await waitFor(() => expect(lookupAdminCreditTarget).toHaveBeenCalledTimes(3))

    expect(addCredits).toHaveBeenCalledWith({
      data: {
        userId: 'target-user',
        amount: 10,
        description: 'Manual bank transfer',
      },
    })
    expect(removeCredits).toHaveBeenCalledWith({
      data: {
        userId: 'target-user',
        amount: 2,
        description: 'Manual credit removal',
      },
    })
  })

  it('warns about both Stripe losses and requires the exact purge phrase', async () => {
    vi.mocked(purgeLedger).mockResolvedValue({
      userId: 'admin-user',
      deletedRows: 4,
      deletedStripePurchaseRows: 2,
      credits: 0,
    })
    const { view } = renderPage()

    await view.findByText(/2 Stripe purchase rows/)
    expect(view.getByText(/record that those payments were received/)).toBeInTheDocument()
    expect(view.getByText(/PaymentIntent identifiers/)).toBeInTheDocument()

    const purgeButton = view.getByRole('button', { name: 'Purge ledger' })
    expect(purgeButton).toBeDisabled()
    fireEvent.change(view.getByLabelText(/Type.*PURGE MY LEDGER.*to confirm/), {
      target: { value: 'PURGE MY LEDGER' },
    })
    expect(purgeButton).toBeEnabled()
    fireEvent.click(purgeButton)

    await view.findByText(/Purged 4 ledger rows/)
    expect(purgeLedger).toHaveBeenCalledWith({
      data: { confirmation: 'PURGE MY LEDGER' },
    })
    expect(getWalletStatus).not.toHaveBeenCalled()
  })
})
