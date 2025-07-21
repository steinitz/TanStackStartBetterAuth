import { createFileRoute } from '@tanstack/react-router'
import { SetNewPassword } from '~stzUser/routes/auth/setNewPassword'

// Temporary route that imports the SetNewPassword component from stzUser
// This allows the project to build while we work on Virtual File Routes integration
export const Route = createFileRoute('/_app/auth/setNewPassword')({
  component: SetNewPassword,
})