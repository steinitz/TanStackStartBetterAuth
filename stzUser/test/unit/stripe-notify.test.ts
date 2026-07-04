/**
 * @vitest-environment node
 *
 * Step 2 Chunk A gate — `notifyStripeFulfillmentFailure`. Two properties:
 *   - success path: it forwards a level:'error', notify:true structured alert through logToServer
 *   - own-throws path: if logToServer itself throws, the helper still resolves (never propagates),
 *     so a broken mail rail can't flip the webhook's deliberate 200/500 posture (Codex P2).
 *
 * logToServer is mocked so no real email is attempted. (JetBrains "Move" won't rewrite this string
 * path — repoint by hand if the module moves. See memory: reference_jetbrains_vimock.)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('~stzUser/lib/logToServer', () => ({
  logToServer: vi.fn(),
}))

import { notifyStripeFulfillmentFailure } from '~stzUser/lib/wallet.logic'
import { logToServer } from '~stzUser/lib/logToServer'

const mockLogToServer = logToServer as unknown as ReturnType<typeof vi.fn>

describe('notifyStripeFulfillmentFailure', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('forwards a notify:true error alert carrying the failure context', async () => {
    mockLogToServer.mockResolvedValueOnce(undefined)

    await expect(
      notifyStripeFulfillmentFailure({
        reason: 'amount mismatch',
        eventId: 'evt_123',
        paymentIntentId: 'pi_123',
        userId: 'user_abc',
        amount: 999,
        currency: 'aud',
        metadata: { creditsRequested: '10' },
      }),
    ).resolves.toBeUndefined()

    expect(mockLogToServer).toHaveBeenCalledTimes(1)
    const arg = mockLogToServer.mock.calls[0][0]
    expect(arg.data.level).toBe('error')
    expect(arg.data.notify).toBe(true)
    expect(arg.data.message).toContain('amount mismatch')
    expect(arg.data.context).toMatchObject({
      eventId: 'evt_123',
      paymentIntentId: 'pi_123',
      userId: 'user_abc',
      amount: 999,
      currency: 'aud',
    })
  })

  it('never propagates when logToServer itself throws (posture stays intentional)', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockLogToServer.mockRejectedValueOnce(new Error('mail rail down'))

    await expect(
      notifyStripeFulfillmentFailure({ reason: 'vanished user', paymentIntentId: 'pi_456' }),
    ).resolves.toBeUndefined()

    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })
})
