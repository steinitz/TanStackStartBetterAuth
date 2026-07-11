import { describe, it, expect } from 'vitest'
import { requireInjectedEnv } from '~stzUser/lib/env'

// requireInjectedEnv is the browser fail-loud guard: a real browser must receive a complete
// window.__ENV or the client env refuses to initialize. These pin that contract without a browser.
// In this Node-like test runtime the guard's failure telemetry is skipped, so no logToServer
// mock is needed — the assertions below see only the throw.
describe('requireInjectedEnv', () => {
  const template = () => ({ A: 1, B: 2 })

  it('throws when the injection is entirely missing', () => {
    expect(() => requireInjectedEnv(undefined, template, 'clientEnv'))
      .toThrow(/clientEnv: window\.__ENV was not injected/)
  })

  it('throws when the injection is not an object', () => {
    expect(() => requireInjectedEnv('nope', template, 'clientEnv'))
      .toThrow(/was not injected/)
  })

  it('throws naming the gap when the injection is incomplete', () => {
    expect(() => requireInjectedEnv({ A: 1 }, template, 'clientEnv'))
      .toThrow(/missing keys: B/)
  })

  it('accepts a complete injection and returns it unchanged', () => {
    const injected = { A: 10, B: 20 }
    expect(requireInjectedEnv(injected, template, 'clientEnv')).toBe(injected)
  })

  it('accepts a present null value as a satisfied key (optionals serialize as null, not undefined)', () => {
    const injected = { A: 1, B: null }
    expect(requireInjectedEnv(injected, template, 'clientEnv')).toBe(injected)
  })
})
