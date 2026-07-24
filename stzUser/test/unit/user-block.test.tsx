import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import React from 'react'
import { UserBlock } from '../../components/Other/userBlock'

const { navigate } = vi.hoisted(() => ({
  navigate: vi.fn(),
}))

// Mocking TanStack Router and Auth
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, onClick, to }: any) => <a href={to} onClick={onClick}>{children}</a>,
  useNavigate: () => navigate,
}))

vi.mock('~stzUser/lib/auth-client', () => ({
  useSession: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock('~stzUser/lib/wallet-queries', () => ({
  useWallet: vi.fn(),
}))

import { signOut, useSession } from '~stzUser/lib/auth-client'
import { useWallet } from '~stzUser/lib/wallet-queries'

describe('UserBlock & WalletWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(window, 'alert').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should render user email and wallet status when logged in', () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: 'user-1', email: 'test@example.com' } }
    } as any)

    vi.mocked(useWallet).mockReturnValue({
      wallet: { credits: 50, welcomeClaimed: false },
    } as any)

    const { getByText } = render(<UserBlock />)

    expect(getByText('test@example.com')).toBeDefined()

    expect(getByText(/50 Credits/i)).toBeDefined()
  })

  it('should render Sign In link when logged out', () => {
    vi.mocked(useSession).mockReturnValue({ data: null } as any)
    vi.mocked(useWallet).mockReturnValue({ wallet: null } as any)

    const { getByText } = render(<UserBlock />)

    expect(getByText(/Sign In/i)).toBeDefined()
  })

  it('prevents link navigation and waits for confirmed sign-out before navigating', async () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: 'user-1', email: 'test@example.com' } }
    } as any)
    vi.mocked(useWallet).mockReturnValue({ wallet: null } as any)

    let resolveSignOut!: (result: unknown) => void
    vi.mocked(signOut).mockReturnValue(new Promise((resolve) => {
      resolveSignOut = resolve
    }) as any)

    const { getByText } = render(<UserBlock />)
    const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true })
    getByText('Sign Out').dispatchEvent(clickEvent)

    expect(clickEvent.defaultPrevented).toBe(true)
    expect(signOut).toHaveBeenCalledWith({
      fetchOptions: {
        timeout: 10_000,
      },
    })
    expect(navigate).not.toHaveBeenCalled()

    resolveSignOut({ data: { success: true }, error: null })

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith({ to: '/auth/signin' })
    })
    expect(window.alert).not.toHaveBeenCalled()
  })

  it('reports a returned Better Auth error without navigating', async () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: 'user-1', email: 'test@example.com' } }
    } as any)
    vi.mocked(useWallet).mockReturnValue({ wallet: null } as any)
    vi.mocked(signOut).mockResolvedValue({
      data: null,
      error: { message: 'Server unavailable' },
    } as any)

    const { getByText } = render(<UserBlock />)
    getByText('Sign Out').click()

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(
        'Sign-out could not be confirmed. Please try again.',
      )
    })
    expect(navigate).not.toHaveBeenCalled()
  })

  it('reports a rejected network request without navigating', async () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: 'user-1', email: 'test@example.com' } }
    } as any)
    vi.mocked(useWallet).mockReturnValue({ wallet: null } as any)
    vi.mocked(signOut).mockRejectedValue(new TypeError('Failed to fetch'))

    const { getByText } = render(<UserBlock />)
    getByText('Sign Out').click()

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(
        'Sign-out could not be confirmed. Please try again.',
      )
    })
    expect(navigate).not.toHaveBeenCalled()
  })
})
