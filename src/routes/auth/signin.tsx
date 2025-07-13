import { createFileRoute } from '@tanstack/react-router'
import { SignIn } from '~stzUser/components/SignIn'

export const Route = createFileRoute('/auth/signin')({ 
  component: SignIn,
})