import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { SignIn } from '~/components/SignIn'
import { Spacer } from '~/components/Spacer'

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
