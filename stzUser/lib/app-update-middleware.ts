/**
 * When a server call fails, asks whether the page is from before a deploy, and if so reloads it.
 * See app-update.ts.
 *
 * Register it first in the app's `src/start.ts` function middleware, so it wraps the others and
 * sees every failure, theirs included. It reaches every server function without naming any.
 *
 * The failure is passed on at once: the app's own handling must still run — a game it could not
 * save is kept that way — and the reload waits a task for it.
 */
import { createMiddleware } from '@tanstack/react-start'
import { updateIfStale } from './app-update'

/**
 * The answer a server error outside any server function sends, `{ status, unhandled, message }`:
 * a call to a function this deploy no longer has is the case that matters. TanStack hands such an
 * answer back as if it were the function's result, without throwing, because it lacks TanStack's
 * own serialization header. Measured on a draft deploy, 2026-10-14: 500, "HTTPError".
 */
export function isUnhandledServerError(value: unknown): value is { status: number; message?: string } {
  return typeof value === 'object' && value !== null
    && (value as { unhandled?: unknown }).unhandled === true
    && typeof (value as { status?: unknown }).status === 'number'
}

export function createAppUpdateCheck() {
  return createMiddleware({ type: 'function' }).client(async ({ next }) => {
    // During server rendering this half runs in the server process, which has no page to reload.
    const inBrowser = typeof window !== 'undefined'
    let result: Awaited<ReturnType<typeof next>>
    try {
      result = await next()
    } catch (error) {
      if (inBrowser) void updateIfStale({ failed: true })
      throw error
    }

    const answer = (result as { result?: unknown }).result
    if (isUnhandledServerError(answer)) {
      if (inBrowser) void updateIfStale({ failed: true })
      // Thrown, so the caller's failure handling runs instead of the error object being read as data.
      throw new Error(`Server call failed: ${answer.status} ${answer.message ?? ''}`.trim())
    }
    return result
  })
}
