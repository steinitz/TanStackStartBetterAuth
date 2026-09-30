// Client-safe wallet contracts. Keep database, auth, mail, and other server implementation
// imports out of this file: wallet.ts is imported by browser-rendered header and account UI.
export const MAX_RESOURCE_CONSUMPTION = 1_000_000
export const MAX_RESOURCE_TYPE_LENGTH = 100

/**
 * How a refused call's error message begins. A refusal is not a failure: the event costs more
 * than she has, which may be more than nothing — 5 left for something priced 8.
 *
 * Here rather than beside the charge that throws it, because the callers are browser components:
 * importing them into the same module as the middleware would ask the compiler to strip a server
 * half it has no reason to look at.
 */
export const NOT_ENOUGH_CREDITS = 'Not enough credits'

/**
 * Whether an error is the charge refusing her for want of credits, so a caller can say so in its
 * own words rather than call it a failure. Every caller asks this one question, so the marker can
 * change in one place.
 */
export function isNotEnoughCredits(error: unknown): boolean {
  const message =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message: unknown }).message)
      : String(error)
  return message.includes(NOT_ENOUGH_CREDITS)
}

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
