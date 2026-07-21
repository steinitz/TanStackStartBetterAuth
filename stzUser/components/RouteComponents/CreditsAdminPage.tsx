import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import {
  PURGE_LEDGER_CONFIRMATION,
  addCredits,
  purgeLedger,
  removeCredits,
} from '~stzUser/lib/admin'
import {
  adminCreditKeys,
  adminCreditTargetQueryOptions,
  applyLedgerPurgeResultToQueries,
  ledgerPurgePreviewQueryOptions,
  refreshAdminCreditTarget,
  useAdminStatus,
} from '~stzUser/lib/admin-queries'
import { useSession } from '~stzUser/lib/auth-client'
import { refreshWalletQueries } from '~stzUser/lib/wallet-queries'

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'The operation failed'
}

function mutationFeedback(
  mutation: {
    isError: boolean
    error: unknown
    isSuccess: boolean
    data?: { oldBalance: number; newBalance: number }
  },
  successLabel: string,
) {
  if (mutation.isError) {
    return <p role="alert">{errorMessage(mutation.error)}</p>
  }
  if (mutation.isSuccess && mutation.data) {
    return (
      <p role="status">
        {successLabel}: {mutation.data.oldBalance} → {mutation.data.newBalance} credits.
      </p>
    )
  }
  return null
}

export function CreditsAdminPage() {
  const { data: session } = useSession()
  const adminStatus = useAdminStatus()
  const queryClient = useQueryClient()
  const [enteredUserId, setEnteredUserId] = useState('')
  const [confirmedUserId, setConfirmedUserId] = useState<string>()
  const [addAmount, setAddAmount] = useState('10')
  const [addDescription, setAddDescription] = useState('Manual bank transfer')
  const [removeAmount, setRemoveAmount] = useState('1')
  const [removeDescription, setRemoveDescription] = useState('Manual credit removal')
  const [purgeConfirmation, setPurgeConfirmation] = useState('')

  const targetQuery = useQuery(adminCreditTargetQueryOptions(confirmedUserId))
  const previewQuery = useQuery(ledgerPurgePreviewQueryOptions(
    session?.user?.id,
    Boolean(adminStatus.data?.isAdmin),
  ))

  const lookupMutation = useMutation({
    mutationFn: async (userId: string) => queryClient.fetchQuery({
      ...adminCreditTargetQueryOptions(userId),
      // Every deliberate confirmation rechecks the server, even if this ID was looked up before.
      staleTime: 0,
    }),
  })
  const addMutation = useMutation({
    mutationFn: (data: { userId: string; amount: number; description: string }) =>
      addCredits({ data }),
  })
  const removeMutation = useMutation({
    mutationFn: (data: { userId: string; amount: number; description: string }) =>
      removeCredits({ data }),
  })
  const purgeMutation = useMutation({
    mutationFn: (confirmation: string) =>
      purgeLedger({ data: { confirmation } }),
  })

  const handleTargetIdChange = (value: string) => {
    setEnteredUserId(value)
    setConfirmedUserId(undefined)
    lookupMutation.reset()
    addMutation.reset()
    removeMutation.reset()
  }

  const handleLookup = async (event: FormEvent) => {
    event.preventDefault()
    const userId = enteredUserId.trim()
    setConfirmedUserId(undefined)

    try {
      const target = await lookupMutation.mutateAsync(userId)
      setConfirmedUserId(target.id)
    } catch {
      // Mutation state renders the server's validation, authorization, or not-found message.
    }
  }

  const refreshAfterAdjustment = async (userId: string) => {
    if (userId === session?.user?.id) {
      await refreshWalletQueries(queryClient, userId)
    }
    // Refresh this after the current-user wallet family: a normal wallet read may legitimately
    // apply a daily grant, and the exact target should show that final cached balance.
    await refreshAdminCreditTarget(queryClient, userId)
  }

  const handleAddCredits = async (event: FormEvent) => {
    event.preventDefault()
    const target = targetQuery.data
    if (!target) return

    try {
      await addMutation.mutateAsync({
        userId: target.id,
        amount: Number(addAmount),
        description: addDescription,
      })
      await refreshAfterAdjustment(target.id)
    } catch {
      // Mutation state owns the inline error.
    }
  }

  const handleRemoveCredits = async (event: FormEvent) => {
    event.preventDefault()
    const target = targetQuery.data
    if (!target) return

    try {
      await removeMutation.mutateAsync({
        userId: target.id,
        amount: Number(removeAmount),
        description: removeDescription,
      })
      await refreshAfterAdjustment(target.id)
    } catch {
      // Mutation state owns the inline error.
    }
  }

  const handlePurgeLedger = async (event: FormEvent) => {
    event.preventDefault()

    try {
      const result = await purgeMutation.mutateAsync(purgeConfirmation)
      await applyLedgerPurgeResultToQueries(queryClient, result)
      await queryClient.invalidateQueries({
        queryKey: adminCreditKeys.purgePreview(result.userId),
      })
      setPurgeConfirmation('')
    } catch {
      // Mutation state owns the inline error.
    }
  }

  if (session === undefined || (session?.user && adminStatus.isPending)) {
    return <p>Loading Admin access…</p>
  }

  if (!session?.user || !adminStatus.data?.isAdmin) {
    return (
      <main>
        <h1>Access denied</h1>
        <p>You must be an effective administrator to use credit administration.</p>
        <a href="/">Return to home</a>
      </main>
    )
  }

  const target = targetQuery.data
  const adminSource = adminStatus.data.source === 'environment'
    ? 'environment configuration'
    : adminStatus.data.source === 'both'
      ? 'stored role and environment configuration'
      : 'stored role'
  const totalRows = previewQuery.data?.totalRows ?? '…'
  const stripeRows = previewQuery.data?.stripePurchaseRows ?? '…'

  return (
    <main style={{ width: 'min(100%, 70rem)', margin: '0 auto' }}>
      <h1>Credit administration</h1>
      <p>
        Signed in as <strong>{session.user.email}</strong>, effective admin via {adminSource}.
      </p>
      <p><a href="/auth/users">View Users</a></p>

      <section aria-labelledby="target-credit-actions">
        <h2 id="target-credit-actions">User credit actions</h2>
        <p>Paste the exact user ID and confirm the account before changing its credits.</p>

        <form onSubmit={handleLookup}>
          <label htmlFor="admin-target-user-id">Exact user ID</label>
          <input
            id="admin-target-user-id"
            name="userId"
            value={enteredUserId}
            onChange={(event) => handleTargetIdChange(event.target.value)}
            autoComplete="off"
          />
          <button type="submit" disabled={lookupMutation.isPending}>
            {lookupMutation.isPending ? 'Looking up…' : 'Look up user'}
          </button>
        </form>

        {lookupMutation.isError ? (
          <p role="alert">{errorMessage(lookupMutation.error)}</p>
        ) : null}

        {target ? (
          <article aria-label="Confirmed credit target">
            <h3>Confirmed target</h3>
            <p><strong>{target.name}</strong> — {target.email}</p>
            <p>User ID: <code>{target.id}</code></p>
            <p>Cached balance: <strong>{target.credits} credits</strong></p>
          </article>
        ) : (
          <p>No target confirmed. Add and remove actions are disabled.</p>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', alignItems: 'flex-start' }}>
          <form onSubmit={handleAddCredits} style={{ flex: '1 1 18rem' }}>
            <h3>Add credits</h3>
            <label htmlFor="admin-add-amount">Amount</label>
            <input
              id="admin-add-amount"
              type="number"
              min="1"
              step="1"
              value={addAmount}
              onChange={(event) => setAddAmount(event.target.value)}
            />
            <label htmlFor="admin-add-description">Description</label>
            <input
              id="admin-add-description"
              value={addDescription}
              onChange={(event) => setAddDescription(event.target.value)}
            />
            <button type="submit" disabled={!target || addMutation.isPending}>
              {addMutation.isPending ? 'Adding…' : 'Add credits'}
            </button>
            {mutationFeedback(addMutation, 'Credits added')}
          </form>

          <form onSubmit={handleRemoveCredits} style={{ flex: '1 1 18rem' }}>
            <h3>Remove credits</h3>
            <label htmlFor="admin-remove-amount">Amount</label>
            <input
              id="admin-remove-amount"
              type="number"
              min="1"
              step="1"
              value={removeAmount}
              onChange={(event) => setRemoveAmount(event.target.value)}
            />
            <label htmlFor="admin-remove-description">Description</label>
            <input
              id="admin-remove-description"
              value={removeDescription}
              onChange={(event) => setRemoveDescription(event.target.value)}
            />
            <button type="submit" disabled={!target || removeMutation.isPending}>
              {removeMutation.isPending ? 'Removing…' : 'Remove credits'}
            </button>
            {mutationFeedback(removeMutation, 'Credits removed')}
          </form>
        </div>
      </section>

      <section
        aria-labelledby="development-ledger-purge"
        style={{ border: '0.2rem solid var(--color-link)', padding: '1.5rem' }}
      >
        <h2 id="development-ledger-purge">Development ledger purge</h2>
        <p>
          This permanent, self-only tool deletes your entire development ledger and sets your
          cached balance to zero. It is not an accounting correction.
        </p>
        <p>
          Purge all <strong>{totalRows}</strong> ledger rows? This includes{' '}
          <strong>{stripeRows} Stripe purchase rows</strong>. Purging permanently removes the
          record that those payments were received and the PaymentIntent identifiers used to
          recognize a repeated delivery. A later Stripe retry or manual webhook resend may add
          those credits again.
        </p>
        {previewQuery.isError ? (
          <p role="alert">The current row counts could not be loaded. The purge remains self-only.</p>
        ) : null}
        <form onSubmit={handlePurgeLedger}>
          <label htmlFor="purge-ledger-confirmation">
            Type <code>{PURGE_LEDGER_CONFIRMATION}</code> to confirm
          </label>
          <input
            id="purge-ledger-confirmation"
            value={purgeConfirmation}
            onChange={(event) => setPurgeConfirmation(event.target.value)}
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={
              purgeConfirmation !== PURGE_LEDGER_CONFIRMATION ||
              purgeMutation.isPending
            }
          >
            {purgeMutation.isPending ? 'Purging…' : 'Purge ledger'}
          </button>
        </form>
        {purgeMutation.isError ? (
          <p role="alert">{errorMessage(purgeMutation.error)}</p>
        ) : null}
        {purgeMutation.isSuccess ? (
          <p role="status">
            Purged {purgeMutation.data.deletedRows} ledger rows, including{' '}
            {purgeMutation.data.deletedStripePurchaseRows} Stripe purchase rows. Cached balance is
            zero.
          </p>
        ) : null}
      </section>
    </main>
  )
}
