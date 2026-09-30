import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import React from 'react'
import { UserBlock, signOutTimeoutMs } from '../../components/Other/userBlock'

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

  // The signed-in state both sign-out tests start from.
  const renderSignedIn = () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: 'user-1', email: 'test@example.com' } }
    } as any)
    vi.mocked(useWallet).mockReturnValue({ wallet: null } as any)
    return render(<UserBlock />)
  }

  // The account trigger — the control that stays on screen. `Disclosure` renders it inside
  // <summary>, and that is the whole point of these two tests: the Sign Out row is inside a
  // panel that closes on click, so a spinner there would replace something already gone.
  const triggerSpinner = (container: HTMLElement) =>
    container.querySelector('summary [data-busy-spinner]')

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

  // The app's warning before she runs out: the trigger she always sees, and the readout inside.
  describe('running low', () => {
    const renderWithCredits = (credits: number, lowCreditsWarning?: number) => {
      vi.mocked(useSession).mockReturnValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } }
      } as any)
      vi.mocked(useWallet).mockReturnValue({ wallet: { credits, welcomeClaimed: false } } as any)
      return render(<UserBlock lowCreditsWarning={lowCreditsWarning} />)
    }
    const triggerIcon = (container: HTMLElement) => container.querySelector('summary i')
    const readout = (container: HTMLElement) =>
      Array.from(container.querySelectorAll('span')).find((span) => /Credits/.test(span.textContent ?? ''))

    it('turns the icon into an orange fuel pump, and the credits orange, below the threshold', () => {
      const { container } = renderWithCredits(21, 34)

      expect(triggerIcon(container)?.className).toContain('fa-gas-pump')
      expect((triggerIcon(container)?.parentElement as HTMLElement).style.color).toBe('var(--color-warning)')
      expect(readout(container)?.style.color).toBe('var(--color-warning)')
    })

    it('keeps its name, Account, so a screen reader and the tests still find it', () => {
      const { container } = renderWithCredits(21, 34)

      expect(container.querySelector('summary')?.getAttribute('aria-label')).toBe('Account')
    })

    it('stays the user icon at the threshold and above, and when the app sets none', () => {
      for (const [credits, threshold] of [[34, 34], [100, 34], [0, undefined]] as const) {
        const { container, unmount } = renderWithCredits(credits, threshold)

        expect(triggerIcon(container)?.className).toContain('fa-user')
        expect(readout(container)?.style.color).toBe('')
        unmount()
      }
    })
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
        timeout: signOutTimeoutMs,
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

  it('shows a spinner on the account trigger for the whole sign-out', async () => {
    let resolveSignOut!: (result: unknown) => void
    vi.mocked(signOut).mockReturnValue(new Promise((resolve) => {
      resolveSignOut = resolve
    }) as any)

    const { container, getByText } = renderSignedIn()

    expect(triggerSpinner(container)).toBeNull()

    getByText('Sign Out').click()

    await waitFor(() => {
      expect(triggerSpinner(container)).not.toBeNull()
    })

    resolveSignOut({ data: { success: true }, error: null })

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith({ to: '/auth/signin' })
    })
    expect(triggerSpinner(container)).toBeNull()
  })

  it('starts one sign-out however many times the link is clicked', async () => {
    // Three clicks in one tick, which is the case a useState flag cannot catch: each handler
    // closes over the value from its own render, so the second and third would still see
    // false. If this passes with the guard removed, it is not testing what it says.
    vi.mocked(signOut).mockReturnValue(new Promise(() => {}) as any)

    const { getByText } = renderSignedIn()
    const signOutLink = getByText('Sign Out')

    signOutLink.click()
    signOutLink.click()
    signOutLink.click()

    expect(signOut).toHaveBeenCalledTimes(1)
  })
})
