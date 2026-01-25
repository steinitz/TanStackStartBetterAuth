import { createServerFn } from '@tanstack/react-start'
import { getWebRequest } from '@tanstack/react-start/server'
import { auth } from './auth'
import { getWalletStatusInternal, consumeResourceInternal, grantCreditsInternal, type WalletStatus } from './wallet.logic'

export type { WalletStatus }

/**
 * Server function to get the current user's wallet status.
 */
export const getWalletStatus = createServerFn({
  method: 'GET',
}).handler(async () => {
  const request = getWebRequest()
  const headers = request?.headers
  if (!headers) throw new Error('Not authenticated')

  const session = await auth.api.getSession({ headers })
  if (!session?.user) throw new Error('Not authenticated')

  return getWalletStatusInternal(session.user.id)
})

/**
 * Server function to consume a resource for the current user.
 */
export const useConsumeResource = createServerFn({
  method: 'POST',
})
  .validator((data: { resourceType: string; amount?: number }) => data)
  .handler(async ({ data }) => {
    const request = getWebRequest()
    const headers = request?.headers
    if (!headers) throw new Error('Not authenticated')

    const session = await auth.api.getSession({ headers })
    if (!session?.user) throw new Error('Not authenticated')

    return consumeResourceInternal(session.user.id, data.resourceType, data.amount ?? 1)
  })

/**
 * Server function to grant credits to a user (e.g., for testing).
 */
export const useGrantCredits = createServerFn({
  method: 'POST',
})
  .validator((data: { amount: number; type?: 'manual_adjustment' | 'purchase'; description: string }) => data)
  .handler(async ({ data }) => {
    const request = getWebRequest()
    const headers = request?.headers
    if (!headers) throw new Error('Not authenticated')

    const session = await auth.api.getSession({ headers })
    if (!session?.user) throw new Error('Not authenticated')

    return grantCreditsInternal(
      session.user.id,
      data.amount,
      data.type || 'manual_adjustment',
      data.description
    )
  })
