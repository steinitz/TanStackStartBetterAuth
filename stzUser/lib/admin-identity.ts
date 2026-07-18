export type AdminIdentityUser = {
  id: string
  role?: string | null
}

export type AdminSource = 'role' | 'environment' | 'both' | 'none'

export type AdminStatus = {
  isAdmin: boolean
  source: AdminSource
}

export function parseAdminUserIds(rawValue: string | undefined): readonly string[] {
  return [...new Set(
    (rawValue ?? '')
      .split(',')
      .map((userId) => userId.trim())
      .filter(Boolean),
  )]
}

export function parseFirstUserIsAdmin(rawValue: string | undefined): boolean {
  if (rawValue === undefined || rawValue === '') return false
  if (rawValue === 'true') return true
  if (rawValue === 'false') return false

  throw new Error('FIRST_USER_IS_ADMIN must be true or false')
}

/**
 * Match Better Auth's role parser exactly: comma-separated values are not trimmed.
 * Thus "user,admin" grants admin access while "user, admin" does not.
 */
export function hasStoredAdminRole(role: string | null | undefined): boolean {
  return (role ?? '').split(',').includes('admin')
}

export function resolveAdminStatus(
  user: AdminIdentityUser,
  adminUserIds: readonly string[],
): AdminStatus {
  const byRole = hasStoredAdminRole(user.role)
  const byEnvironment = adminUserIds.includes(user.id)

  if (byRole && byEnvironment) return { isAdmin: true, source: 'both' }
  if (byRole) return { isAdmin: true, source: 'role' }
  if (byEnvironment) return { isAdmin: true, source: 'environment' }
  return { isAdmin: false, source: 'none' }
}

export function isAdmin(
  user: AdminIdentityUser,
  adminUserIds: readonly string[],
): boolean {
  return resolveAdminStatus(user, adminUserIds).isAdmin
}
