import { createFileRoute } from '@tanstack/react-router'
import { SignUp } from '~stzUser/components/SignUp'

// Route that imports the SignUp component from stzUser components
export const Route = createFileRoute('/_app/auth/signup')({
  component: SignUp,
})