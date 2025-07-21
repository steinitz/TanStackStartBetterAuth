import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { SignIn } from '~stzUser/components/SignIn'
import { Spacer } from '~stzUtils/components/Spacer'

// Temporary route that imports the SignIn component from stzUser
// This allows the project to build while we work on Virtual File Routes integration
export const Route = createFileRoute('/_app/auth/signin')({
  component: signin,
})

function signin() {
  const navigate = useNavigate()
  return (
      <section>
        <SignIn />
      </section>
  )
}