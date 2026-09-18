/**
 * Every server function call by a signed-in user costs one credit.
 *
 * Charged is the default, with named exceptions, so a server function written later costs something
 * without anybody remembering to make it cost something. Register it once, as global function
 * middleware in the app's `src/start.ts`; that reaches every server function, including the ones a
 * loader calls directly during server rendering.
 *
 * The charge comes first, before the work, and a call that then fails stays charged. At zero the
 * call is refused with an error beginning OUT_OF_CREDITS, and the balance never goes below zero.
 * Signed-out calls pass free.
 */
import { createMiddleware } from '@tanstack/react-start'
import { announceWalletBalance, type AnnouncedBalance } from './wallet-client'

/**
 * Free by file, because the file is all this middleware can see of a call. The name is relative to
 * the project root, in dev and in a built app alike.
 */
export const FREE_SERVER_FN_FILES: readonly string[] = [
  // Telemetry. Free, so its callers must stay frugal.
  'stzUser/lib/logToServer.ts',
  // Reading the balance is itself a call. Charged, watching credits would cost credits, and at
  // zero she could neither see her balance nor buy more.
  'stzUser/lib/wallet.ts',
  // An admin at zero could not add credits, her own included. The admin check also runs on nearly
  // every signed-in page.
  'stzUser/lib/admin.ts',
  // The admin's User Management screen, free for the same reason as admin.ts. Her own account —
  // profile, password, deleting it — goes through Better Auth's API routes, which are not server
  // functions, so this middleware never sees them.
  'stzUser/lib/users-client.ts',
  // The contact form, so someone out of credits can still reach Support.
  'stzUser/lib/mail-utilities.ts',
]

export function isFreeServerFnFile(filename: string): boolean {
  return FREE_SERVER_FN_FILES.includes(filename)
}

/** How a refused call's error message begins. Callers match on it to say why the call failed. */
export const OUT_OF_CREDITS = 'Out of credits'

const SERVER_CALL_COST = 1

export const serverCallCharge = createMiddleware({ type: 'function' })
  .client(async ({ next }) => {
    const result = await next()
    // During server rendering this half runs in the server process, where the announcement is
    // a no-op; the page reads its balance when it arrives in the browser.
    const balance = (result.context as unknown as { balance?: AnnouncedBalance } | undefined)?.balance
    if (balance) announceWalletBalance(balance)
    return result
  })
  .server(async ({ next, serverFnMeta }) => {
    const balance = await chargeServerCall(serverFnMeta)
    return next({ sendContext: { balance } })
  })

/** Charges one call, returning the balance to send home, or undefined for a call that is free. */
async function chargeServerCall({ filename, name }: { filename: string; name: string }) {
  if (isFreeServerFnFile(filename)) return undefined

  const { getOptionalSessionUser } = await import('./server-auth')
  const user = await getOptionalSessionUser()
  if (!user) return undefined

  const { consumeResourceInternal } = await import('./wallet.logic')
  const charge = await consumeResourceInternal(user.id, `server_call:${name}`, SERVER_CALL_COST)
  if (!charge.success) throw new Error(`${OUT_OF_CREDITS}. Buy more on the Credits page.`)

  const balance: AnnouncedBalance = { userId: user.id, credits: charge.credits }
  return balance
}
