import type { WalletTransaction } from '~stzUser/lib/wallet'

type TransactionLedgerProps = {
  transactions: WalletTransaction[] | undefined
  isPending: boolean
  isError: boolean
}

export function TransactionLedger({
  transactions,
  isPending,
  isError,
}: TransactionLedgerProps) {
  if (isPending) return <p>Loading transactions...</p>

  if (isError) {
    return <p>Transaction history could not be loaded. Please try again.</p>
  }

  if (!transactions?.length) return <p>No transactions found.</p>

  return (
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
        {transactions?.map((transaction) => (
          <tr key={transaction.id} style={{ borderBottom: '1px solid var(--color-bg-secondary)' }}>
            <td style={{ padding: '0.5rem' }}>
              {new Date(transaction.created_at).toLocaleDateString()}
            </td>
            <td style={{ padding: '0.5rem', textTransform: 'capitalize' }}>
              {transaction.type.replace('_', ' ')}
            </td>
            <td style={{
              padding: '0.5rem',
              textAlign: 'right',
              color: transaction.amount > 0 ? 'var(--color-success)' : 'inherit'
            }}>
              {transaction.amount > 0 ? `+${transaction.amount}` : transaction.amount}
            </td>
            <td style={{ padding: '0.5rem' }}>{transaction.description}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
