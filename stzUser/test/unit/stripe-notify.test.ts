/**
 * @vitest-environment node
 *
 * Step 2 Chunk A gate — `notifyStripeFulfillmentFailure`. Two properties:
 *   - success path: it forwards a level:'error', source:'Server' structured alert through the shared
 *     logWithThrottledNotification core, un-suppressed so the notification email will fire
 *   - own-throws path: if the core itself throws, the helper still resolves (never propagates),
 *     so a broken mail rail can't flip the webhook's deliberate 200/500 posture (Codex P2).
 *
 * logWithThrottledNotification is mocked so no real email is attempted. (JetBrains "Move" won't
 * rewrite this string path — repoint by hand if the module moves. See memory: reference_jetbrains_vimock.)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('~stzUser/lib/logToServer', () => ({
  logWithThrottledNotification: vi.fn(),
}))

import { notifyStripeFulfillmentFailure } from '~stzUser/lib/wallet.logic'
import { logWithThrottledNotification } from '~stzUser/lib/logToServer'

const mockNotify = logWithThrottledNotification as unknown as ReturnType<typeof vi.fn>

describe('notifyStripeFulfillmentFailure', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('forwards an un-suppressed error alert carrying the failure context', async () => {
    mockNotify.mockResolvedValueOnce(undefined)

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

    expect(mockNotify).toHaveBeenCalledTimes(1)
    // The core takes a plain event object — no createServerFn `{ data: … }` wrapper.
    const arg = mockNotify.mock.calls[0][0]
    expect(arg.level).toBe('error')
    // Un-suppressed: server alerts want the email, so the flag is never set → the core sends it.
    expect(arg.suppressNotification).toBeUndefined()
    expect(arg.source).toBe('Server')
    expect(arg.message).toContain('amount mismatch')
    expect(arg.context).toMatchObject({
      eventId: 'evt_123',
      paymentIntentId: 'pi_123',
      userId: 'user_abc',
      amount: 999,
      currency: 'aud',
    })
  })

  it('never propagates when the core itself throws (posture stays intentional)', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockNotify.mockRejectedValueOnce(new Error('mail rail down'))

    await expect(
      notifyStripeFulfillmentFailure({ reason: 'vanished user', paymentIntentId: 'pi_456' }),
    ).resolves.toBeUndefined()

    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })
})
