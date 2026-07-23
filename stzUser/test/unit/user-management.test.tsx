import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, waitFor, within } from '@testing-library/react'
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

function installDialogTestSupport() {
  // JSDOM 26 creates HTMLDialogElement but does not implement its modal methods.
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.open = true
    },
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.open = false
      this.dispatchEvent(new Event('close'))
    },
  })
}

function closeSelectedUserDialog(view: ReturnType<typeof render>) {
  const dialog = view.getByRole('dialog')
  fireEvent.click(within(dialog).getByRole('button', { name: 'Close user editor' }))
}

describe('UserManagement effective admin display', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    installDialogTestSupport()
    useSetUserRole.mockResolvedValue({ success: true })
    useDemoteUserToUserRole.mockResolvedValue({ success: true })
    useUpdateEmailVerificationStatus.mockResolvedValue({ success: true })
  })

  it('binds email verification and stored role to their own values', () => {
    const { view } = renderManagement()

    fireEvent.click(view.getByText('Plain Person'))
    const emailVerificationCheckbox = view.getByLabelText('Email Verified') as HTMLInputElement
    expect(emailVerificationCheckbox).toBeChecked()
    expect(emailVerificationCheckbox.parentElement).toHaveStyle({
      alignItems: 'center',
      display: 'flex',
      gap: '0.5rem',
    })
    expect(emailVerificationCheckbox).toHaveStyle({
      margin: '0',
      minWidth: 'auto',
      padding: '0',
    })
    expect(emailVerificationCheckbox.labels?.[0]).toHaveStyle({
      margin: '0',
      position: 'static',
    })
    expect(view.getByLabelText('Stored admin role')).not.toBeChecked()
    expect(view.getByText('This account has no effective admin grant.')).toBeInTheDocument()

    closeSelectedUserDialog(view)
    fireEvent.click(view.getByText('Stored Person'))
    expect(view.getByLabelText('Email Verified')).not.toBeChecked()
    expect(view.getByLabelText('Stored admin role')).toBeChecked()
    expect(view.getByText('Admin status is defined in the database.')).toBeInTheDocument()
  })

  it('keeps every column left aligned and renders compact icon-first access labels', () => {
    const { view } = renderManagement()

    for (const cell of view.container.querySelectorAll('th, td')) {
      expect(cell).toHaveStyle({ textAlign: 'left' })
    }

    const expectedAccessCells = [
      ['Plain Person', '👤', 'User'],
      ['Stored Person', '👑', 'Admin · DB'],
      ['Environment Person', '👑', 'Admin'],
      ['Both Person', '👑', 'Hybrid'],
    ]

    for (const [name, icon, access] of expectedAccessCells) {
      const row = view.getByText(name).closest('tr')
      expect(row).not.toBeNull()
      const accessGroup = within(row!).getAllByRole('cell')[4].querySelector('span > span')
      expect(accessGroup?.children[0]).toHaveTextContent(icon)
      expect(accessGroup?.children[1]).toHaveTextContent(access)
    }

    expect(view.getByText('Hybrid')).toHaveClass('stz-user-management-hybrid-label')
    expect(view.container.querySelector('style')).toHaveTextContent(
      'color: var(--color-warning)',
    )
  })

  it('keeps configured roles read-only and explains each source honestly', () => {
    const { view } = renderManagement()

    fireEvent.click(view.getByText('Environment Person'))
    const dialog = view.getByRole('dialog', { name: /Edit User.*Environment Person/ })
    const environmentRoleCheckbox = view.getByLabelText('Stored admin role') as HTMLInputElement
    expect(environmentRoleCheckbox).toBeDisabled()
    expect(environmentRoleCheckbox).not.toBeChecked()
    expect(environmentRoleCheckbox.labels?.[0]).toHaveStyle({
      color: 'var(--color-text-secondary)',
    })
    expect(view.container.querySelector('#stored-admin-role-read-only-note')).toHaveTextContent(
      'The Stored admin role checkbox, above, is disabled while ADMIN_USER_IDS grants admin access.',
    )
    expect(view.getByText(
      'Admin status is defined by environment configuration and cannot be edited here.',
    )).toBeInTheDocument()

    const disclosures = view.getAllByLabelText('Explain Environment admin')
    expect(disclosures).toHaveLength(2)
    const disclosure = within(dialog).getByLabelText('Explain Environment admin')
    fireEvent.click(disclosure)
    expect(disclosure.closest('details')).toHaveAttribute('open')
    expect(disclosure.closest('details')).toHaveTextContent(/temporarily lose admin access/)

    fireEvent.click(disclosure)
    closeSelectedUserDialog(view)
    fireEvent.click(view.getByText('Both Person'))
    expect(view.getByLabelText('Stored admin role')).toBeDisabled()
    expect(view.getByLabelText('Stored admin role')).toBeChecked()

    const hybridDialog = view.getByRole('dialog')
    expect(view.getAllByLabelText('Explain Hybrid admin')).toHaveLength(1)
    expect(within(hybridDialog).queryByLabelText('Explain Hybrid admin')).not.toBeInTheDocument()
    expect(hybridDialog).toHaveTextContent(
      'Warning: Admin access is granted independently by both the stored database role and environment configuration.',
    )
    expect(hybridDialog).toHaveTextContent(
      'Recommended: remove the user ID from ADMIN_USER_IDS, then restart or redeploy the app.',
    )
  })

  it('dismisses the selected-user dialog by outside click, Escape, or Close', () => {
    const { view } = renderManagement()
    const openPlainUser = () => {
      fireEvent.click(view.getByText('Plain Person'))
      return view.getByRole('dialog', { name: /Edit User.*Plain Person/ })
    }

    let dialog = openPlainUser()
    vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue({
      bottom: 500,
      height: 400,
      left: 100,
      right: 500,
      top: 100,
      width: 400,
      x: 100,
      y: 100,
      toJSON: () => ({}),
    })

    fireEvent.click(dialog, { clientX: 200, clientY: 200 })
    expect(dialog).toHaveAttribute('open')
    fireEvent.click(dialog, { clientX: 20, clientY: 20 })
    expect(dialog).not.toHaveAttribute('open')

    dialog = openPlainUser()
    fireEvent(dialog, new Event('cancel', { cancelable: true }))
    expect(dialog).not.toHaveAttribute('open')

    dialog = openPlainUser()
    const actionGroup = within(dialog).getByRole('button', { name: 'Close user editor' }).parentElement
    expect(actionGroup).toHaveStyle({ justifyContent: 'space-between' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close user editor' }))
    expect(dialog).not.toHaveAttribute('open')
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
