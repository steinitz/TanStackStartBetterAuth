import { createFileRoute } from '@tanstack/react-router'
import { Profile } from '~stzUser/routes/profile'

export const Route = createFileRoute('/_app/profile')({
  component: Profile,
})