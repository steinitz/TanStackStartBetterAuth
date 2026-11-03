/**
 * @vitest-environment node
 *
 * The inline check for a page whose entry file is gone, run as the browser runs it, against a fake
 * window. See planning doc pd-3e5lmh.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { APP_STARTED_FLAG, ENTRY_LOAD_GUARD } from '~stzUser/lib/entry-load-guard'

const CHROME = 'Failed to fetch dynamically imported module: https://example.test/assets/main-C5H5AcLK.js'
const SAFARI = 'Importing a module script failed.'

function fakeWindow() {
  const notes = new Map<string, string>()
  let listener = (_event: unknown) => {}
  const win: Record<string, unknown> & { location: { reload: ReturnType<typeof vi.fn> } } = {
    addEventListener: (_name: string, handler: typeof listener) => { listener = handler },
    location: { reload: vi.fn() },
    sessionStorage: {
      getItem: (key: string) => notes.get(key) ?? null,
      setItem: (key: string, value: string) => { notes.set(key, value) },
    },
  }
  new Function('window', ENTRY_LOAD_GUARD)(win)
  return { win, reject: (message: string) => listener({ reason: new Error(message) }) }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('a page whose entry file is gone', () => {
  it.each([['Chrome', CHROME], ['Safari', SAFARI]])('reloads on %s wording', (_browser, message) => {
    const { win, reject } = fakeWindow()
    reject(message)
    expect(win.location.reload).toHaveBeenCalledTimes(1)
  })

  it('leaves any other failure alone', () => {
    const { win, reject } = fakeWindow()
    reject('Failed to fetch')
    expect(win.location.reload).not.toHaveBeenCalled()
  })

  // After that a failed import is a route chunk, and reloading could lose what's on the page.
  it('stands down once the app has started', () => {
    const { win, reject } = fakeWindow()
    win[APP_STARTED_FLAG] = true
    reject(CHROME)
    expect(win.location.reload).not.toHaveBeenCalled()
  })

  it('cannot loop: at most one reload a minute', () => {
    const { win, reject } = fakeWindow()
    reject(CHROME)
    reject(CHROME)
    expect(win.location.reload).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(60_001)
    reject(CHROME)
    expect(win.location.reload).toHaveBeenCalledTimes(2)
  })

  it('does not reload when it cannot keep its note', () => {
    const { win, reject } = fakeWindow()
    win.sessionStorage = { getItem: () => { throw new Error('refused') } }
    reject(CHROME)
    expect(win.location.reload).not.toHaveBeenCalled()
  })
})
