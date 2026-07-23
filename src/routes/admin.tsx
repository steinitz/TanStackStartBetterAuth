import { createFileRoute } from '@tanstack/react-router'
import { CreditsAdminPage } from '~stzUser/components/RouteComponents/CreditsAdminPage'

// Keep this route thin. CreditsAdminPage fails closed from the server-derived effective-admin
// status; a route-local session.user.role check would silently exclude environment admins.
export const Route = createFileRoute('/admin')({
  component: CreditsAdminPage,
})
