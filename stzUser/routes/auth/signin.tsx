import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { SignIn } from '~stzUser/components/SignIn'
import { Spacer } from '~stzUtils/components/Spacer'

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
