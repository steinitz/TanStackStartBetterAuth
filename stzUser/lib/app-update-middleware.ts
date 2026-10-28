/**
 * When a server call fails, asks whether the page is from before a deploy, and if so reloads it.
 * See app-update.ts.
 *
 * And the server refuses a call from a page of another build, before any work, so the call fails
 * and the same reload follows. A stale page's call that succeeded was read by the old code: when a
 * deploy changes what a server function answers but keeps its name, the old page misreads the
 * answer — found 2026-10-20, a comment saved and charged that the old page called a failure. The
 * page sends its build with every call; a page from before this sends none, and is refused too.
 * The dev server has no build, which turns the refusal off. See planning doc pd-3e5lmh.
 *
 * Register it first in the app's `src/start.ts` function middleware, so it wraps the others and
 * sees every failure, theirs included, and so a refusal comes before any charge. It reaches every
 * server function without naming any, but one: the log's, which a stale page must still reach.
 *
 * The failure is passed on at once: the app's own handling must still run — a game it could not
 * save is kept that way — and the reload waits a task for it.
 */
import { createMiddleware } from '@tanstack/react-start'
import { runningBuild, updateIfStale } from './app-update'
import { logToServer } from './logToServer'

/** The start of a refused call's error: the page runs another build than the server. */
export const STALE_PAGE_CALL = 'Stale page'

/**
 * The server function a stale page may still call: its logs. A report's shape does not change
 * with a deploy, and refusing it would lose the stale page's error reports.
 */
const isExempt = (meta: { name?: string; filename?: string } | undefined) =>
  meta?.name === 'logToServerRpc' && meta.filename === 'stzUser/lib/logToServer.ts'

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
  return createMiddleware({ type: 'function' }).client(async (options) => {
    const { next } = options
    // During server rendering this half runs in the server process, which has no page to reload.
    const inBrowser = typeof window !== 'undefined'
    // Which call failed, for the report Steve is emailed when it was a stale page's.
    const fn = (options as { serverFnMeta?: { name?: string } }).serverFnMeta?.name ?? 'unknown'
    const updateIfStaleAfter = (error: string) => {
      if (!inBrowser) return
      void updateIfStale({ failed: true, report: { message: 'app.update.staleCall', context: { fn, error } } }).then((reloading) => {
        // Refused as stale, yet no reload: the reload this tab made already brought this page, and
        // it still runs the old build, or the served build could not be read. Loud, since every
        // call this page makes would now be refused. See app-update.ts's header.
        if (!reloading && error.startsWith(STALE_PAGE_CALL)) {
          void logToServer({ data: { level: 'error', message: 'app.update.refusedNoReload', context: { fn, error }, notify: true } }).catch(() => {})
        }
      })
    }

    // The page's build, for the server half to compare with its own. During server rendering this
    // half runs in the server, and sends the server's own, so nothing is refused.
    const call = () => next({ sendContext: { pageBuild: runningBuild() } })
    let result: Awaited<ReturnType<typeof call>>
    try {
      result = await call()
    } catch (error) {
      updateIfStaleAfter(error instanceof Error ? error.message : String(error))
      throw error
    }

    const answer = (result as { result?: unknown }).result
    if (isUnhandledServerError(answer)) {
      updateIfStaleAfter(`${answer.status} ${answer.message ?? ''}`.trim())
      // Thrown, so the caller's failure handling runs instead of the error object being read as data.
      throw new Error(`Server call failed: ${answer.status} ${answer.message ?? ''}`.trim())
    }
    return result
  }).server(async ({ next, context, serverFnMeta }) => {
    const serverBuild = runningBuild()
    const { pageBuild } = context
    // Before any work, so a refused call does nothing and charges nothing. A missing build is a
    // page from before the page sent one: stale too.
    if (serverBuild !== null && pageBuild !== serverBuild && !isExempt(serverFnMeta)) {
      throw new Error(`${STALE_PAGE_CALL}: the page runs ${pageBuild ?? 'an older build'}, the server ${serverBuild}`)
    }
    return next()
  })
}
