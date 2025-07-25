import { createFileRoute } from '@tanstack/react-router'
import { VerifyEmail } from '~stzUser/routes/auth/verify-email'

// Temporary route that imports the VerifyEmail component from stzUser
// This allows the project to build while we work on Virtual File Routes integration
export const Route = createFileRoute('/_app/auth/verify-email')({
  component: VerifyEmail,
})