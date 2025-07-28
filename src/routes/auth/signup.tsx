import { createFileRoute } from '@tanstack/react-router'
import { SignUp } from '~stzUser/components/RouteComponents/SignUp'

// Route that imports the SignUp component from stzUser components
export const Route = createFileRoute('/auth/signup')({
  component: SignUp,
})