import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as v from 'valibot'

const { sendEmail } = vi.hoisted(() => {
  // Captured by clientEnv at import: the bank-transfer path refuses when it has nowhere to send.
  process.env.SUPPORT_EMAIL_ADDRESS = 'support@example.com'
  return { sendEmail: vi.fn() }
})

vi.mock('~stzUser/lib/mail.server', () => ({
  sendEmail,
}))

import {
  BankTransferRequestSchema,
  ConsumeResourceSchema,
  MAX_CREDITS_PURCHASE,
  TimezoneOffsetSchema,
} from '~stzUser/lib/wallet'
import { requestBankTransferForUser } from '~stzUser/lib/wallet-bank-transfer.server'
import { MAX_RESOURCE_CONSUMPTION } from '~stzUser/lib/wallet.logic'

describe('wallet server input validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // The offset is remembered and every charge dates the daily grant by it, so it must be a real one.
  it.each([36_000_000, -18_000_000, 0, undefined])('accepts timezone offset %s', (offset) => {
    expect(v.safeParse(TimezoneOffsetSchema, offset).success).toBe(true)
  })

  it.each([NaN, Infinity, 1.5, 15 * 3_600_000, -15 * 3_600_000, '36000000'])(
    'rejects timezone offset %s at the server boundary',
    (offset) => {
      expect(v.safeParse(TimezoneOffsetSchema, offset).success).toBe(false)
    },
  )

  it('defaults consumption to one credit and trims the resource type', () => {
    expect(v.parse(ConsumeResourceSchema, { resourceType: ' analysis ' })).toEqual({
      resourceType: 'analysis',
      amount: 1,
    })
  })

  it.each([
    NaN,
    Infinity,
    -1,
    0,
    1.5,
    MAX_RESOURCE_CONSUMPTION + 1,
  ])('rejects consumption amount %s at the server boundary', (amount) => {
    expect(v.safeParse(ConsumeResourceSchema, {
      resourceType: 'analysis',
      amount,
    }).success).toBe(false)
  })

  it.each([
    '',
    '   ',
    'x'.repeat(101),
  ])('rejects resource type %j at the server boundary', (resourceType) => {
    expect(v.safeParse(ConsumeResourceSchema, {
      resourceType,
      amount: 1,
    }).success).toBe(false)
  })

  it.each([
    NaN,
    Infinity,
    -1,
    0,
    1.5,
    MAX_CREDITS_PURCHASE + 1,
  ])('rejects bank-transfer amount %s without sending email', async (amount) => {
    expect(v.safeParse(BankTransferRequestSchema, { amount }).success).toBe(false)
    await expect(requestBankTransferForUser(
      { id: 'user-1', email: 'user@example.com' },
      { amount },
    )).rejects.toThrow()
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('sends one bank-transfer email for a valid bounded whole amount', async () => {
    await expect(requestBankTransferForUser(
      { id: 'user-1', email: 'user@example.com' },
      { amount: 10 },
    )).resolves.toEqual({ success: true })

    expect(sendEmail).toHaveBeenCalledOnce()
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('10 credits'),
      }),
    )
  })
})
