import { createFileRoute } from '@tanstack/react-router'
import { Profile } from '~stzUser/components/RouteComponents/Profile/Profile'

export const Route = createFileRoute('/auth/profile')({
  component: Profile,
})