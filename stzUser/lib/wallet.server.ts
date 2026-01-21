import { createServerFn } from '@tanstack/react-start'
import { getWebRequest } from '@tanstack/react-start/server'
import { auth } from './auth'

export type WalletStatus = {
  allowance: number
  credits: number
  usageToday: number
}

export const getWalletStatus = createServerFn({
  method: 'GET',
}).handler(async () => {
  const request = getWebRequest()
  const headers = request?.headers

  if (!headers) {
    throw new Error('Not authenticated')
  }

  const session = await auth.api.getSession({ headers })

  if (!session) {
    throw new Error('Not authenticated')
  }

  // Mock data for Step 2
  return {
    allowance: 3,
    credits: 100,
    usageToday: 1,
  } as WalletStatus
})
