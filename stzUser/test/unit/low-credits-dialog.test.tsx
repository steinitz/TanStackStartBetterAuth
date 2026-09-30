import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

const { navigate, wallet } = vi.hoisted(() => ({
  navigate: vi.fn(),
  wallet: { credits: null as number | null },
}))

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }))
vi.mock('~stzUser/lib/wallet-queries', () => ({ useWallet: () => ({ credits: wallet.credits }) }))
vi.mock('~stzUser/lib/env', () => ({ clientEnv: { DAILY_GRANT_CREDITS: 5 } }))

import { LowCreditsDialog } from '../../components/Other/LowCreditsDialog'

const heading = () => screen.queryByRole('heading', { name: 'Running Low on Credits' })

// Renders at one balance, then moves to each of the next, as a charge coming home would.
function balances(...sequence: (number | null)[]) {
  wallet.credits = sequence[0]
  const view = render(<LowCreditsDialog threshold={34} />)
  for (const credits of sequence.slice(1)) {
    wallet.credits = credits
    view.rerender(<LowCreditsDialog threshold={34} />)
  }
  return view
}

describe('LowCreditsDialog', () => {
  beforeEach(() => vi.clearAllMocks())

  it('opens when the balance falls below the line, and says what she has and what comes free', () => {
    balances(40, 31)

    expect(heading()).not.toBeNull()
    expect(screen.getByText(/You have 31 credits left. You get 5 free on your first visit each day/)).toBeDefined()
  })

  it('opens nothing on arrival already below the line, or on a balance not yet read', () => {
    balances(null, 20)
    expect(heading()).toBeNull()
  })

  it('opens nothing while she stays below, or lands exactly on the line', () => {
    balances(30, 25)
    expect(heading()).toBeNull()

    balances(40, 34)
    expect(heading()).toBeNull()
  })

  it('closes on Close, and does not reopen until she has been back above the line', () => {
    const view = balances(40, 31)
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(heading()).toBeNull()

    wallet.credits = 28
    view.rerender(<LowCreditsDialog threshold={34} />)
    expect(heading()).toBeNull()

    for (const credits of [36, 30]) {
      wallet.credits = credits
      view.rerender(<LowCreditsDialog threshold={34} />)
    }
    expect(heading()).not.toBeNull()
  })

  it('takes her to the Credits page on Get More Credits', () => {
    balances(40, 31)
    fireEvent.click(screen.getByRole('button', { name: 'Get More Credits' }))

    expect(navigate).toHaveBeenCalledWith({ to: '/auth/credits' })
    expect(heading()).toBeNull()
  })

  it('says credit, not credits, for one', () => {
    balances(40, 1)
    expect(screen.getByText(/You have 1 credit left/)).toBeDefined()
  })
})
