import { createFileRoute } from '@tanstack/react-router'
import { SignIn } from '~stzUser/components/RouteComponents/SignIn'
import { Spacer } from '~stzUtils/components/Spacer'

// Temporary route that imports the SignIn component from stzUser
// This allows the project to build while we work on Virtual File Routes integration
export const Route = createFileRoute('/auth/signin')({
  component: signin,
})

function signin() {
  return (
      <section>
        <SignIn />
      </section>
  )
}