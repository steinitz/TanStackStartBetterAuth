import { createFileRoute } from '@tanstack/react-router'
import { Profile } from '~stzUser/routes/profile'

export const Route = createFileRoute('/profile')({
  component: Profile,
})