/**
 * @vitest-environment node
 *
 * The money keys have no fallbacks, so an unset one reads as NaN — and every guard on the purchase
 * path is a `<` or `>` comparison, all of which are false against NaN. Removing the fallbacks
 * without this guard would therefore make the card path fail *open*: below-minimum, below-Stripe's
 * floor and above-Stripe's ceiling would all wave the request through in a row, leaving Stripe's
 * own API as the only thing that says no.
 *
 * Both purchase paths are covered here because each prices its request independently: the card path
 * through computeStripeAmountCents, the bank-transfer path through its own multiplication into an
 * email. Guarding one and not the other leaves support receiving requests for AUD$NaN.
 *
 * The guard reads process.env at call time (clientEnv captures at import), which is what lets these
 * tests break one key at a time without re-importing anything.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { mockCreate, mockSendEmail } = vi.hoisted(() => {
  // Captured by clientEnv at import: the flag must be on, or the card path refuses for that reason
  // instead of the one under test.
  process.env.IS_STRIPE_ENABLED = 'true'
  return { mockCreate: vi.fn(), mockSendEmail: vi.fn() }
})

vi.mock('~stzUser/lib/stripe.server', () => ({
  getStripe: () => ({ paymentIntents: { create: mockCreate } }),
  getStripeMinCents: () => 50,
}))

// Only the parts that cannot run in a unit test are faked: Stripe's API and the SMTP send. The
// guard, the pricing and the validation are all the real code.
vi.mock('~stzUser/lib/mail-utilities', () => ({
  sendEmail: mockSendEmail,
}))

import { createPaymentIntentForUser } from '~stzUser/lib/stripe-purchase.server'
import { requestBankTransferForUser } from '~stzUser/lib/wallet-bank-transfer.server'

const VALID_UUID = '123e4567-e89b-42d3-a456-426614174000'
const BUYER = { id: 'user_1', email: 'buyer@example.com' }

// Far above every floor at the configured price, so nothing but the configuration can reject it.
const CARD_INPUT = { creditsRequested: 100_000, idempotencyKey: VALID_UUID }
const BANK_INPUT = { amount: 100_000 }

// Each case breaks exactly one key, in one of the three ways a key can be broken: absent,
// unparseable, and blank — blank being the one that survives a bare `Number.isFinite` check,
// since Number('') is 0 rather than NaN.
const brokenConfigurations: ReadonlyArray<[string, () => void]> = [
  ['CREDIT_PRICE_AUD is unset', () => delete process.env.CREDIT_PRICE_AUD],
  ['CREDIT_PRICE_AUD is unparseable', () => (process.env.CREDIT_PRICE_AUD = 'free')],
  ['CREDIT_PRICE_AUD is blank', () => (process.env.CREDIT_PRICE_AUD = '   ')],
  ['CREDIT_PRICE_AUD is zero', () => (process.env.CREDIT_PRICE_AUD = '0')],
  ['MIN_CREDITS_PURCHASE is unset', () => delete process.env.MIN_CREDITS_PURCHASE],
  ['MIN_CREDITS_PURCHASE is unparseable', () => (process.env.MIN_CREDITS_PURCHASE = 'ten')],
  ['MIN_CREDITS_PURCHASE is blank', () => (process.env.MIN_CREDITS_PURCHASE = '')],
  ['MIN_CREDITS_PURCHASE is fractional', () => (process.env.MIN_CREDITS_PURCHASE = '10.5')],
]

describe('purchase configuration guard', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    originalEnv = { ...process.env }
    vi.clearAllMocks()
    mockCreate.mockResolvedValue({ client_secret: 'pi_secret_abc' })
    mockSendEmail.mockResolvedValue(undefined)
  })

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) delete process.env[key]
    }
    Object.assign(process.env, originalEnv)
  })

  describe('the card path', () => {
    it.each(brokenConfigurations)('refuses when %s, and never reaches Stripe', async (_label, breakIt) => {
      breakIt()

      await expect(createPaymentIntentForUser('user_1', CARD_INPUT)).rejects.toThrow(
        /missing pricing configuration/,
      )
      expect(mockCreate).not.toHaveBeenCalled()
    })

    it('names no keys to the buyer — those go to the server log', async () => {
      delete process.env.CREDIT_PRICE_AUD

      await expect(createPaymentIntentForUser('user_1', CARD_INPUT)).rejects.toThrow(
        expect.objectContaining({ message: expect.not.stringContaining('CREDIT_PRICE_AUD') }),
      )
    })

    it('still creates the intent when the configuration is sound', async () => {
      await expect(createPaymentIntentForUser('user_1', CARD_INPUT)).resolves.toEqual({
        clientSecret: 'pi_secret_abc',
      })
      expect(mockCreate).toHaveBeenCalledTimes(1)
    })
  })

  describe('the bank-transfer path', () => {
    it.each(brokenConfigurations)('refuses when %s, and sends no email', async (_label, breakIt) => {
      breakIt()

      await expect(requestBankTransferForUser(BUYER, BANK_INPUT)).rejects.toThrow(
        /missing pricing configuration/,
      )
      // The load-bearing half: without the guard this path computes amount × NaN and mails
      // support a request for "AUD$NaN" that no comparison anywhere would have stopped.
      expect(mockSendEmail).not.toHaveBeenCalled()
    })

    it('still emails support when the configuration is sound', async () => {
      await expect(requestBankTransferForUser(BUYER, BANK_INPUT)).resolves.toEqual({ success: true })
      expect(mockSendEmail).toHaveBeenCalledTimes(1)

      // Proves the refusals above come from the guard rather than from a path that is simply
      // broken: a sound configuration produces a real figure, not NaN.
      const [{ data }] = mockSendEmail.mock.calls[0]
      expect(data.text).not.toContain('NaN')
    })
  })
})
