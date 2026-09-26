import { beforeEach, describe, expect, it, vi } from 'vitest'

// The wallet's own behaviour is proven against a real database in wallet.integration.test.ts.
// Here it stands in, so these tests are about the middleware's decisions.
vi.mock('~stzUser/lib/server-auth', () => ({ getOptionalSessionUser: vi.fn() }))
vi.mock('~stzUser/lib/wallet.logic', () => ({ takeCreditsUpTo: vi.fn() }))

import { getOptionalSessionUser } from '~stzUser/lib/server-auth'
import { takeCreditsUpTo } from '~stzUser/lib/wallet.logic'
import { WALLET_EVENTS } from '~stzUser/lib/wallet-client'
import {
  OUT_OF_CREDITS,
  createServerCallCharge,
  type ServerFnPriceTable,
} from '~stzUser/lib/server-call-charge'

const GAMES = 'src/lib/server/games.ts'

const table: ServerFnPriceTable = [
  { file: GAMES, name: 'saveGame', price: 5, label: 'Game saved' },
  { file: GAMES, name: 'startRun', price: 8, label: 'Game analysed', refusedAtZero: true },
]

type Halves = {
  server: (options: unknown) => Promise<{ sendContext?: unknown }>
  client: (options: unknown) => Promise<unknown>
}

// What the charge before the work and the charge after it look like from outside: the order in
// which the two happened. A test that wants a different charge sets `charge` before running.
const order: string[] = []
let charge = { refused: false, taken: 5, credits: 41 }

/** Runs the server half for one server function, optionally with work that throws. */
function runServerHalf(name: string, file = GAMES, work?: () => void) {
  const next = vi.fn(async (context?: { sendContext?: unknown }) => {
    order.push('work')
    work?.()
    return { sendContext: context?.sendContext, result: 'done' }
  })
  const { server } = createServerCallCharge(table).options as unknown as Halves
  return { next, run: server({ next, serverFnMeta: { id: 'x', name, filename: file } }) }
}

describe('server call charge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    order.length = 0
    charge = { refused: false, taken: 5, credits: 41 }
    vi.mocked(getOptionalSessionUser).mockResolvedValue({ id: 'user-1' } as never)
    vi.mocked(takeCreditsUpTo).mockImplementation(async () => {
      order.push('charge')
      return charge
    })
  })

  it('charges nothing for a function the table does not price, and does not look up the session', async () => {
    const { next, run } = runServerHalf('getThing')
    await run
    expect(getOptionalSessionUser).not.toHaveBeenCalled()
    expect(takeCreditsUpTo).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledWith({ sendContext: { balance: undefined } })
  })

  // A price names a file and an export. Renaming either would make a priced event free, silently,
  // so each app tests its own table against its own source.
  it('prices a function by its file as well as its name', async () => {
    const { run } = runServerHalf('saveGame', 'src/lib/server/other.ts')
    await run
    expect(takeCreditsUpTo).not.toHaveBeenCalled()
  })

  it('lets a signed-out call through free', async () => {
    vi.mocked(getOptionalSessionUser).mockResolvedValue(null)
    const { run } = runServerHalf('saveGame')
    await run
    expect(takeCreditsUpTo).not.toHaveBeenCalled()
  })

  it('charges a save after the work, so work that throws is never paid for', async () => {
    const { run } = runServerHalf('saveGame')
    const settled = await run
    expect(order).toEqual(['work', 'charge'])
    expect(takeCreditsUpTo).toHaveBeenCalledWith('user-1', 'Game saved', 5, { refuseAtZero: false })
    expect(settled.sendContext).toEqual({ balance: { userId: 'user-1', credits: 41 } })
  })

  it('does not charge a save whose work throws', async () => {
    const { run } = runServerHalf('saveGame', GAMES, () => {
      throw new Error('the database said no')
    })
    await expect(run).rejects.toThrow('the database said no')
    expect(takeCreditsUpTo).not.toHaveBeenCalled()
  })

  it('charges a run before the work, so a refusal arrives instead of it', async () => {
    const { next, run } = runServerHalf('startRun')
    await run
    expect(order).toEqual(['charge', 'work'])
    expect(takeCreditsUpTo).toHaveBeenCalledWith('user-1', 'Game analysed', 8, { refuseAtZero: true })
    expect(next).toHaveBeenCalledWith({ sendContext: { balance: { userId: 'user-1', credits: 41 } } })
  })

  it('refuses a run at zero, before the work runs', async () => {
    charge = { refused: true, taken: 0, credits: 0 }
    const { next, run } = runServerHalf('startRun')
    await expect(run).rejects.toThrow(new RegExp(`^${OUT_OF_CREDITS}`))
    expect(next).not.toHaveBeenCalled()
  })

  it('lets a save through at zero, and sends the unchanged balance home', async () => {
    charge = { refused: false, taken: 0, credits: 0 }
    const { run } = runServerHalf('saveGame')
    const settled = await run
    expect(order).toEqual(['work', 'charge'])
    expect(settled.sendContext).toEqual({ balance: { userId: 'user-1', credits: 0 } })
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
