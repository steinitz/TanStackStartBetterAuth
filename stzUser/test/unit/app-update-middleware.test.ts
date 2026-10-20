import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// The reload's own behaviour is proven in app-update.test.ts. Here only whether it is asked for,
// and what the page reports when it cannot reload, are the middleware's.
vi.mock('~stzUser/lib/app-update', async (importOriginal) => ({
  ...(await importOriginal<typeof import('~stzUser/lib/app-update')>()),
  updateIfStale: vi.fn(),
}))
vi.mock('~stzUser/lib/logToServer', () => ({ logToServer: vi.fn() }))

import { updateIfStale } from '~stzUser/lib/app-update'
import { logToServer } from '~stzUser/lib/logToServer'
import { STALE_PAGE_CALL, createAppUpdateCheck } from '~stzUser/lib/app-update-middleware'

type Halves = {
  client: (options: unknown) => Promise<unknown>
  server: (options: unknown) => Promise<unknown>
}
const halves = () => createAppUpdateCheck().options as unknown as Halves

const SOME_CALL = { name: 'saveGame', filename: 'src/lib/server/games.ts' }
const THE_LOG = { name: 'logToServerRpc', filename: 'stzUser/lib/logToServer.ts' }

/** The server half, for a call from a page of `pageBuild`. */
function serve(pageBuild: string | null | undefined, serverFnMeta = SOME_CALL) {
  const next = vi.fn(async () => ({ result: 'done' }))
  const context = pageBuild === undefined ? {} : { pageBuild }
  return { next, run: halves().server({ next, context, serverFnMeta }) }
}

// Lets the report's promise chain settle.
const settled = () => new Promise((resolve) => setTimeout(resolve, 0))

/**
 * A page from before a deploy is refused at the server, before any work, so the call fails and the
 * page reloads, rather than misread an answer the deploy changed. See planning doc pd-3e5lmh.
 */
describe('the update check, at the server', () => {
  beforeEach(() => vi.stubEnv('VITE_BUILD_VERSION', 'build-2'))
  afterEach(() => vi.unstubAllEnvs())

  it('lets a call from a page of its own build through', async () => {
    const { next, run } = serve('build-2')
    await expect(run).resolves.toEqual({ result: 'done' })
    expect(next).toHaveBeenCalled()
  })

  it('refuses a call from a page of another build, before any work', async () => {
    const { next, run } = serve('build-1')
    await expect(run).rejects.toThrow(`${STALE_PAGE_CALL}: the page runs build-1, the server build-2`)
    expect(next).not.toHaveBeenCalled()
  })

  // A page from before the page sent its build: the deploy that brings this refuses it too.
  it('refuses a call from a page that sends no build', async () => {
    const { next, run } = serve(undefined)
    await expect(run).rejects.toThrow(`${STALE_PAGE_CALL}: the page runs an older build`)
    expect(next).not.toHaveBeenCalled()
  })

  it('refuses nothing on the dev server, which has no build', async () => {
    vi.stubEnv('VITE_BUILD_VERSION', undefined)
    const { next, run } = serve('build-1')
    await expect(run).resolves.toEqual({ result: 'done' })
    expect(next).toHaveBeenCalled()
  })

  // Its error reports must still arrive, and a log's shape does not change with a deploy.
  it("lets a stale page's log through", async () => {
    const { next, run } = serve('build-1', THE_LOG)
    await expect(run).resolves.toEqual({ result: 'done' })
    expect(next).toHaveBeenCalled()
  })
})

describe('the update check, in the page', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_BUILD_VERSION', 'build-1')
    vi.mocked(updateIfStale).mockReset()
    vi.mocked(logToServer).mockReset()
    vi.mocked(logToServer).mockResolvedValue(undefined)
  })
  afterEach(() => vi.unstubAllEnvs())

  /** The page half, for a call whose server answers or throws as `next` does. */
  const call = (next: () => Promise<unknown>) => {
    const spy = vi.fn(next)
    return { next: spy, run: halves().client({ next: spy, serverFnMeta: SOME_CALL }) }
  }

  it('sends its build with every call', async () => {
    const { next, run } = call(async () => ({ result: 'done' }))
    await run
    expect(next).toHaveBeenCalledWith({ sendContext: { pageBuild: 'build-1' } })
  })

  it('asks for the reload when the server refuses the call', async () => {
    vi.mocked(updateIfStale).mockResolvedValue(true)
    const { run } = call(async () => { throw new Error(`${STALE_PAGE_CALL}: the page runs build-1, the server build-2`) })

    await expect(run).rejects.toThrow(STALE_PAGE_CALL)
    await settled()
    expect(updateIfStale).toHaveBeenCalledWith(expect.objectContaining({ failed: true }))
    expect(logToServer).not.toHaveBeenCalled()
  })

  // Should the server and the page ever differ within one deploy, every call would be refused.
  it('reports a refusal it cannot reload from, loudly', async () => {
    vi.mocked(updateIfStale).mockResolvedValue(false)
    const { run } = call(async () => { throw new Error(`${STALE_PAGE_CALL}: the page runs build-1, the server build-1b`) })

    await expect(run).rejects.toThrow(STALE_PAGE_CALL)
    await settled()
    expect(logToServer).toHaveBeenCalledWith({
      data: expect.objectContaining({ level: 'error', message: 'app.update.refusedNoReload', notify: true }),
    })
  })

  it('reports nothing for any other failure that finds the page current', async () => {
    vi.mocked(updateIfStale).mockResolvedValue(false)
    const { run } = call(async () => { throw new Error('Gemini answered 503') })

    await expect(run).rejects.toThrow('Gemini answered 503')
    await settled()
    expect(logToServer).not.toHaveBeenCalled()
  })
})
