import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => {
    let validator = (data: unknown) => data
    let serverHandler: (input: { data: unknown }) => unknown

    const serverFunction = async (input?: { data?: unknown }) => {
      const data = validator(input?.data)
      return serverHandler({ data })
    }
    serverFunction.inputValidator = (nextValidator: typeof validator) => {
      validator = nextValidator
      return serverFunction
    }
    serverFunction.handler = (nextHandler: typeof serverHandler) => {
      serverHandler = nextHandler
      return serverFunction
    }

    return serverFunction
  },
}))

const {
  getCurrentAdminStatus,
  requireAdminUser,
  addCreditsInternal,
  removeCreditsInternal,
  getAdminCreditTargetInternal,
  getLedgerPurgePreviewInternal,
  purgeLedgerInternal,
} = vi.hoisted(() => ({
  getCurrentAdminStatus: vi.fn(),
  requireAdminUser: vi.fn(),
  addCreditsInternal: vi.fn(),
  removeCreditsInternal: vi.fn(),
  getAdminCreditTargetInternal: vi.fn(),
  getLedgerPurgePreviewInternal: vi.fn(),
  purgeLedgerInternal: vi.fn(),
}))

vi.mock('~stzUser/lib/server-auth', () => ({
  getCurrentAdminStatus,
  requireAdminUser,
}))

vi.mock('~stzUser/lib/admin-credit.logic', () => ({
  MAX_ADMIN_CREDIT_ADJUSTMENT: 10_000_000,
  MAX_ADMIN_DESCRIPTION_LENGTH: 500,
  MAX_USER_ID_LENGTH: 255,
  PURGE_LEDGER_CONFIRMATION: 'PURGE MY LEDGER',
  addCreditsInternal,
  removeCreditsInternal,
  getAdminCreditTargetInternal,
  getLedgerPurgePreviewInternal,
  purgeLedgerInternal,
}))

import {
  PURGE_LEDGER_CONFIRMATION,
  addCredits,
  lookupAdminCreditTarget,
  previewLedgerPurge,
  purgeLedger,
  removeCredits,
} from '~stzUser/lib/admin'

const adjustment = {
  userId: 'target-user',
  amount: 10,
  description: 'Support adjustment',
}

describe('admin credit server boundaries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireAdminUser.mockResolvedValue({
      id: 'admin-user',
      email: 'admin@example.com',
      role: 'admin',
    })
  })

  it('denies every credit administration operation before it reaches accounting', async () => {
    requireAdminUser.mockRejectedValue(new Error('Admin access required'))

    await expect(lookupAdminCreditTarget({
      data: { userId: adjustment.userId },
    })).rejects.toThrow(/Admin access required/)
    await expect(addCredits({ data: adjustment })).rejects.toThrow(/Admin access required/)
    await expect(removeCredits({ data: adjustment })).rejects.toThrow(/Admin access required/)
    await expect(previewLedgerPurge()).rejects.toThrow(/Admin access required/)
    await expect(purgeLedger({
      data: { confirmation: PURGE_LEDGER_CONFIRMATION },
    })).rejects.toThrow(/Admin access required/)

    expect(getAdminCreditTargetInternal).not.toHaveBeenCalled()
    expect(addCreditsInternal).not.toHaveBeenCalled()
    expect(removeCreditsInternal).not.toHaveBeenCalled()
    expect(getLedgerPurgePreviewInternal).not.toHaveBeenCalled()
    expect(purgeLedgerInternal).not.toHaveBeenCalled()
  })

  it('delegates valid calls and derives purge ownership from the authenticated admin', async () => {
    getAdminCreditTargetInternal.mockResolvedValue({
      id: adjustment.userId,
      name: 'Target',
      email: 'target@example.com',
      credits: 5,
    })
    addCreditsInternal.mockResolvedValue({ userId: adjustment.userId })
    removeCreditsInternal.mockResolvedValue({ userId: adjustment.userId })
    getLedgerPurgePreviewInternal.mockResolvedValue({
      totalRows: 2,
      stripePurchaseRows: 1,
    })
    purgeLedgerInternal.mockResolvedValue({
      userId: 'admin-user',
      deletedRows: 2,
      deletedStripePurchaseRows: 1,
      credits: 0,
    })

    await lookupAdminCreditTarget({ data: { userId: ' target-user ' } })
    await addCredits({ data: adjustment })
    await removeCredits({ data: adjustment })
    await previewLedgerPurge()
    await purgeLedger({ data: { confirmation: PURGE_LEDGER_CONFIRMATION } })

    expect(getAdminCreditTargetInternal).toHaveBeenCalledWith('target-user')
    expect(addCreditsInternal).toHaveBeenCalledWith(
      'target-user',
      10,
      'Support adjustment',
    )
    expect(removeCreditsInternal).toHaveBeenCalledWith(
      'target-user',
      10,
      'Support adjustment',
    )
    expect(getLedgerPurgePreviewInternal).toHaveBeenCalledWith('admin-user')
    expect(purgeLedgerInternal).toHaveBeenCalledWith('admin-user')
  })

  it.each([
    { ...adjustment, userId: '' },
    { ...adjustment, amount: NaN },
    { ...adjustment, amount: Infinity },
    { ...adjustment, amount: 0 },
    { ...adjustment, amount: -1 },
    { ...adjustment, amount: 1.5 },
    { ...adjustment, amount: 10_000_001 },
    { ...adjustment, description: '' },
    { ...adjustment, description: 'x'.repeat(501) },
  ])('rejects invalid adjustment input %# before auth or accounting', async (data) => {
    await expect(addCredits({ data })).rejects.toThrow()
    await expect(removeCredits({ data })).rejects.toThrow()
    expect(requireAdminUser).not.toHaveBeenCalled()
    expect(addCreditsInternal).not.toHaveBeenCalled()
    expect(removeCreditsInternal).not.toHaveBeenCalled()
  })

  it('requires the exact destructive confirmation and accepts no target ID', async () => {
    await expect(purgeLedger({
      data: { confirmation: 'yes' },
    })).rejects.toThrow()
    await expect(purgeLedger({
      data: {
        confirmation: PURGE_LEDGER_CONFIRMATION,
        userId: 'somebody-else',
      },
    } as any)).rejects.toThrow()

    expect(requireAdminUser).not.toHaveBeenCalled()
    expect(purgeLedgerInternal).not.toHaveBeenCalled()
  })
})
