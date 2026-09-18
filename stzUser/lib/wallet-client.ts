/**
 * Client-side events for wallet-related UI which is not server state.
 */

export const WALLET_EVENTS = {
  INSUFFICIENT_CREDITS: 'stz-event-insufficient-credits',
  BALANCE: 'stz-event-wallet-balance',
} as const

/** A balance a charged server call brought home, and whose it is. */
export type AnnouncedBalance = { userId: string; credits: number }

/**
 * Dispatches an event indicating the user has insufficient credits for an action.
 */
export const notifyInsufficientCredits = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(WALLET_EVENTS.INSUFFICIENT_CREDITS))
  }
}

/**
 * Dispatches the balance a charged server call brought home, so the wallet display can keep up
 * without asking the server again. See server-call-charge.ts.
 */
export const announceWalletBalance = (balance: AnnouncedBalance) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<AnnouncedBalance>(WALLET_EVENTS.BALANCE, { detail: balance }))
  }
}
