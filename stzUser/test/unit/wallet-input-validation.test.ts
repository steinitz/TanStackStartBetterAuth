import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as v from 'valibot'

const { sendEmail } = vi.hoisted(() => ({
  sendEmail: vi.fn(),
}))

vi.mock('~stzUser/lib/mail-utilities', () => ({
  sendEmail,
}))

import {
  BankTransferRequestSchema,
  ConsumeResourceSchema,
  MAX_CREDITS_PURCHASE,
  requestBankTransferForUser,
} from '~stzUser/lib/wallet'
import { MAX_RESOURCE_CONSUMPTION } from '~stzUser/lib/wallet.logic'

describe('wallet server input validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

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
    expect(sendEmail).toHaveBeenCalledWith({
      data: expect.objectContaining({
        text: expect.stringContaining('10 credits'),
      }),
    })
  })
})
