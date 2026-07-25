import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from 'react'
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

const adminPageStyle: CSSProperties = {
  boxSizing: 'border-box',
  margin: '0 auto',
  padding: '0.5rem 1.5rem 3rem',
  width: 'min(100%, 70rem)',
}

const adminSectionStyle: CSSProperties = {
  boxSizing: 'border-box',
  display: 'block',
  padding: '1rem 0',
  width: '100%',
}

const formCardStyle: CSSProperties = {
  boxSizing: 'border-box',
  margin: '1rem 0',
  maxWidth: 'none',
  minWidth: 0,
  width: '100%',
}

const adminColumnStyle: CSSProperties = {
  flex: '1 1 18rem',
  minWidth: 0,
}

const columnFormStyle: CSSProperties = {
  ...formCardStyle,
  ...adminColumnStyle,
  margin: 0,
}

const formFeedbackStyle: CSSProperties = {
  lineHeight: 1.4,
  margin: '0.65rem 0 0',
}

function AdminTwoColumnRow({
  children,
  marginTop = '1.5rem',
}: {
  children: ReactNode
  marginTop?: CSSProperties['marginTop']
}) {
  return (
    <div
      style={{
        alignItems: 'flex-start',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '2rem',
        marginTop,
        width: '100%',
      }}
    >
      {children}
    </div>
  )
}

function FormActionRow({
  feedback,
  children,
}: {
  feedback?: ReactNode
  children: ReactNode
}) {
  return (
    <div
      style={{
        alignItems: 'flex-start',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.5rem 1rem',
        justifyContent: 'flex-end',
        marginTop: '0.5rem',
        minHeight: '3rem',
      }}
    >
      <div
        style={{
          flex: '1 1 0',
          minHeight: '1.5rem',
          minWidth: feedback ? '12rem' : 0,
        }}
      >
        {feedback}
      </div>
      <div style={{ flex: '0 0 auto', marginLeft: 'auto' }}>
        {children}
      </div>
    </div>
  )
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
    return (
      <p role="alert" style={formFeedbackStyle}>
        {errorMessage(mutation.error)}
      </p>
    )
  }
  if (mutation.isSuccess && mutation.data) {
    return (
      <p role="status" style={formFeedbackStyle}>
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

  const handleChangeTarget = () => {
    setConfirmedUserId(undefined)
    lookupMutation.reset()
    addMutation.reset()
    removeMutation.reset()
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
    <main style={adminPageStyle}>
      <h1>Credit administration</h1>
      <p>
        Signed in as <strong>{session.user.email}</strong>, effective admin via {adminSource}.
      </p>
      <p><a href="/auth/users">View Users</a></p>

      <section aria-labelledby="target-credit-actions" style={adminSectionStyle}>
        <h2 id="target-credit-actions">User credit actions</h2>
        <AdminTwoColumnRow marginTop={0}>
          <div style={adminColumnStyle}>
            <p style={{ marginTop: 0 }}>
              Administrators can adjust any user’s credit balance. Each addition or removal
              creates a ledger entry, so choose a description that clearly records why the
              balance changed.
            </p>
            <p>
              Enter the exact user ID and choose <strong>Look up user</strong> to enable{' '}
              <strong>Add credits</strong> and <strong>Remove credits</strong>. Check the confirmed
              account before making an adjustment.
            </p>
            <p>
              User IDs are available through <strong>View Users</strong>, above.
            </p>
          </div>

          <form
            aria-label="Credit target selection"
            onSubmit={handleLookup}
            style={columnFormStyle}
          >
            {target ? (
              <div aria-label="Confirmed credit target" aria-live="polite">
                <h3>Confirmed target</h3>
                <p><strong>{target.name}</strong> — {target.email}</p>
                <p>User ID: <code>{target.id}</code></p>
                <p>Cached balance: <strong>{target.credits} credits</strong></p>
                <FormActionRow>
                  <button
                    type="button"
                    onClick={handleChangeTarget}
                    disabled={addMutation.isPending || removeMutation.isPending}
                  >
                    Change target
                  </button>
                </FormActionRow>
              </div>
            ) : (
              <>
                <label htmlFor="admin-target-user-id">Exact user ID</label>
                <input
                  id="admin-target-user-id"
                  name="userId"
                  value={enteredUserId}
                  onChange={(event) => handleTargetIdChange(event.target.value)}
                  autoComplete="off"
                />
                <FormActionRow
                  feedback={lookupMutation.isError ? (
                    <p role="alert" style={formFeedbackStyle}>
                      {errorMessage(lookupMutation.error)}
                    </p>
                  ) : undefined}
                >
                  <button type="submit" disabled={lookupMutation.isPending}>
                    {lookupMutation.isPending ? 'Looking up…' : 'Look up user'}
                  </button>
                </FormActionRow>
              </>
            )}
          </form>
        </AdminTwoColumnRow>

        <AdminTwoColumnRow>
          <form onSubmit={handleAddCredits} style={columnFormStyle}>
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
            <FormActionRow feedback={mutationFeedback(addMutation, 'Credits added')}>
              <button type="submit" disabled={!target || addMutation.isPending}>
                {addMutation.isPending ? 'Adding…' : 'Add credits'}
              </button>
            </FormActionRow>
          </form>

          <form onSubmit={handleRemoveCredits} style={columnFormStyle}>
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
            <FormActionRow feedback={mutationFeedback(removeMutation, 'Credits removed')}>
              <button type="submit" disabled={!target || removeMutation.isPending}>
                {removeMutation.isPending ? 'Removing…' : 'Remove credits'}
              </button>
            </FormActionRow>
          </form>
        </AdminTwoColumnRow>
      </section>

      <section
        aria-labelledby="development-ledger-purge"
        style={{ ...adminSectionStyle, marginTop: '1rem' }}
      >
        <h2 id="development-ledger-purge">Development ledger purge</h2>
        <AdminTwoColumnRow marginTop={0}>
          <div style={adminColumnStyle}>
            <p style={{ marginTop: 0 }}>
              This permanent, self-only tool deletes your entire development ledger and sets your
              cached balance to zero. It is not an accounting correction.
            </p>
            <p>
              Purge all <strong>{totalRows}</strong> ledger rows, including{' '}
              <strong>{stripeRows} Stripe purchase rows</strong>?
            </p>
            <p>
              Purging a Stripe purchase row removes its local delivery record, so a retry or
              webhook resend may add the credits again.
            </p>
            {previewQuery.isError ? (
              <p role="alert">
                The current row counts could not be loaded. The purge remains self-only.
              </p>
            ) : null}
          </div>

          <form onSubmit={handlePurgeLedger} style={columnFormStyle}>
            <label htmlFor="purge-ledger-confirmation">
              Type <code>{PURGE_LEDGER_CONFIRMATION}</code> to confirm
            </label>
            <input
              id="purge-ledger-confirmation"
              value={purgeConfirmation}
              onChange={(event) => setPurgeConfirmation(event.target.value)}
              autoComplete="off"
            />
            <FormActionRow
              feedback={purgeMutation.isError ? (
                <p role="alert" style={formFeedbackStyle}>
                  {errorMessage(purgeMutation.error)}
                </p>
              ) : purgeMutation.isSuccess ? (
                <p role="status" style={formFeedbackStyle}>
                  Purged {purgeMutation.data.deletedRows} ledger rows ({
                    purgeMutation.data.deletedStripePurchaseRows
                  } Stripe). Cached balance is zero.
                </p>
              ) : undefined}
            >
              <button
                type="submit"
                disabled={
                  purgeConfirmation !== PURGE_LEDGER_CONFIRMATION ||
                  purgeMutation.isPending
                }
              >
                {purgeMutation.isPending ? 'Purging…' : 'Purge ledger'}
              </button>
            </FormActionRow>
          </form>
        </AdminTwoColumnRow>
      </section>
    </main>
  )
}
