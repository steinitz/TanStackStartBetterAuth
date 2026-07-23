import { describe, expect, it } from 'vitest'
import {
  hasStoredAdminRole,
  isAdmin,
  parseAdminUserIds,
  parseFirstUserIsAdmin,
  resolveAdminStatus,
} from '~stzUser/lib/admin-identity'

describe('admin identity', () => {
  it('trims, removes empty IDs, and deduplicates environment admins', () => {
    expect(parseAdminUserIds(' first ,, second,first, second ')).toEqual(['first', 'second'])
  })

  it('defaults the first-user flag to false and accepts exact booleans', () => {
    expect(parseFirstUserIsAdmin(undefined)).toBe(false)
    expect(parseFirstUserIsAdmin('')).toBe(false)
    expect(parseFirstUserIsAdmin('false')).toBe(false)
    expect(parseFirstUserIsAdmin('true')).toBe(true)
  })

  it.each(['TRUE', ' false ', 'yes', '0'])(
    'rejects invalid first-user flag value %s',
    (value) => {
      expect(() => parseFirstUserIsAdmin(value)).toThrow(
        'FIRST_USER_IS_ADMIN must be true or false',
      )
    },
  )

  it('matches Better Auth role parsing without trimming', () => {
    expect(hasStoredAdminRole('admin')).toBe(true)
    expect(hasStoredAdminRole('user,admin')).toBe(true)
    expect(hasStoredAdminRole('user, admin')).toBe(false)
    expect(hasStoredAdminRole('administrator')).toBe(false)
    expect(hasStoredAdminRole(null)).toBe(false)
  })

  it('reports the source without exposing the configured ID list', () => {
    expect(resolveAdminStatus({ id: 'regular', role: 'user' }, ['environment'])).toEqual({
      isAdmin: false,
      source: 'none',
    })
    expect(resolveAdminStatus({ id: 'role', role: 'user,admin' }, [])).toEqual({
      isAdmin: true,
      source: 'role',
    })
    expect(resolveAdminStatus({ id: 'environment', role: 'user' }, ['environment'])).toEqual({
      isAdmin: true,
      source: 'environment',
    })
    expect(resolveAdminStatus({ id: 'environment', role: 'user, admin' }, ['environment'])).toEqual({
      isAdmin: true,
      source: 'environment',
    })
    expect(resolveAdminStatus({ id: 'both', role: 'admin' }, ['both'])).toEqual({
      isAdmin: true,
      source: 'both',
    })
  })

  it('provides the boolean access predicate', () => {
    expect(isAdmin({ id: 'environment', role: 'user' }, ['environment'])).toBe(true)
    expect(isAdmin({ id: 'regular', role: 'user' }, ['environment'])).toBe(false)
  })
})
