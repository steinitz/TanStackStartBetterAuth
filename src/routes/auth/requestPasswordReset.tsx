import { createFileRoute } from '@tanstack/react-router'
import { RequestPasswordReset } from '~stzUser/routes/auth/requestPasswordReset'

// Temporary route that imports the RequestPasswordReset component from stzUser
// This allows the project to build while we work on Virtual File Routes integration
export const Route = createFileRoute('/auth/requestPasswordReset')({
  component: RequestPasswordReset,
})