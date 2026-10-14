import { beforeEach, describe, expect, it, vi } from 'vitest'

const logToServer = vi.hoisted(() => vi.fn())
vi.mock('./logToServer', () => ({ logToServer }))

import { queueReport, sendPendingReports, sendReport } from './pending-reports'

const queued = () => JSON.parse(sessionStorage.getItem('stz.pendingReports') ?? '[]')

describe('pending reports', () => {
  beforeEach(() => {
    sessionStorage.clear()
    logToServer.mockReset()
  })

  it('sends a report and forgets it once it arrived, emailing Steve', async () => {
    logToServer.mockResolvedValue(undefined)
    sendReport({ message: 'signIn.slow', context: { waitedMs: 10_000 } })
    await vi.waitFor(() => expect(queued()).toEqual([]))
    expect(logToServer).toHaveBeenCalledWith({
      data: { level: 'error', message: 'signIn.slow', context: { waitedMs: 10_000 }, notify: true },
    })
  })

  it('keeps a report that fails, for the next page', async () => {
    logToServer.mockRejectedValue(new Error('Server call failed: 500 HTTPError'))
    sendReport({ message: 'signIn.slow', context: {} })
    await vi.waitFor(() => expect(logToServer).toHaveBeenCalledTimes(1))
    expect(queued()).toEqual([{ message: 'signIn.slow', context: {} }])
  })

  it('sends what an older page queued, oldest first', async () => {
    logToServer.mockResolvedValue(undefined)
    queueReport({ message: 'first', context: {} })
    queueReport({ message: 'second', context: {} })
    expect(logToServer).not.toHaveBeenCalled()

    await sendPendingReports()
    expect(logToServer.mock.calls.map(([call]) => call.data.message)).toEqual(['first', 'second'])
    expect(queued()).toEqual([])
  })
})
