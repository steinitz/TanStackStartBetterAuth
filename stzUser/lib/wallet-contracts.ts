// Client-safe wallet contracts. Keep database, auth, mail, and other server implementation
// imports out of this file: wallet.ts is imported by browser-rendered header and account UI.
export const MAX_RESOURCE_CONSUMPTION = 1_000_000
export const MAX_RESOURCE_TYPE_LENGTH = 100

/**
 * How a refused call's error message begins, so a caller can tell "out of credits" from a
 * genuine failure and say so in its own words.
 *
 * Here rather than beside the charge that throws it, because the callers are browser components:
 * importing them into the same module as the middleware would ask the compiler to strip a server
 * half it has no reason to look at.
 */
export const OUT_OF_CREDITS = 'Out of credits'

export type WalletStatus = {
  credits: number
  welcomeClaimed: boolean
}

export type WalletTransaction = {
  id: string
  user_id: string
  amount: number
  type: 'daily_grant' | 'consumption' | 'purchase' | 'manual_adjustment'
  description: string
  created_at: string
  stripe_payment_intent_id: string | null | undefined
}
