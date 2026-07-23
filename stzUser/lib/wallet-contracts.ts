// Client-safe wallet contracts. Keep database, auth, mail, and other server implementation
// imports out of this file: wallet.ts is imported by browser-rendered header and account UI.
export const MAX_RESOURCE_CONSUMPTION = 1_000_000
export const MAX_RESOURCE_TYPE_LENGTH = 100

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
