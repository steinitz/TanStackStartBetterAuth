import { existsSync, readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The wallet's own behaviour is proven against a real database in wallet.integration.test.ts.
// Here it stands in, so these tests are about the middleware's decisions.
vi.mock('~stzUser/lib/server-auth', () => ({ getOptionalSessionUser: vi.fn() }))
vi.mock('~stzUser/lib/wallet.logic', () => ({ consumeResourceInternal: vi.fn() }))

import { getOptionalSessionUser } from '~stzUser/lib/server-auth'
import { consumeResourceInternal } from '~stzUser/lib/wallet.logic'
import { WALLET_EVENTS } from '~stzUser/lib/wallet-client'
import {
  FREE_SERVER_FN_FILES,
  OUT_OF_CREDITS,
  isFreeServerFnFile,
  serverCallCharge,
} from '~stzUser/lib/server-call-charge'

type Halves = {
  server: (options: unknown) => Promise<unknown>
  client: (options: unknown) => Promise<unknown>
}
const { server, client } = serverCallCharge.options as unknown as Halves

function runServerHalf(filename: string) {
  const next = vi.fn(async (context?: unknown) => ({ nextCalledWith: context }))
  const run = server({ next, serverFnMeta: { id: 'x', name: 'getThing', filename } })
  return { next, run }
}

describe('server call charge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getOptionalSessionUser).mockResolvedValue({ id: 'user-1' } as never)
    vi.mocked(consumeResourceInternal).mockResolvedValue({ success: true, message: '', credits: 41 })
  })

  it('frees exactly the listed files', () => {
    for (const file of FREE_SERVER_FN_FILES) expect(isFreeServerFnFile(file)).toBe(true)
    expect(isFreeServerFnFile('src/lib/server/games.ts')).toBe(false)
  })

  // The list matches paths exactly, so a renamed file would be charged without a word.
  it('names only files that exist and define server functions', () => {
    for (const file of FREE_SERVER_FN_FILES) {
      expect(existsSync(file), file).toBe(true)
      expect(readFileSync(file, 'utf8'), file).toContain('createServerFn(')
    }
  })

  it('charges nothing for a free file, and does not look up the session', async () => {
    const { next, run } = runServerHalf('stzUser/lib/wallet.ts')
    await run
    expect(getOptionalSessionUser).not.toHaveBeenCalled()
    expect(consumeResourceInternal).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledWith({ sendContext: { balance: undefined } })
  })

  it('lets a signed-out call through free', async () => {
    vi.mocked(getOptionalSessionUser).mockResolvedValue(null)
    const { next, run } = runServerHalf('src/lib/server/games.ts')
    await run
    expect(consumeResourceInternal).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledWith({ sendContext: { balance: undefined } })
  })

  it('charges a signed-in call one credit, named for the function, and sends the balance home', async () => {
    const { next, run } = runServerHalf('src/lib/server/games.ts')
    await run
    expect(consumeResourceInternal).toHaveBeenCalledWith('user-1', 'server_call:getThing', 1)
    expect(next).toHaveBeenCalledWith({ sendContext: { balance: { userId: 'user-1', credits: 41 } } })
  })

  it('refuses the call at zero, before the work runs', async () => {
    vi.mocked(consumeResourceInternal).mockResolvedValue({ success: false, message: 'Insufficient credits', credits: 0 })
    const { next, run } = runServerHalf('src/lib/server/games.ts')
    await expect(run).rejects.toThrow(new RegExp(`^${OUT_OF_CREDITS}`))
    expect(next).not.toHaveBeenCalled()
  })

  it('announces a balance that comes home to the page', async () => {
    const heard = vi.fn()
    window.addEventListener(WALLET_EVENTS.BALANCE, (event) => heard((event as CustomEvent).detail))
    const balance = { userId: 'user-1', credits: 41 }
    await client({ next: async () => ({ context: { balance } }) })
    expect(heard).toHaveBeenCalledWith(balance)
  })
})
