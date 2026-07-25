// Client-safe credit-administration contracts. Keep database/auth imports out of this module:
// admin.ts is imported by browser Query helpers and uses these values to validate RPC payloads.
export const MAX_ADMIN_CREDIT_ADJUSTMENT = 10_000_000
export const MAX_ADMIN_DESCRIPTION_LENGTH = 500
export const MAX_USER_ID_LENGTH = 255
export const PURGE_LEDGER_CONFIRMATION = 'purge my ledger'

export type AdminCreditTarget = {
  id: string
  name: string
  email: string
  credits: number
}
