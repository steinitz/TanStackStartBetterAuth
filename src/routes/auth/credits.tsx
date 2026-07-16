import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useSession } from '~stzUser/lib/auth-client'
import { claimWelcomeGrant, requestBankTransfer } from '~stzUser/lib/wallet'
import { useTransactions, useWallet } from '~stzUser/lib/wallet-queries'
import { clientEnv } from '~stzUser/lib/env'
import { useState } from 'react'
import { Spacer } from '~stzUtils/components/Spacer'
import { Dialog, makeDialogRef } from '~stzUtils/components/Dialog'
import { PaymentForm, StripeReturnHandler } from '~stzUser/components/stripe/PaymentForm'
import { useGoBack } from '~stzUser/lib/useGoBack'
import { creditsStrings } from '~stzUser/components/RouteComponents/Credits'
import { TransactionLedger } from '~stzUser/components/RouteComponents/TransactionLedger'

// Stripe appends these to the return_url after an SCA/redirect payment. Parsed here so the return
// path is router-idiomatic (no window.location reads → no SSR/hydration mismatch).
type CreditsSearch = {
  stripe_return?: '1'
  payment_intent_client_secret?: string
  redirect_status?: string
}

function TransactionsPage() {
  const { data: session } = useSession()
  const { wallet: walletStatus, refreshWallet } = useWallet()
  const {
    transactions,
    isPending: areTransactionsPending,
    isError: areTransactionsError,
  } = useTransactions()
  const [purchaseAmount, setPurchaseAmount] = useState<number | ''>(clientEnv.DEFAULT_CREDITS_PURCHASE)
  const [isRequesting, setIsRequesting] = useState(false)

  const navigate = useNavigate()
  const goBack = useGoBack()
  const search = Route.useSearch()
  // Capture the SCA-return intent once, at first render, so clearing the URL params later (below)
  // does not unmount the return handler mid-poll.
  const [stripeReturn] = useState(() => ({
    isReturn: search.stripe_return === '1',
    clientSecret: search.payment_intent_client_secret,
  }))

  const bankDetailsRef = makeDialogRef()

  const handleClaimGrant = async () => {
    try {
      const result = await claimWelcomeGrant()
      if (result.success) {
        await refreshWallet()
        alert(creditsStrings.welcomeGrantClaimedAlert)
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
      const result = await requestBankTransfer({ data: { amount: Number(purchaseAmount) } })
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
      <div style={{ padding: '4rem 2rem', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
        <p style={{ marginBottom: '1.5rem' }}>
          Please sign in to add credits and view your transaction history.
        </p>
        <Link to="/">Back to Home</Link>
      </div>
    )
  }

  const showBankSection = !clientEnv.IS_STRIPE_ENABLED && clientEnv.BANK_TRANSFER_BSB && clientEnv.BANK_TRANSFER_ACC
  const totalCost = (Number(purchaseAmount || 0) * clientEnv.CREDIT_PRICE_AUD).toFixed(2)

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      <h1>Credits</h1>

      <section style={{
        border: '1px solid var(--color-bg-secondary)',
        padding: '2rem',
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '0rem',
        width: '100%',
      }}>
        <h2 style={{ marginTop: '0', marginBottom: '3rem', textAlign: 'center' }}>Top Up Credits</h2>

        {/* Payment Section */}
        <div style={{ textAlign: 'left' }}>
          {clientEnv.IS_STRIPE_ENABLED ? (
            stripeReturn.isReturn ? (
              <StripeReturnHandler
                clientSecret={stripeReturn.clientSecret}
                onCreditsGranted={refreshWallet}
                onHandled={() => navigate({ to: '/auth/credits', search: {}, replace: true })}
              />
            ) : (
              <PaymentForm onCreditsGranted={refreshWallet} />
            )
          ) : showBankSection ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <p style={{ margin: 0 }}>
                Purchase credits via manual bank transfer (AUD${clientEnv.CREDIT_PRICE_AUD.toFixed(3)} per credit).
              </p>

              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '1.5rem',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', margin: 0, lineHeight: 'normal' }}>
                    Credits:
                    <input
                      type="number"
                      min={clientEnv.MIN_CREDITS_PURCHASE}
                      value={purchaseAmount}
                      onChange={(e) => {
                        const val = e.target.value
                        setPurchaseAmount(val === '' ? '' : Number(val))
                      }}
                      style={{
                        width: '6rem',
                        minWidth: '0',
                        padding: '0.4rem 0.6rem',
                        margin: 0
                      }}
                    />
                  </label>

                  <span>
                    Total Cost: AUD${totalCost}
                  </span>
                </div>

                <button
                  onClick={handleRequestPurchase}
                  disabled={isRequesting || !purchaseAmount || purchaseAmount < clientEnv.MIN_CREDITS_PURCHASE}
                >
                  {isRequesting ? creditsStrings.requesting : creditsStrings.payViaBankTransfer}
                </button>
              </div>
            </div>
          ) : (
            <p>Credit purchasing is currently unavailable.</p>
          )}
        </div>

        <Spacer />
        <hr style={{ width: '100%', margin: 0, opacity: 0.1, border: 'none', borderTop: '1px solid var(--color-text)' }} />
        <Spacer />

        {/* Welcome Grant Section */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1.5rem',
          flexWrap: 'wrap',
          textAlign: 'left'
        }}>
          <p style={{
            margin: 0,
            flex: '1 1 300px',
            opacity: walletStatus?.welcomeClaimed ? 0.5 : 1
          }}>
            New here? Get started with <strong>{clientEnv.WELCOME_GRANT_CREDITS} free credits</strong>:
          </p>
          <button
            onClick={handleClaimGrant}
            disabled={walletStatus?.welcomeClaimed || isRequesting}
            style={{
              minWidth: '180px',
              opacity: walletStatus?.welcomeClaimed ? 0.5 : 1,
              cursor: walletStatus?.welcomeClaimed ? 'not-allowed' : 'pointer'
            }}
          >
            {walletStatus?.welcomeClaimed ? creditsStrings.welcomeGrantClaimed : creditsStrings.claimWelcomeGrant}
          </button>
        </div>

        <p style={{ marginTop: '1rem' }}>
          You{walletStatus?.welcomeClaimed ? '' : "'ll also"} receive an automatic <strong>{clientEnv.DAILY_GRANT_CREDITS} credit top-up</strong> on your first visit or action each day.
        </p>
      </section>

      <Spacer orientation="vertical" />

      <div style={{ marginTop: '2rem' }}>
        <h3>History Ledger</h3>
        <p>A complete ledger of your credit grants and consumption.</p>
        <TransactionLedger
          transactions={transactions}
          isPending={areTransactionsPending}
          isError={areTransactionsError}
        />
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
      {/* Exit the credits flow: back to where they came from if in-app, else Home (useGoBack). Handy
          after scrolling a long ledger. Imperative onClick, so it's an <a> not a declarative <Link>. */}
      <a onClick={goBack} style={{ cursor: 'pointer' }}>Exit</a>
    </div>
  )
}

export const Route = createFileRoute('/auth/credits')({
  component: TransactionsPage,
  validateSearch: (search: Record<string, unknown>): CreditsSearch => ({
    stripe_return: search.stripe_return === '1' ? '1' : undefined,
    payment_intent_client_secret:
      typeof search.payment_intent_client_secret === 'string' ? search.payment_intent_client_secret : undefined,
    redirect_status: typeof search.redirect_status === 'string' ? search.redirect_status : undefined,
  }),
})
