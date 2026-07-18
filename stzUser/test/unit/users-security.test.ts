import { beforeEach, describe, expect, it, vi } from 'vitest'

const { adminUpdateUser, listUsers, selectFrom } = vi.hoisted(() => ({
  adminUpdateUser: vi.fn(),
  listUsers: vi.fn(),
  selectFrom: vi.fn(),
}))

vi.mock('~stzUser/lib/auth', () => ({
  auth: {
    api: {
      adminUpdateUser,
      listUsers,
    },
  },
}))

vi.mock('~stzUser/lib/database', () => ({
  db: {
    selectFrom,
  },
}))

import {
  getAllUsers,
  updateEmailVerificationStatus,
} from '~stzUser/lib/users'

describe('user-management authorization boundaries', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fails closed when Better Auth rejects listUsers', async () => {
    listUsers.mockRejectedValue(new Error('Admin access required'))

    await expect(getAllUsers(new Headers())).rejects.toThrow('Admin access required')
    expect(selectFrom).not.toHaveBeenCalled()
  })

  it('returns the Better Auth user list without consulting the fallback query', async () => {
    const users = [{ id: 'user-1', role: 'user' }]
    listUsers.mockResolvedValue({ users })

    await expect(getAllUsers(new Headers())).resolves.toEqual(users)
    expect(selectFrom).not.toHaveBeenCalled()
  })

  it('changes verification status through the Better Auth admin endpoint', async () => {
    const headers = new Headers({ cookie: 'session=admin' })
    adminUpdateUser.mockResolvedValue({ id: 'target', emailVerified: true })

    await expect(updateEmailVerificationStatus({
      userId: 'target',
      emailVerified: true,
    }, headers)).resolves.toEqual({
      success: true,
      result: { id: 'target', emailVerified: true },
    })

    expect(adminUpdateUser).toHaveBeenCalledWith({
      body: {
        userId: 'target',
        data: { emailVerified: true },
      },
      headers,
    })
  })

  it('propagates Better Auth rejection for a regular user', async () => {
    adminUpdateUser.mockRejectedValue(new Error('You are not allowed to update users'))

    await expect(updateEmailVerificationStatus({
      userId: 'target',
      emailVerified: true,
    }, new Headers())).rejects.toThrow('You are not allowed to update users')
    expect(selectFrom).not.toHaveBeenCalled()
  })
})
