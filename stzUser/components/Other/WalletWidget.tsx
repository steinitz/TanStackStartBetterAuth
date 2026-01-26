import React, { useEffect, useState } from 'react'
import { useSession } from '~stzUser/lib/auth-client'
import { getWalletStatus, type WalletStatus } from '~stzUser/lib/wallet.server'
import { WALLET_EVENTS } from '~stzUser/lib/wallet.client'

export function WalletWidget({ style = {} }) {
  const { data: session } = useSession()
  const [wallet, setWallet] = useState<WalletStatus | null>(null)

  useEffect(() => {
    const fetchWallet = () => {
      if (session?.user?.id) {
        getWalletStatus()
          .then(setWallet)
          .catch(err => console.error('Failed to fetch wallet status:', err))
      }
    }

    fetchWallet()

    if (typeof window !== 'undefined') {
      window.addEventListener(WALLET_EVENTS.UPDATED, fetchWallet)
      return () => {
        window.removeEventListener(WALLET_EVENTS.UPDATED, fetchWallet)
      }
    }
  }, [session?.user?.id])

  if (!wallet) return null

  return (
    <span
      title="My Balance"
      style={{
        padding: '0.2rem 0.6rem',
        borderRadius: '0.3rem',
        border: '1px solid var(--color-bg-secondary)',
        fontSize: '0.85rem',
        ...style
      }}
    >
      <i className="fa-solid fa-wallet" style={{ marginRight: '0.5rem', opacity: 0.7 }}></i>
      {wallet.credits} Credits
    </span>
  )
}
