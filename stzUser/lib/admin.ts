import { createServerFn } from '@tanstack/react-start'
import * as v from 'valibot'
import {
  MAX_ADMIN_CREDIT_ADJUSTMENT,
  MAX_ADMIN_DESCRIPTION_LENGTH,
  MAX_USER_ID_LENGTH,
  PURGE_LEDGER_CONFIRMATION,
} from './admin-credit'

const AdminTargetSchema = v.strictObject({
  userId: v.pipe(
    v.string('User ID must be a string'),
    v.trim(),
    v.nonEmpty('User ID is required'),
    v.maxLength(MAX_USER_ID_LENGTH, 'User ID is too long'),
  ),
})

const CreditAmountSchema = v.pipe(
  v.number('Credit amount must be a number'),
  v.finite('Credit amount must be finite'),
  v.integer('Credit amount must be a whole number'),
  v.minValue(1, 'Credit amount must be positive'),
  v.maxValue(
    MAX_ADMIN_CREDIT_ADJUSTMENT,
    `Credit amount must be no greater than ${MAX_ADMIN_CREDIT_ADJUSTMENT}`,
  ),
)

const CreditDescriptionSchema = v.pipe(
  v.string('Description must be a string'),
  v.trim(),
  v.nonEmpty('Description is required'),
  v.maxLength(MAX_ADMIN_DESCRIPTION_LENGTH, 'Description is too long'),
)

export const AdminCreditAdjustmentSchema = v.strictObject({
  userId: AdminTargetSchema.entries.userId,
  amount: CreditAmountSchema,
  description: CreditDescriptionSchema,
})

export const PurgeLedgerSchema = v.strictObject({
  confirmation: v.literal(
    PURGE_LEDGER_CONFIRMATION,
    `Type ${PURGE_LEDGER_CONFIRMATION} to confirm`,
  ),
})

export const getAdminStatus = createServerFn({ method: 'GET' })
  .handler(async () => {
    const { getCurrentAdminStatus } = await import('./server-auth')
    return getCurrentAdminStatus()
  })

export const lookupAdminCreditTarget = createServerFn({ method: 'GET' })
  .inputValidator((data: unknown) => v.parse(AdminTargetSchema, data))
  .handler(async ({ data }) => {
    const { requireAdminUser } = await import('./server-auth')
    const { getAdminCreditTargetInternal } = await import('./admin-credit.logic')
    await requireAdminUser()
    return getAdminCreditTargetInternal(data.userId)
  })

export const addCredits = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => v.parse(AdminCreditAdjustmentSchema, data))
  .handler(async ({ data }) => {
    const { requireAdminUser } = await import('./server-auth')
    const { addCreditsInternal } = await import('./admin-credit.logic')
    await requireAdminUser()
    return addCreditsInternal(data.userId, data.amount, data.description)
  })

export const removeCredits = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => v.parse(AdminCreditAdjustmentSchema, data))
  .handler(async ({ data }) => {
    const { requireAdminUser } = await import('./server-auth')
    const { removeCreditsInternal } = await import('./admin-credit.logic')
    await requireAdminUser()
    return removeCreditsInternal(data.userId, data.amount, data.description)
  })

export const previewLedgerPurge = createServerFn({ method: 'GET' })
  .handler(async () => {
    const { requireAdminUser } = await import('./server-auth')
    const { getLedgerPurgePreviewInternal } = await import('./admin-credit.logic')
    const adminUser = await requireAdminUser()
    return getLedgerPurgePreviewInternal(adminUser.id)
  })

export const purgeLedger = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => v.parse(PurgeLedgerSchema, data))
  .handler(async () => {
    const { requireAdminUser } = await import('./server-auth')
    const { purgeLedgerInternal } = await import('./admin-credit.logic')
    const adminUser = await requireAdminUser()
    return purgeLedgerInternal(adminUser.id)
  })

export { PURGE_LEDGER_CONFIRMATION }
