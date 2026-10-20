import { beforeEach, describe, expect, it, vi } from 'vitest'

// The wallet's own behaviour is proven against a real database in wallet.integration.test.ts.
// Here it stands in, so these tests are about the middleware's decisions.
vi.mock('~stzUser/lib/server-auth', () => ({ getOptionalSessionUser: vi.fn() }))
vi.mock('~stzUser/lib/wallet.logic', () => ({ chargeEvent: vi.fn(), getWalletStatusInternal: vi.fn() }))
vi.mock('~stzUser/lib/logToServer', async (importOriginal) => ({
  ...(await importOriginal<typeof import('~stzUser/lib/logToServer')>()),
  logWithThrottledNotification: vi.fn(),
}))

import { getOptionalSessionUser } from '~stzUser/lib/server-auth'
import { getWalletStatusInternal, chargeEvent } from '~stzUser/lib/wallet.logic'
import { logWithThrottledNotification } from '~stzUser/lib/logToServer'
import { WALLET_EVENTS } from '~stzUser/lib/wallet-client'
import {
  NOT_ENOUGH_CREDITS,
  chargeOf,
  createServerCallCharge,
  type ServerFnPriceTable,
} from '~stzUser/lib/server-call-charge'

const GAMES = 'src/lib/server/games.ts'

const table: ServerFnPriceTable = [
  { file: GAMES, name: 'saveGame', price: 5, label: 'Game saved' },
  { file: GAMES, name: 'startRun', price: 8, label: 'Game analysed', refusedBelowPrice: true },
  { file: GAMES, name: 'practise', price: 1, label: 'Puzzles practised', oneRowPerDay: true },
]

type Halves = {
  server: (options: unknown) => Promise<{ sendContext?: unknown }>
  client: (options: unknown) => Promise<unknown>
}

// What the check before the work, the work and the charge after it look like from outside: the
// order in which they happened. A test that wants a different charge, or a different balance at
// the check, sets `charge` or `balance` before running.
const order: string[] = []
let charge = { refused: false, taken: 5, credits: 41 }
let balance = 41

/** Runs the server half for one server function, with work that may read its context or throw. */
function runServerHalf(name: string, file = GAMES, work?: (context: unknown) => void) {
  const next = vi.fn(async (passed?: { context?: unknown; sendContext?: unknown }) => {
    order.push('work')
    work?.(passed?.context)
    return { sendContext: passed?.sendContext, result: 'done' }
  })
  const { server } = createServerCallCharge(table).options as unknown as Halves
  return { next, run: server({ next, serverFnMeta: { id: 'x', name, filename: file } }) }
}

describe('server call charge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    order.length = 0
    charge = { refused: false, taken: 5, credits: 41 }
    balance = 41
    vi.mocked(getOptionalSessionUser).mockResolvedValue({ id: 'user-1' } as never)
    vi.mocked(getWalletStatusInternal).mockImplementation(async () => {
      order.push('check')
      return { credits: balance, welcomeClaimed: true }
    })
    vi.mocked(chargeEvent).mockImplementation(async () => {
      order.push('charge')
      return charge
    })
  })

  it('charges nothing for a function the table does not price, and does not look up the session', async () => {
    const { next, run } = runServerHalf('getThing')
    await run
    expect(getOptionalSessionUser).not.toHaveBeenCalled()
    expect(chargeEvent).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledWith({ context: { charge: expect.any(Object) }, sendContext: { balance: undefined } })
  })

  // A price names a file and an export. Renaming either would make a priced event free, silently,
  // so each app tests its own table against its own source.
  it('prices a function by its file as well as its name', async () => {
    const { run } = runServerHalf('saveGame', 'src/lib/server/other.ts')
    await run
    expect(chargeEvent).not.toHaveBeenCalled()
  })

  it('lets a signed-out call through free', async () => {
    vi.mocked(getOptionalSessionUser).mockResolvedValue(null)
    const { run } = runServerHalf('saveGame')
    await run
    expect(chargeEvent).not.toHaveBeenCalled()
  })

  it('charges a save after the work, so work that throws is never paid for', async () => {
    const { run } = runServerHalf('saveGame')
    const settled = await run
    expect(order).toEqual(['work', 'charge'])
    expect(chargeEvent).toHaveBeenCalledWith('user-1', 'Game saved', 5, { refuseBelowPrice: false, oneRowPerDay: false })
    expect(settled.sendContext).toEqual({ balance: { userId: 'user-1', credits: 41 } })
  })

  it('does not charge a save whose work throws', async () => {
    const { run } = runServerHalf('saveGame', GAMES, () => {
      throw new Error('the database said no')
    })
    await expect(run).rejects.toThrow('the database said no')
    expect(chargeEvent).not.toHaveBeenCalled()
  })

  it('checks a run before the work and charges it after, never refusing once the work is done', async () => {
    const { run } = runServerHalf('startRun')
    const settled = await run
    expect(order).toEqual(['check', 'work', 'charge'])
    expect(getWalletStatusInternal).toHaveBeenCalledWith('user-1')
    expect(chargeEvent).toHaveBeenCalledWith('user-1', 'Game analysed', 8, { refuseBelowPrice: false, oneRowPerDay: false })
    expect(settled.sendContext).toEqual({ balance: { userId: 'user-1', credits: 41 } })
  })

  it('refuses a run she cannot pay for in full, before the work runs, taking nothing, and says what she has', async () => {
    balance = 5
    const { next, run } = runServerHalf('startRun')
    await expect(run).rejects.toThrow(new RegExp(`^${NOT_ENOUGH_CREDITS}: this costs 8 and you have 5`))
    expect(next).not.toHaveBeenCalled()
    expect(chargeEvent).not.toHaveBeenCalled()
  })

  it('does not charge a run whose work throws', async () => {
    const { run } = runServerHalf('startRun', GAMES, () => {
      throw new Error('the model said no')
    })
    await expect(run).rejects.toThrow('the model said no')
    expect(order).toEqual(['check', 'work'])
    expect(chargeEvent).not.toHaveBeenCalled()
  })

  // Two calls overlapping on a low balance both pass the check; the second takes what is left.
  it('reports a run that comes up short at checkout, and still sends the balance home', async () => {
    charge = { refused: false, taken: 3, credits: 0 }
    const { run } = runServerHalf('startRun')
    const settled = await run
    expect(logWithThrottledNotification).toHaveBeenCalledWith({
      level: 'warn',
      source: 'Server',
      message: 'charge.short',
      context: { userId: 'user-1', label: 'Game analysed', price: 8, taken: 3, credits: 0 },
    })
    expect(settled.sendContext).toEqual({ balance: { userId: 'user-1', credits: 0 } })
  })

  it('does not report a run charged in full', async () => {
    charge = { refused: false, taken: 8, credits: 33 }
    await runServerHalf('startRun').run
    expect(logWithThrottledNotification).not.toHaveBeenCalled()
  })

  it('charges the price a call sets in place of the table\'s, checked against the table\'s', async () => {
    balance = 8
    const { run } = runServerHalf('startRun', GAMES, (context) => chargeOf(context).setPrice(11))
    await run
    expect(order).toEqual(['check', 'work', 'charge'])
    expect(chargeEvent).toHaveBeenCalledWith('user-1', 'Game analysed', 11, { refuseBelowPrice: false, oneRowPerDay: false })
  })

  it('fails a call that sets a price that is not a positive whole number, and charges nothing', async () => {
    const { run } = runServerHalf('startRun', GAMES, (context) => chargeOf(context).setPrice(0))
    await expect(run).rejects.toThrow('A call\'s price must be a positive whole number, not 0')
    expect(chargeEvent).not.toHaveBeenCalled()
  })

  it('charges nothing for a call that waives its charge, and sends no balance home', async () => {
    balance = 8
    const { run } = runServerHalf('startRun', GAMES, (context) => chargeOf(context).waive())
    const result = await run
    expect(order).toEqual(['check', 'work'])
    expect(chargeEvent).not.toHaveBeenCalled()
    expect(result.sendContext).toEqual({ balance: undefined })
  })

  it('still refuses a call that would waive its charge, before the work, when she cannot pay', async () => {
    balance = 3
    const { run, next } = runServerHalf('startRun', GAMES, (context) => chargeOf(context).waive())
    await expect(run).rejects.toThrow(NOT_ENOUGH_CREDITS)
    expect(next).not.toHaveBeenCalled()
  })

  it('charges by the last of a set price and a waiver', async () => {
    await runServerHalf('startRun', GAMES, (context) => { chargeOf(context).waive(); chargeOf(context).setPrice(11) }).run
    expect(chargeEvent).toHaveBeenCalledWith('user-1', 'Game analysed', 11, { refuseBelowPrice: false, oneRowPerDay: false })

    vi.mocked(chargeEvent).mockClear()
    await runServerHalf('startRun', GAMES, (context) => { chargeOf(context).setPrice(11); chargeOf(context).waive() }).run
    expect(chargeEvent).not.toHaveBeenCalled()
  })

  it('says so when a call reads a charge its context does not have', () => {
    expect(() => chargeOf({})).toThrow(/No charge in this call's context/)
  })

  it('passes a price marked one row a day on to the wallet', async () => {
    const { run } = runServerHalf('practise')
    await run
    expect(chargeEvent).toHaveBeenCalledWith('user-1', 'Puzzles practised', 1, {
      refuseBelowPrice: false,
      oneRowPerDay: true,
    })
  })

  it('lets a save through at zero, sends the unchanged balance home, and reports nothing', async () => {
    charge = { refused: false, taken: 0, credits: 0 }
    const { run } = runServerHalf('saveGame')
    const settled = await run
    expect(order).toEqual(['work', 'charge'])
    expect(settled.sendContext).toEqual({ balance: { userId: 'user-1', credits: 0 } })
    expect(logWithThrottledNotification).not.toHaveBeenCalled()
  })

  it('announces a balance that comes home to the page', async () => {
    const heard = vi.fn()
    window.addEventListener(WALLET_EVENTS.BALANCE, (event) => heard((event as CustomEvent).detail))
    const balance = { userId: 'user-1', credits: 41 }
    const { client } = createServerCallCharge(table).options as unknown as Halves
    await client({ next: async () => ({ context: { balance } }) })
    expect(heard).toHaveBeenCalledWith(balance)
  })
})
