/**
 * @vitest-environment node
 *
 * Step 0 gate: IS_STRIPE_ENABLED is now env-driven on the server (was a hardcoded false).
 * clientEnv reads process.env once at module load, so each case re-imports with resetModules.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const originalStripeEnabled = process.env.IS_STRIPE_ENABLED

const restoreEnvVar = (name: string, value: string | undefined) => {
  if (value === undefined) {
    delete process.env[name]
  } else {
    process.env[name] = value
  }
}

describe.sequential('IS_STRIPE_ENABLED (server, env-driven)', () => {
  beforeEach(() => {
    vi.resetModules()
    delete process.env.IS_STRIPE_ENABLED
  })

  afterEach(() => {
    restoreEnvVar('IS_STRIPE_ENABLED', originalStripeEnabled)
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
