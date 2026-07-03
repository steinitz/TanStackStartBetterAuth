/**
 * @vitest-environment node
 *
 * Step 0 gate: IS_STRIPE_ENABLED is now env-driven on the server (was a hardcoded false).
 * clientEnv reads process.env once at module load, so each case re-imports with resetModules.
 * (No .env file defines IS_STRIPE_ENABLED, so these assertions are fully controlled here.)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

describe.sequential('IS_STRIPE_ENABLED (server, env-driven)', () => {
  beforeEach(() => {
    vi.resetModules()
    delete process.env.IS_STRIPE_ENABLED
  })

  it('is true when IS_STRIPE_ENABLED=true', async () => {
    process.env.IS_STRIPE_ENABLED = 'true'
    const { clientEnv } = await import('~stzUser/lib/env')
    expect(clientEnv.IS_STRIPE_ENABLED).toBe(true)
  })

  it('is false when the env var is absent (off by default)', async () => {
    const { clientEnv } = await import('~stzUser/lib/env')
    expect(clientEnv.IS_STRIPE_ENABLED).toBe(false)
  })

  it('is false for any non-"true" value', async () => {
    process.env.IS_STRIPE_ENABLED = '1'
    const { clientEnv } = await import('~stzUser/lib/env')
    expect(clientEnv.IS_STRIPE_ENABLED).toBe(false)
  })
})
