import { render } from '@testing-library/react'
import type { ComponentType, ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { useSession, useAdminStatus, useQuery, adminUsersQueryOptions } = vi.hoisted(() => ({
  useSession: vi.fn(),
  useAdminStatus: vi.fn(),
  useQuery: vi.fn(),
  adminUsersQueryOptions: vi.fn((isAdmin: boolean) => ({ isAdmin })),
}))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (config: { component: ComponentType }) => ({ options: config }),
  Link: ({ to, children }: { to: string; children: ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}))

vi.mock('@tanstack/react-query', () => ({ useQuery }))
vi.mock('~stzUser/lib/auth-client', () => ({ useSession }))
vi.mock('~stzUser/lib/admin-queries', () => ({ useAdminStatus }))
vi.mock('~stzUser/lib/users-client', () => ({ adminUsersQueryOptions }))
vi.mock('~stzUser/components/Other/UserManagement', () => ({
  UserManagement: ({ users }: { users: unknown[] }) => (
    <p>User table with {users.length} rows</p>
  ),
}))

import { Route } from './users'

const Component = Route.options.component as ComponentType

describe('/auth/users effective-admin route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useSession.mockReturnValue({
      data: { user: { id: 'admin-user', role: 'user' } },
      isPending: false,
    })
    useAdminStatus.mockReturnValue({
      data: { isAdmin: true, source: 'environment' },
      isPending: false,
    })
    useQuery.mockReturnValue({ data: [{ id: 'target' }], isPending: false, isError: false })
  })

  it.each(['role', 'environment', 'both'] as const)(
    'renders user management for %s admins',
    (source) => {
      useAdminStatus.mockReturnValue({
        data: { isAdmin: true, source },
        isPending: false,
      })

      const view = render(<Component />)

      expect(view.getByText('User table with 1 rows')).toBeInTheDocument()
      expect(view.getByRole('link', { name: 'Back to Credit administration' }))
        .toHaveAttribute('href', '/admin')
      expect(adminUsersQueryOptions).toHaveBeenCalledWith(true)
    },
  )

  it('waits without flashing Access Denied while effective status resolves', () => {
    useAdminStatus.mockReturnValue({ data: undefined, isPending: true })

    const view = render(<Component />)

    expect(view.getByText('Loading Admin access…')).toBeInTheDocument()
    expect(view.queryByText('Access Denied')).not.toBeInTheDocument()
    expect(adminUsersQueryOptions).toHaveBeenCalledWith(false)
  })

  it('denies a regular user and keeps the list query disabled', () => {
    useAdminStatus.mockReturnValue({
      data: { isAdmin: false, source: 'none' },
      isPending: false,
    })

    const view = render(<Component />)

    expect(view.getByText('Access Denied')).toBeInTheDocument()
    expect(adminUsersQueryOptions).toHaveBeenCalledWith(false)
  })

  it('denies a signed-out visitor and keeps the list query disabled', () => {
    useSession.mockReturnValue({ data: null, isPending: false })
    useAdminStatus.mockReturnValue({
      data: { isAdmin: false, source: 'none' },
      isPending: false,
    })

    const view = render(<Component />)

    expect(view.getByText('Access Denied')).toBeInTheDocument()
    expect(adminUsersQueryOptions).toHaveBeenCalledWith(false)
  })
})
