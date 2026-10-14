import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { shouldReload, type UpdateNote } from './app-update'

const noteFor = (build: string, acknowledged = false): UpdateNote =>
  ({ build, reloadedAt: 1, failed: false, acknowledged })

describe('shouldReload', () => {
  it('reloads into a build the page does not run', () => {
    expect(shouldReload('a', 'b', null)).toBe(true)
  })

  it('stays when the server serves the build the page runs', () => {
    expect(shouldReload('a', 'a', null)).toBe(false)
  })

  it('never reloads twice into the same build, so a stale cached page cannot loop', () => {
    expect(shouldReload('a', 'b', noteFor('b'))).toBe(false)
    expect(shouldReload('a', 'b', noteFor('b', true))).toBe(false)
  })

  it('reloads into a newer build after an earlier update', () => {
    expect(shouldReload('b', 'c', noteFor('b', true))).toBe(true)
  })

  it('stays when either build is unknown: the dev server, or offline', () => {
    expect(shouldReload(null, 'b', null)).toBe(false)
    expect(shouldReload('a', null, null)).toBe(false)
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
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    document.body.innerHTML = ''
  })

  it('reloads into the served build once, saying an update was required', async () => {
    serve('b')
    const { updateIfStale, getUpdateNote } = await load()

    expect(await updateIfStale({ failed: true })).toBe(true)
    expect(getUpdateNote()).toMatchObject({ build: 'b', failed: true, acknowledged: false })
    expect(document.body.textContent).toContain('Error: Update required')

    // A second failure before the page goes finds the note and does nothing more.
    expect(await updateIfStale({ failed: true })).toBe(false)
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

  it('shows Update Complete after the reload until she taps OK', async () => {
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
