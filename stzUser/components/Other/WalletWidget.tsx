import { useNavigate } from '@tanstack/react-router'
import { useWallet } from '~stzUser/lib/wallet-queries'

export function WalletWidget({ style = {} }) {
  const { wallet } = useWallet()
  const navigate = useNavigate()

  if (!wallet) return null

  return (
    <span
      title="View Transaction History"
      onClick={() => navigate({ to: '/auth/credits' })}
      style={{
        padding: '0.2rem 0.6rem',
        border: '1px solid var(--color-bg-secondary)',
        borderRadius: '0.3rem', // Add a tiny rounding
        fontSize: '0.85rem',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        ...style
      }}
    >
      <i className="fa-solid fa-wallet" style={{ marginRight: '0.5rem', opacity: 0.7 }}></i>
      {wallet.credits} Credits
    </span>
  )
}
