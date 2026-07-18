import { describe, expect, it, vi } from 'vitest'
import { createFirstUserAdminHook } from '~stzUser/lib/admin-bootstrap.server'

describe('first-user admin hook', () => {
  it('does nothing when the feature is disabled', async () => {
    const promote = vi.fn()

    await createFirstUserAdminHook(false, promote)({ id: 'first-user' })

    expect(promote).not.toHaveBeenCalled()
  })

  it('awaits promotion for the created user when enabled', async () => {
    const promote = vi.fn().mockResolvedValue(true)

    await createFirstUserAdminHook(true, promote)({ id: 'first-user' })

    expect(promote).toHaveBeenCalledOnce()
    expect(promote).toHaveBeenCalledWith('first-user')
  })
})
