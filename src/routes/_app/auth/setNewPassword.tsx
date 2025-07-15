import { createFileRoute } from '@tanstack/react-router'
import { SetNewPassword } from '~stzUser/routes/auth/setNewPassword'

export const Route = createFileRoute('/_app/auth/setNewPassword')({
  component: SetNewPassword,
})