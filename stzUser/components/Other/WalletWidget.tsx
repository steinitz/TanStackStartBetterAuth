import React, { useEffect, useState } from 'react'
import { useSession } from '~stzUser/lib/auth-client'
import { getWalletStatus, type WalletStatus } from '~stzUser/lib/wallet.server'

export function WalletWidget({ style = {} }) {
  const { data: session } = useSession()
  const [wallet, setWallet] = useState<WalletStatus | null>(null)

  useEffect(() => {
    if (session?.user?.id) {
      getWalletStatus()
        .then(setWallet)
        .catch(err => console.error('Failed to fetch wallet status:', err))
    }
  }, [session?.user?.id])

  if (!wallet) return null

  return (
    <span style={{
      opacity: 0.8,
      ...style
    }}>
      Actions: {wallet.usageToday}/{wallet.allowance} | Credits: {wallet.credits}
    </span>
  )
}
