import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { UserManagement } from '~stzUser/components/Other/UserManagement'
import { adminUsersQueryOptions } from '~stzUser/lib/users-client'
import { useAdminStatus } from '~stzUser/lib/admin-queries'
import { useSession } from '~stzUser/lib/auth-client'

function UsersPage() {
  const { data: session, isPending: isSessionPending } = useSession()
  const adminStatus = useAdminStatus()
  const isAdmin = Boolean(adminStatus.data?.isAdmin)
  const usersQuery = useQuery(adminUsersQueryOptions(isAdmin))

  if (isSessionPending || (session?.user && adminStatus.isPending)) {
    return <p>Loading Admin access…</p>
  }

  if (!session?.user || !isAdmin) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>Access Denied</h1>
        <p>You must be an administrator to view this page.</p>
        <Link to="/">Return to Home</Link>
      </div>
    )
  }

  return (
    <div>
      <h1>User Management</h1>
      <p><Link to="/admin">Back to Credit administration</Link></p>
      {usersQuery.isPending ? (
        <p>Loading users...</p>
      ) : usersQuery.isError ? (
        <p role="alert">Users could not be loaded.</p>
      ) : (
        <UserManagement users={usersQuery.data ?? []} />
      )}
    </div>
  )
}

export const Route = createFileRoute('/auth/users')({
  component: UsersPage,
})
