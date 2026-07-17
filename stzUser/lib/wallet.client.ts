/**
 * Client-side events for wallet-related UI which is not server state.
 */

export const WALLET_EVENTS = {
  INSUFFICIENT_CREDITS: 'stz-event-insufficient-credits',
} as const

/**
 * Dispatches an event indicating the user has insufficient credits for an action.
 */
export const notifyInsufficientCredits = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(WALLET_EVENTS.INSUFFICIENT_CREDITS))
  }
}
