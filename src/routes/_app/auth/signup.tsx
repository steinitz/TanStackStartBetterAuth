import { createFileRoute } from '@tanstack/react-router'
import { SignUp } from '~stzUser/components/SignUp'

export const Route = createFileRoute('/_app/auth/signup')({
  component: SignUp,
})