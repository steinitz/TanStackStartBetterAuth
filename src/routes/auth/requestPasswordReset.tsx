import { createFileRoute } from '@tanstack/react-router'
import { RequestPasswordReset } from '~stzUser/routes/auth/requestPasswordReset'

export const Route = createFileRoute('/auth/requestPasswordReset')({
  component: RequestPasswordReset,
})