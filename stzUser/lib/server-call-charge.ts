/**
 * Charges credits for the things she does, from a price table the app supplies.
 *
 * A price belongs to an event — saving a game, an analysis run — not to a server call, because
 * what a call costs then depends on how many round trips its implementation happens to make, and
 * nobody decides that. So the table names the server functions that carry an event, and a server
 * function not in the table is free.
 *
 * Register it once, as global function middleware in the app's `src/start.ts`; that reaches every
 * server function, including the ones a loader calls directly during server rendering.
 *
 * Signed-out calls pass free.
 */
import { createMiddleware } from '@tanstack/react-start'
import { announceWalletBalance, type AnnouncedBalance } from './wallet-client'
import { OUT_OF_CREDITS } from './wallet-contracts'

/** What one event costs, and where the charge finds it. */
export type ServerFnPrice = {
  /** The file the server function is defined in, relative to the project root. */
  file: string
  /** Its exported name. */
  name: string
  /** Credits. The balance stops at zero, so a price is what the event costs, not a toll she must afford. */
  price: number
  /** What her Credits page calls this, in the ledger row. */
  label: string
  /**
   * True for an event that starts new work, such as an analysis run. Those are refused when the
   * balance is zero, and charged before the work runs so the refusal arrives instead of it.
   *
   * Left out for a save or a read, which are never refused: they run, and pay what is left. They
   * are charged after the work succeeds, so a call that fails costs her nothing.
   */
  refusedAtZero?: boolean
}

export type ServerFnPriceTable = readonly ServerFnPrice[]

// Lives in wallet-contracts.ts, which a browser component can import without meeting this file.
export { OUT_OF_CREDITS } from './wallet-contracts'

const priceKey = (file: string, name: string) => `${file}#${name}`

/**
 * What the server half sends home, always the same shape.
 *
 * A call that pays nothing sends no balance, and the framework's types are invariant: build the
 * two by hand and the middleware has two send types, which it then refuses to have at all.
 */
const sends = (balance: AnnouncedBalance | undefined) => ({ balance })

/**
 * Builds the middleware around one app's price table.
 *
 * The table is the app's, not this library's: only the app knows what a game or an analysis is.
 * An app that charges for nothing passes an empty table, and every call stays free.
 */
export function createServerCallCharge(table: ServerFnPriceTable) {
  const prices = new Map(table.map((entry) => [priceKey(entry.file, entry.name), entry]))

  return createMiddleware({ type: 'function' })
    .client(async ({ next }) => {
      const result = await next()
      // During server rendering this half runs in the server process, where the announcement is
      // a no-op; the page reads its balance when it arrives in the browser.
      const balance = (result.context as unknown as { balance?: AnnouncedBalance } | undefined)?.balance
      if (balance) announceWalletBalance(balance)
      return result
    })
    .server(async ({ next, serverFnMeta }) => {
      const price = prices.get(priceKey(serverFnMeta.filename, serverFnMeta.name))
      if (!price) return next({ sendContext: sends(undefined) })

      const { getOptionalSessionUser } = await import('./server-auth')
      const user = await getOptionalSessionUser()
      if (!user) return next({ sendContext: sends(undefined) })

      if (price.refusedAtZero) {
        return next({ sendContext: sends(await takeCredits(user.id, price)) })
      }

      // Charged on the way out, so work that throws is never paid for. The balance still rides
      // home, because a middleware's own return value is what the server hands back — so the
      // charge writes into that object rather than building a new one.
      const result = await next({ sendContext: sends(undefined) })
      result.sendContext = { ...result.sendContext, balance: await takeCredits(user.id, price) }
      return result
    })
}

/** Takes one event's price, and throws when a refusable event finds the balance at zero. */
async function takeCredits(userId: string, price: ServerFnPrice) {
  const { takeCreditsUpTo } = await import('./wallet.logic')
  const charge = await takeCreditsUpTo(userId, price.label, price.price, {
    refuseAtZero: price.refusedAtZero === true,
  })
  if (charge.refused) throw new Error(`${OUT_OF_CREDITS}. Buy more on the Credits page.`)

  const balance: AnnouncedBalance = { userId, credits: charge.credits }
  return balance
}
