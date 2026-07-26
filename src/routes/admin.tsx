import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { CreditsAdminPage } from '~stzUser/components/RouteComponents/CreditsAdminPage'

type AdminSearch = {
  userId?: string
}

function AdminPage() {
  const navigate = useNavigate()
  const search = Route.useSearch()

  return (
    <CreditsAdminPage
      initialUserId={search.userId}
      onViewUsers={() => navigate({ to: '/auth/users' })}
    />
  )
}

// Keep this route thin. CreditsAdminPage fails closed from the server-derived effective-admin
// status; a route-local session.user.role check would silently exclude environment admins.
export const Route = createFileRoute('/admin')({
  component: AdminPage,
  validateSearch: (search: Record<string, unknown>): AdminSearch => {
    const userId = typeof search.userId === 'string' ? search.userId.trim() : ''
    return { userId: userId || undefined }
  },
})
