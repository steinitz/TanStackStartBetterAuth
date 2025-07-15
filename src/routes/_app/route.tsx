import { createFileRoute, Outlet } from '@tanstack/react-router'
import { getCount } from '~/lib/count'

// This pathless parent route is used to resurrect TanStack's
// count demo but allow the Developer Tools, buried in the
// Footer, to access and update the count.

export const Route = createFileRoute('/_app')({
  component: RouteComponent,
  loader: async () => await getCount(),
})

function RouteComponent() {
  return <Outlet />
}