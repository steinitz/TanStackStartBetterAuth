import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useSession } from '~stzUser/lib/auth-client'
import { getTransactions, claimWelcomeGrant, requestBankTransfer } from '~stzUser/lib/wallet.server'
import { clientEnv } from '~stzUser/lib/env'
import { useEffect, useState } from 'react'
import { Spacer } from '~stzUtils/components/Spacer'
import { Dialog, makeDialogRef } from '~stzUtils/components/Dialog'

function TransactionsPage() {
  const { data: session } = useSession()
  const [transactions, setTransactions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [purchaseAmount, setPurchaseAmount] = useState(clientEnv.MIN_CREDITS_PURCHASE)
  const [isRequesting, setIsRequesting] = useState(false)

  const navigate = useNavigate()

  const bankDetailsRef = makeDialogRef()

  useEffect(() => {
    const fetchHistory = async () => {
      if (!session?.user) return
      try {
        const data = await getTransactions()
        setTransactions(data || [])
      } catch (err) {
        console.error('Failed to fetch transactions:', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchHistory()
  }, [session?.user?.id])

  const handleClaimGrant = async () => {
    try {
      const result = await claimWelcomeGrant()
      if (result.success) {
        alert('Welcome grant claimed! 🎁')
        window.location.reload()
      } else if ('message' in result) {
        alert(result.message)
      }
    } catch (err) {
      alert('Failed to claim grant.')
    }
  }

  const handleRequestPurchase = async () => {
    setIsRequesting(true)
    try {
      const result = await requestBankTransfer({ data: { amount: purchaseAmount } })
      if (result.success) {
        bankDetailsRef.current?.setIsOpen(true)
      }
    } catch (err: any) {
      alert(err.message || 'Failed to request purchase.')
    } finally {
      setIsRequesting(false)
    }
  }

  if (!session?.user) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>Access Denied</h1>
        <p>Please sign in to view your transaction history.</p>
        <Link to="/">Home</Link>
      </div>
    )
  }

  const showBankSection = !clientEnv.IS_STRIPE_ENABLED && clientEnv.BANK_TRANSFER_BSB && clientEnv.BANK_TRANSFER_ACC
  const totalCost = (purchaseAmount * clientEnv.CREDIT_PRICE_AUD).toFixed(2)

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      <h1>Credits</h1>

      <section style={{
        border: '1px solid var(--color-bg-secondary)',
        padding: '1.5rem',
        borderRadius: '8px',
        backgroundColor: 'var(--color-bg-alt)',
        textAlign: 'left' // Overall left align for the container
      }}>
        <h2 style={{ marginBottom: '1rem', textAlign: 'center' }}>Top Up Credits</h2>
        <Spacer space={0.5} />
        {clientEnv.IS_STRIPE_ENABLED ? (
          <p>Stripe integration is coming soon</p>
        ) : showBankSection ? (
          <div>
            <p>Purchase credits via manual bank transfer ($ {clientEnv.CREDIT_PRICE_AUD.toFixed(2)} per credit).</p>
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '1.2rem', 
              marginTop: '1.5rem', 
              alignItems: 'flex-start' 
            }}>
              <div style={{ 
                display: 'flex', 
                gap: '1.5rem', 
                alignItems: 'center', 
                flexWrap: 'wrap' 
              }}>
                <label style={{ display: 'flex', alignItems: 'center', margin: 0, gap: '0.5rem' }}>
                  Credits:
                  <input
                    type="number"
                    min={clientEnv.MIN_CREDITS_PURCHASE}
                    value={purchaseAmount}
                    onChange={(e) => setPurchaseAmount(Number(e.target.value))}
                    style={{ width: '60px', padding: '0.3rem' }}
                  />
                </label>
                <div style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>
                  Total Cost: <strong style={{ marginLeft: '0.5rem' }}>${totalCost} AUD</strong>
                </div>
              </div>
              <button
                onClick={handleRequestPurchase}
                disabled={isRequesting || purchaseAmount < clientEnv.MIN_CREDITS_PURCHASE}
                style={{ whiteSpace: 'nowrap', padding: '0.5rem 1rem' }}
              >
                {isRequesting ? 'Requesting...' : 'Pay via Bank Transfer'}
              </button>
            </div>
          </div>
        ) : (
          <p>Credit purchasing is currently unavailable.</p>
        )}

        <hr style={{ margin: '1.5rem 0', opacity: 0.2 }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
          <p style={{ margin: 0 }}>New here? Get started with ten free credits:</p>
          <button 
            onClick={handleClaimGrant}
            style={{ whiteSpace: 'nowrap', padding: '0.5rem 1rem' }}
          >
            Claim Welcome Grant
          </button>
        </div>
      </section>

      <Spacer orientation="vertical" />

      <div style={{ marginTop: '2rem' }}>
        <h3>History Ledger</h3>
        <p>A complete ledger of your credit grants and consumption.</p>
        {isLoading ? (
          <p>Loading transactions...</p>
        ) : transactions.length === 0 ? (
          <p>No transactions found.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-bg-secondary)' }}>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Date</th>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Type</th>
                <th style={{ textAlign: 'right', padding: '0.5rem' }}>Amount</th>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Description</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id} style={{ borderBottom: '1px solid var(--color-bg-secondary)' }}>
                  <td style={{ padding: '0.5rem', fontSize: '0.85rem' }}>
                    {new Date(t.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '0.5rem', fontSize: '0.85rem', textTransform: 'capitalize' }}>
                    {t.type.replace('_', ' ')}
                  </td>
                  <td style={{
                    padding: '0.5rem',
                    textAlign: 'right',
                    fontWeight: 'bold',
                    color: t.amount > 0 ? 'green' : 'inherit'
                  }}>
                    {t.amount > 0 ? `+${t.amount}` : t.amount}
                  </td>
                  <td style={{ padding: '0.5rem', fontSize: '0.85rem' }}>{t.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog ref={bankDetailsRef}>
        <h2>Bank Transfer Instructions</h2>
        <p>Please transfer <strong>${totalCost} AUD</strong> to the following account:</p>
        <div style={{
          backgroundColor: 'var(--color-bg-secondary)',
          padding: '1rem',
          borderRadius: '4px',
          fontFamily: 'monospace'
        }}>
          <p><strong>BSB:</strong> {clientEnv.BANK_TRANSFER_BSB}</p>
          <p><strong>Account:</strong> {clientEnv.BANK_TRANSFER_ACC}</p>
          <p><strong>Reference:</strong> {(session.user.name && session.user.name.length >= 5) ? session.user.name : session.user.email}</p>
        </div>
        <p style={{ marginTop: '1rem' }}>
          We have been notified of your request and will credit your account as soon as the funds arrive.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
          <button onClick={() => bankDetailsRef.current?.setIsOpen(false)}>Got it</button>
        </div>
      </Dialog>

      <Spacer orientation="vertical" />
      <Link to="/">Back to Home</Link>
    </div>
  )
}

export const Route = createFileRoute('/auth/credits')({
  component: TransactionsPage,
})
