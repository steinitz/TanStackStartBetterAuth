import { createFileRoute } from '@tanstack/react-router'
import { VerifyEmail } from '~stzUser/components/VerifyEmail'

export const Route = createFileRoute('/auth/verify-email')({
  component: VerifyEmail,
})