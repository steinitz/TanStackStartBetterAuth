import { createFileRoute } from '@tanstack/react-router'
import SignUp from '~stzUser/routes/auth/signup'

// Temporary route that imports the SignUp component from stzUser
// This allows the project to build while we work on Virtual File Routes integration
export const Route = createFileRoute('/_app/auth/signup')({
  component: SignUp,
})