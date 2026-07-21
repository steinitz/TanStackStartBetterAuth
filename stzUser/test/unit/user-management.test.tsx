import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  useDeleteUserById,
  useSetUserRole,
  useDemoteUserToUserRole,
  useUpdateEmailVerificationStatus,
} = vi.hoisted(() => ({
  useDeleteUserById: vi.fn(),
  useSetUserRole: vi.fn(),
  useDemoteUserToUserRole: vi.fn(),
  useUpdateEmailVerificationStatus: vi.fn(),
}))

vi.mock('~stzUser/lib/users-client', () => ({
  useDeleteUserById,
  useSetUserRole,
  useDemoteUserToUserRole,
  useUpdateEmailVerificationStatus,
  userManagementKeys: {
    all: ['user-management'],
  },
}))

import { UserManagement } from '~stzUser/components/Other/UserManagement'
import type { User } from '~stzUser/lib/users-client'

const users: User[] = [
  {
    id: 'plain-user',
    name: 'Plain Person',
    email: 'plain@example.test',
    emailVerified: true,
    image: null,
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    updatedAt: new Date('2026-07-01T00:00:00.000Z'),
    role: 'user',
    banned: null,
    banReason: null,
    banExpires: null,
    adminSource: 'none',
  },
  {
    id: 'role-user',
    name: 'Stored Person',
    email: 'stored@example.test',
    emailVerified: false,
    image: null,
    createdAt: new Date('2026-07-02T00:00:00.000Z'),
    updatedAt: new Date('2026-07-02T00:00:00.000Z'),
    role: 'user,admin',
    banned: null,
    banReason: null,
    banExpires: null,
    adminSource: 'role',
  },
  {
    id: 'environment-user',
    name: 'Environment Person',
    email: 'environment@example.test',
    emailVerified: true,
    image: null,
    createdAt: new Date('2026-07-03T00:00:00.000Z'),
    updatedAt: new Date('2026-07-03T00:00:00.000Z'),
    role: 'user',
    banned: null,
    banReason: null,
    banExpires: null,
    adminSource: 'environment',
  },
  {
    id: 'both-user',
    name: 'Both Person',
    email: 'both@example.test',
    emailVerified: true,
    image: null,
    createdAt: new Date('2026-07-04T00:00:00.000Z'),
    updatedAt: new Date('2026-07-04T00:00:00.000Z'),
    role: 'admin',
    banned: null,
    banReason: null,
    banExpires: null,
    adminSource: 'both',
  },
]

function renderManagement() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  return {
    invalidateQueries,
    view: render(<UserManagement users={users} />, { wrapper }),
  }
}

describe('UserManagement effective admin display', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useSetUserRole.mockResolvedValue({ success: true })
    useDemoteUserToUserRole.mockResolvedValue({ success: true })
    useUpdateEmailVerificationStatus.mockResolvedValue({ success: true })
  })

  it('binds email verification and stored role to their own values', () => {
    const { view } = renderManagement()

    fireEvent.click(view.getByText('Plain Person'))
    expect(view.getByLabelText('Email Verified')).toBeChecked()
    expect(view.getByLabelText('Stored admin role')).not.toBeChecked()

    fireEvent.click(view.getByText('Stored Person'))
    expect(view.getByLabelText('Email Verified')).not.toBeChecked()
    expect(view.getByLabelText('Stored admin role')).toBeChecked()
  })

  it('makes environment-controlled rows read-only and discloses the conversion gap', () => {
    const { view } = renderManagement()

    fireEvent.click(view.getByText('Environment Person'))
    expect(view.queryByLabelText('Stored admin role')).not.toBeInTheDocument()
    expect(view.getByText(/Not enabled.*read-only/)).toBeInTheDocument()

    const disclosure = view.getByLabelText('Explain Environment admin')
    fireEvent.click(disclosure)
    expect(disclosure.closest('details')).toHaveAttribute('open')
    expect(disclosure.closest('details')).toHaveTextContent(/temporarily lose admin access/)

    fireEvent.click(view.getByText('Both Person'))
    expect(view.queryByLabelText('Stored admin role')).not.toBeInTheDocument()
    expect(view.getByText(/Enabled.*read-only/)).toBeInTheDocument()
  })

  it('refreshes server truth and current admin status after a stored-role mutation', async () => {
    const { view, invalidateQueries } = renderManagement()

    fireEvent.click(view.getByText('Plain Person'))
    fireEvent.click(view.getByLabelText('Stored admin role'))

    await waitFor(() => expect(useSetUserRole).toHaveBeenCalledWith({
      data: { userId: 'plain-user', role: 'admin' },
    }))
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['user-management'] })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['admin-status'] })
  })
})
