import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

vi.mock('~stzUser/lib/pending-reports', () => ({ sendPendingReports: vi.fn(async () => {}) }))

/**
 * After an update's reload, the new page says so until the user taps OK: "Update Complete", and nothing
 * more, though a failed call began it — Steve, 2026-10-20. See planning doc pd-3e5lmh.
 */
describe('AppUpdate', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('VITE_BUILD_VERSION', 'b')
  })
  afterEach(() => {
    cleanup()
    sessionStorage.clear()
    vi.unstubAllEnvs()
  })

  it('says only "Update Complete" after a reload a failed call began', async () => {
    sessionStorage.setItem('stz.appUpdate', JSON.stringify({ build: 'b', reloadedAt: 1, failed: true, acknowledged: false }))
    const { AppUpdate } = await import('~stzUser/components/Other/AppUpdate')

    render(<AppUpdate />)

    expect(screen.getByText('Update Complete')).toBeTruthy()
    expect(document.body.textContent).not.toContain('Error')
    expect(screen.getByRole('button', { name: 'OK' })).toBeTruthy()
  })
})
