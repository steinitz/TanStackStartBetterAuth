/**
 * When a server call fails, asks whether the page is from before a deploy, and if so reloads it.
 * See app-update.ts.
 *
 * Register it first in the app's `src/start.ts` function middleware, so it wraps the others and
 * sees every failure, theirs included. It reaches every server function without naming any.
 *
 * The failure is passed on at once, untouched: the app's own handling must still run — a game it
 * could not save is kept that way — and the reload waits a task for it.
 */
import { createMiddleware } from '@tanstack/react-start'
import { updateIfStale } from './app-update'

export function createAppUpdateCheck() {
  return createMiddleware({ type: 'function' }).client(async ({ next }) => {
    try {
      return await next()
    } catch (error) {
      // During server rendering this half runs in the server process, which has no page to reload.
      if (typeof window !== 'undefined') void updateIfStale({ failed: true })
      throw error
    }
  })
}
