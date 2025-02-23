import {createFileRoute, useNavigate} from '@tanstack/react-router'
import {SignIn} from '~/components/SignIn'
import {Spacer} from '~/components/Spacer'

export const Route = createFileRoute('/auth/signin')({
  component: signin,
})

function signin() {
  const navigate = useNavigate()
  return (
    <main>
      <section>
        <button
          type={'submit'}
          onClick={async () => {
            navigate({to: '/'})
          }}
        >
          Home
        </button>
      </section>
      <Spacer />
      <section>
      <SignIn />
      </section>
    </main>
  )
}
