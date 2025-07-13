import { createFileRoute } from '@tanstack/react-router'
import { SetNewPassword } from '~stzUser/routes/auth/setNewPassword'

export const Route = createFileRoute('/auth/setNewPassword')({
  component: SetNewPassword,
})