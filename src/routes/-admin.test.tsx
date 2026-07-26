import { fireEvent, render, screen } from '@testing-library/react'
import type { ComponentType } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { navigate, useSearch } = vi.hoisted(() => ({
  navigate: vi.fn(),
  useSearch: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (config: {
    component: React.ComponentType
    validateSearch?: (search: Record<string, unknown>) => { userId?: string }
  }) => ({
    options: config,
    useSearch,
  }),
  useNavigate: () => navigate,
}))

vi.mock('~stzUser/components/RouteComponents/CreditsAdminPage', () => ({
  CreditsAdminPage: ({
    initialUserId,
    onViewUsers,
  }: {
    initialUserId?: string
    onViewUsers: () => void
  }) => (
    <>
      <h1>Shared credit administration</h1>
      <p>Initial user: {initialUserId ?? 'none'}</p>
      <button onClick={onViewUsers}>View Users</button>
    </>
  ),
}))

import { Route } from './admin'

describe('/admin application route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useSearch.mockReturnValue({ userId: 'target-user' })
  })

  it('adapts validated route state and user-management navigation', () => {
    const Component = Route.options.component as ComponentType
    render(<Component />)

    expect(screen.getByRole('heading', {
      name: 'Shared credit administration',
    })).toBeInTheDocument()
    expect(screen.getByText('Initial user: target-user')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'View Users' }))
    expect(navigate).toHaveBeenCalledWith({ to: '/auth/users' })
  })

  it('keeps only a non-empty string user ID in search state', () => {
    const validateSearch = Route.options.validateSearch as (
      search: Record<string, unknown>,
    ) => { userId?: string }

    expect(validateSearch({ userId: ' target-user ' })).toEqual({ userId: 'target-user' })
    expect(validateSearch({ userId: '' })).toEqual({ userId: undefined })
    expect(validateSearch({ userId: 42 })).toEqual({ userId: undefined })
  })
})
