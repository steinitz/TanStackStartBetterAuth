/**
 * @vitest-environment node
 *
 * The shared auth preamble for every authenticated server function (wallet.ts's 8, plus the app's
 * own src/ server fns as they adopt it). One place to prove the access check so an inverted or
 * dropped guard can't slip past a reading review at each call site:
 *   - no request context / no headers → throws 'Not authenticated'
 *   - a session with no user           → throws 'Not authenticated'
 *   - a valid session                  → returns the user
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { getRequest, getSession } = vi.hoisted(() => ({ getRequest: vi.fn(), getSession: vi.fn() }))

vi.mock('@tanstack/react-start/server', () => ({ getRequest }))
vi.mock('~stzUser/lib/auth', () => ({ auth: { api: { getSession } } }))

import { requireSessionUser } from '~stzUser/lib/server-auth'

const withHeaders = () => ({ headers: new Headers({ cookie: 'session=abc' }) })

describe('requireSessionUser', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns the session user when authenticated', async () => {
    getRequest.mockReturnValue(withHeaders())
    getSession.mockResolvedValue({ user: { id: 'user_1', email: 'a@b.co' } })

    await expect(requireSessionUser()).resolves.toEqual({ id: 'user_1', email: 'a@b.co' })
  })

  it('throws when there is no request context', async () => {
    getRequest.mockReturnValue(undefined)
    await expect(requireSessionUser()).rejects.toThrow('Not authenticated')
    expect(getSession).not.toHaveBeenCalled()
  })

  it('throws when the request carries no headers', async () => {
    getRequest.mockReturnValue({})
    await expect(requireSessionUser()).rejects.toThrow('Not authenticated')
    expect(getSession).not.toHaveBeenCalled()
  })

  it('throws when there is no session', async () => {
    getRequest.mockReturnValue(withHeaders())
    getSession.mockResolvedValue(null)
    await expect(requireSessionUser()).rejects.toThrow('Not authenticated')
  })

  it('throws when the session has no user', async () => {
    getRequest.mockReturnValue(withHeaders())
    getSession.mockResolvedValue({ user: null })
    await expect(requireSessionUser()).rejects.toThrow('Not authenticated')
  })
})
