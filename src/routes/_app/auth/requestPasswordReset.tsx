import { createFileRoute } from '@tanstack/react-router'
import { RequestPasswordReset } from '~stzUser/routes/auth/requestPasswordReset'

export const Route = createFileRoute('/_app/auth/requestPasswordReset')({
  component: RequestPasswordReset,
})