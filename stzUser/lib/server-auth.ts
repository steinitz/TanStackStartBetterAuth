import { getRequest } from '@tanstack/react-start/server'
import { auth } from './auth'

/**
 * The one auth preamble every authenticated server function shares: pull the request headers, resolve
 * the session, and throw 'Not authenticated' if either is absent. Returns the session user (typed),
 * so callers get `user.id` without repeating the `session?.user` narrowing.
 *
 * Extracted from ~8 verbatim copies in wallet.ts (and dozens more in the app's own src/ server fns)
 * so the access check lives — and is tested — in exactly one place. A subtle regression here (an
 * inverted guard, a dropped check) would otherwise slip past a reading review at every call site.
 */
export async function requireSessionUser() {
  const headers = getRequest()?.headers
  if (!headers) throw new Error('Not authenticated')

  const session = await auth.api.getSession({ headers })
  if (!session?.user) throw new Error('Not authenticated')

  return session.user
}
