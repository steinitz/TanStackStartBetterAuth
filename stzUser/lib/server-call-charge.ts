/**
 * Charges credits for the things the user does, from a price table the app supplies.
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
import { NOT_ENOUGH_CREDITS } from './wallet-contracts'

/** What one event costs, and where the charge finds it. */
export type ServerFnPrice = {
  /** The file the server function is defined in, relative to the project root. */
  file: string
  /** Its exported name. */
  name: string
  /**
   * Credits. For a save or a read the balance stops at zero, so the price is what the event costs,
   * not a toll the user must afford. For an event refused below its price, it is both.
   */
  price: number
  /**
   * What the user's Credits page calls this: the ledger row's whole description, since the row's amount
   * already says what was taken. Plain words, as she would say them — "Game saved".
   */
  label: string
  /**
   * True for an event that starts new work, such as an analysis run. The user's balance is checked before
   * the work, and below the price she is refused, so the refusal arrives instead of the work. The
   * charge comes after the work succeeds, so work that fails costs her nothing: checkout, not a
   * toll at the door — Steve, 2026-10-19, "It might prevent a few support requests."
   *
   * The charge can come up short: two calls overlapped on a low balance, or the call set a price
   * above what she had left. The work is done by then, so the charge takes what is left, and the
   * shortfall is reported as `charge.short`. Accepted, as a shop accepts a little shoplifting.
   *
   * Left out for a save or a read, which are never refused: they run, and pay what is left. They
   * too are charged after the work succeeds.
   */
  refusedBelowPrice?: boolean
  /**
   * True for an event the user may do dozens of times a day, such as practising, so that her history
   * keeps one line for the day rather than dozens. Each charge still happens, and adds to that
   * day's row. The day is hers, as the daily grant counts it.
   */
  oneRowPerDay?: boolean
}

export type ServerFnPriceTable = readonly ServerFnPrice[]

// Lives in wallet-contracts.ts, which a browser component can import without meeting this file.
export { NOT_ENOUGH_CREDITS, isNotEnoughCredits } from './wallet-contracts'

const priceKey = (file: string, name: string) => `${file}#${name}`

/**
 * What a call may say about its own charge, handed to it in its context: read it with `chargeOf`.
 *
 * `setPrice` replaces the table's price with one the call worked out, charged when it succeeds.
 * The coach's comment is one: a round of looks is inside the table's price and each further round,
 * a dig, costs one more. A refusable event is still checked against the table's price, so set one
 * no lower than it. Only a priced call is charged: a price set on an unpriced call is ignored.
 *
 * `waive` charges nothing this time, and writes no ledger row: a call that succeeds by handing out
 * work still to do, which a later call finishes and is charged for. The coach's comment is one,
 * when its rounds stop for the user's browser's engine. The door is unchanged: a refusable call is still
 * refused below its price before its work. The last of `setPrice` and `waive` wins.
 */
export type CallCharge = {
  setPrice: (credits: number) => void
  waive: () => void
}

/** The charge the middleware handed this call, from the `context` its handler receives. */
export function chargeOf(context: unknown): CallCharge {
  const charge = (context as { charge?: CallCharge } | null | undefined)?.charge
  if (!charge) throw new Error(`No charge in this call's context: is the charge middleware registered?`)
  return charge
}

/** A call's charge, the price it set, if it set one, and whether it waived its charge. */
function callCharge() {
  let set: number | undefined
  let waived = false
  const charge: CallCharge = {
    setPrice: (credits) => {
      // Checked here, inside the call, so a bad price fails the call rather than its charge.
      if (!Number.isInteger(credits) || credits <= 0) {
        throw new Error(`A call's price must be a positive whole number, not ${credits}`)
      }
      set = credits
      waived = false
    },
    waive: () => {
      waived = true
      set = undefined
    },
  }
  return { charge, priceSet: () => set, waived: () => waived }
}

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
      // Every call gets a charge in its context, priced or not, so the context has one shape: the
      // framework's types refuse a middleware whose branches pass different ones.
      const { charge, priceSet, waived } = callCharge()
      const price = prices.get(priceKey(serverFnMeta.filename, serverFnMeta.name))
      if (!price) return next({ context: { charge }, sendContext: sends(undefined) })

      const { getOptionalSessionUser } = await import('./server-auth')
      const user = await getOptionalSessionUser()
      if (!user) return next({ context: { charge }, sendContext: sends(undefined) })

      if (price.refusedBelowPrice) await refuseBelowPrice(user.id, price)

      // Charged on the way out, so work that throws is never paid for. The balance still rides
      // home, because a middleware's own return value is what the server hands back — so the
      // charge writes into that object rather than building a new one.
      const result = await next({ context: { charge }, sendContext: sends(undefined) })
      if (waived()) return result
      result.sendContext = { ...result.sendContext, balance: await takeCredits(user.id, price, priceSet() ?? price.price) }
      return result
    })
}

/**
 * Refuses a refusable event, before its work, when the user's balance is below its price. Takes nothing.
 * The wallet's read applies her daily grant first, as a charge does, so the first call of her day
 * is judged with that day's credits.
 */
async function refuseBelowPrice(userId: string, price: ServerFnPrice) {
  const { getWalletStatusInternal } = await import('./wallet.logic')
  const { credits } = await getWalletStatusInternal(userId)
  if (credits < price.price) {
    throw new Error(
      `${NOT_ENOUGH_CREDITS}: this costs ${price.price} and you have ${Math.max(credits, 0)}. Buy more on the Credits page.`,
    )
  }
}

/**
 * Takes one event's price after its work succeeded, stopping at zero. Never refused here: the work
 * is done. A refusable event that comes up short is reported, so we learn how often it happens:
 * another call overlapped it on a low balance, or it set a price above what the user had left.
 */
async function takeCredits(userId: string, price: ServerFnPrice, credits: number) {
  const { chargeEvent } = await import('./wallet.logic')
  const charge = await chargeEvent(userId, price.label, credits, {
    refuseBelowPrice: false,
    oneRowPerDay: price.oneRowPerDay === true,
  })
  if (price.refusedBelowPrice && charge.taken < credits) {
    const { logWithThrottledNotification } = await import('./logToServer')
    await logWithThrottledNotification({
      level: 'warn',
      source: 'Server',
      message: 'charge.short',
      context: { userId, label: price.label, price: credits, taken: charge.taken, credits: charge.credits },
    })
  }

  const balance: AnnouncedBalance = { userId, credits: charge.credits }
  return balance
}
