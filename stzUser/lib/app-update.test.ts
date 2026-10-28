import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { shouldReload, type UpdateNote } from './app-update'

// How a page arrived, as performance's navigation entry names it.
const byReload = 'reload'
const byBack = 'back_forward'

const noteFor = (build: string, acknowledged = false): UpdateNote =>
  ({ build, reloadedAt: 1, failed: false, acknowledged })

describe('shouldReload', () => {
  it('reloads into a build the page does not run', () => {
    expect(shouldReload('a', 'b', null, byReload)).toBe(true)
  })

  it('stays when the server serves the build the page runs', () => {
    expect(shouldReload('a', 'a', null, byReload)).toBe(false)
  })

  it('never reloads twice into the same build from the page its reload brought, so a stale cached page cannot loop', () => {
    expect(shouldReload('a', 'b', noteFor('b'), byReload)).toBe(false)
    expect(shouldReload('a', 'b', noteFor('b', true), byReload)).toBe(false)
    // An arrival the browser does not name keeps the guard.
    expect(shouldReload('a', 'b', noteFor('b'), null)).toBe(false)
  })

  // Back, or a tab restored after a restart, brings the old page from the cache — 2026-10-28.
  it('reloads again into that build from a page that came by Back, a restore or a new visit', () => {
    expect(shouldReload('a', 'b', noteFor('b', true), byBack)).toBe(true)
    expect(shouldReload('a', 'b', noteFor('b', true), 'navigate')).toBe(true)
  })

  it('reloads into a newer build after an earlier update', () => {
    expect(shouldReload('b', 'c', noteFor('b', true), byReload)).toBe(true)
  })

  it('stays when either build is unknown: the dev server, or offline', () => {
    expect(shouldReload(null, 'b', null, byReload)).toBe(false)
    expect(shouldReload('a', null, null, byReload)).toBe(false)
  })
})

describe('updateIfStale', () => {
  // The module keeps the note it has read, so each test gets a fresh copy.
  const load = async () => {
    vi.resetModules()
    return import('./app-update')
  }
  const serve = (version: string) =>
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ version }))))

  beforeEach(() => {
    sessionStorage.clear()
    vi.useFakeTimers()
    // jsdom has no showModal.
    HTMLDialogElement.prototype.showModal = vi.fn()
    vi.stubEnv('VITE_BUILD_VERSION', 'a')
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    document.body.innerHTML = ''
  })

  // Positive, and large enough to read in the moment it shows — Steve, 2026-10-20.
  it('reloads into the served build once, saying only that it is updating', async () => {
    serve('b')
    const { updateIfStale, getUpdateNote } = await load()

    expect(await updateIfStale({ failed: true })).toBe(true)
    expect(getUpdateNote()).toMatchObject({ build: 'b', failed: true, acknowledged: false })
    expect(document.body.textContent).toMatch(/^Updating .+…$/)
  })

  // The home page's two calls, refused together, once read as a page that could not reload.
  it('tells a second ask that the reload is under way, and does nothing more', async () => {
    serve('b')
    const { updateIfStale } = await load()

    const [first, second] = await Promise.all([updateIfStale({ failed: true }), updateIfStale({ failed: true })])
    expect([first, second]).toEqual([true, true])
    expect(await updateIfStale({ failed: true })).toBe(true)
    expect(document.querySelectorAll('dialog')).toHaveLength(1)
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledTimes(1)
  })

  it('leaves its report for the new page, naming both builds', async () => {
    serve('b')
    const { updateIfStale } = await load()

    await updateIfStale({ failed: true, report: { message: 'app.update.staleCall', context: { fn: 'getUserGames' } } })
    expect(JSON.parse(sessionStorage.getItem('stz.pendingReports')!)).toEqual([{
      message: 'app.update.staleCall',
      context: { fn: 'getUserGames', runningBuild: 'a', servedBuild: 'b', path: '/' },
    }])
  })

  it('says only "Updating" when the tab woke, since nothing failed', async () => {
    serve('b')
    const { updateIfStale } = await load()

    await updateIfStale({ failed: false })
    expect(document.body.textContent).not.toContain('Error')
    expect(document.body.textContent).toContain('Updating')
  })

  it('does nothing when the page runs the served build', async () => {
    serve('a')
    const { updateIfStale, getUpdateNote } = await load()

    expect(await updateIfStale({ failed: true })).toBe(false)
    expect(getUpdateNote()).toBeNull()
  })

  it('does nothing offline', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch') }))
    const { updateIfStale } = await load()

    expect(await updateIfStale({ failed: true })).toBe(false)
  })

  it('never asks the server on the dev server, which has no stamp', async () => {
    vi.stubEnv('VITE_BUILD_VERSION', undefined)
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const { updateIfStale } = await load()

    expect(await updateIfStale({ failed: true })).toBe(false)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  // The page from 2026-10-28's emails: its tab had reloaded into 'b', then the old page came back.
  it('reloads a page that came back by Back after its tab had already reloaded into that build', async () => {
    serve('b')
    sessionStorage.setItem('stz.appUpdate', JSON.stringify(noteFor('b', true)))
    vi.spyOn(performance, 'getEntriesByType').mockReturnValue([{ type: byBack }] as unknown as PerformanceEntryList)
    const { updateIfStale } = await load()

    expect(await updateIfStale({ failed: true })).toBe(true)
  })

  it('stays put on the page its own reload brought, when that page still runs the old build', async () => {
    serve('b')
    sessionStorage.setItem('stz.appUpdate', JSON.stringify(noteFor('b')))
    vi.spyOn(performance, 'getEntriesByType').mockReturnValue([{ type: byReload }] as unknown as PerformanceEntryList)
    const { updateIfStale } = await load()

    expect(await updateIfStale({ failed: true })).toBe(false)
    expect(HTMLDialogElement.prototype.showModal).not.toHaveBeenCalled()
  })

  it('does not reload when the note cannot be kept, which would let it loop', async () => {
    serve('b')
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    const { updateIfStale } = await load()

    expect(await updateIfStale({ failed: true })).toBe(false)
    expect(HTMLDialogElement.prototype.showModal).not.toHaveBeenCalled()
    setItem.mockRestore()
  })

  it('shows Update Complete after the reload until the user taps OK', async () => {
    sessionStorage.setItem('stz.appUpdate', JSON.stringify(noteFor('a')))
    const { getUpdateNote, isUpdateCompletePending, acknowledgeUpdate } = await load()

    expect(isUpdateCompletePending(getUpdateNote())).toBe(true)
    acknowledgeUpdate()
    expect(isUpdateCompletePending(getUpdateNote())).toBe(false)
    // Kept, not cleared: it is what forbids reloading into this build again.
    expect(JSON.parse(sessionStorage.getItem('stz.appUpdate')!)).toMatchObject({ build: 'a', acknowledged: true })
  })
})

describe('isUnhandledServerError', () => {
  it('recognises the answer a missing server function sends', async () => {
    const { isUnhandledServerError } = await import('./app-update-middleware')
    expect(isUnhandledServerError({ status: 500, unhandled: true, message: 'HTTPError' })).toBe(true)
  })

  it('leaves ordinary answers alone, including ones that carry a status', async () => {
    const { isUnhandledServerError } = await import('./app-update-middleware')
    expect(isUnhandledServerError({ status: 500, message: 'HTTPError' })).toBe(false)
    expect(isUnhandledServerError({ unhandled: true })).toBe(false)
    expect(isUnhandledServerError([{ id: 1 }])).toBe(false)
    expect(isUnhandledServerError(null)).toBe(false)
    expect(isUnhandledServerError('HTTPError')).toBe(false)
  })
})
