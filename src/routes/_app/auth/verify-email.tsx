import { createFileRoute } from '@tanstack/react-router'
import { VerifyEmail } from '~stzUser/components/VerifyEmail'

export const Route = createFileRoute('/_app/auth/verify-email')({
  component: VerifyEmail,
})