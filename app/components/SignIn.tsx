import {signIn, useSession} from '~/lib/auth-client'
import {useState} from 'react'
import {
  createFileRoute, useNavigate,
  useRouter
} from '@tanstack/react-router'
import {Spacer} from '~/components/Spacer'

const thisPath = '/auth/signin'

export const SignIn = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()

  const doSignIn = async () => {
    console.log('doSignin call to signIn.email()\n', {email, password})

    const {
      data,
      error
    } = await signIn.email(
      {
        email,
        password,
        // callbackURL: '/', // doesn't seem to work anyway
      },
      {
        onRequest: async (ctx) => {
          console.log('signin.email - onRequest', {ctx})
        },
        onSuccess: async (ctx) => {
          console.log('signin.email - onSuccess', {ctx})
          window.location.href = '/' // TanStack navigation doesn't work here
        },
        onError: (ctx) => {
          // alert(ctx.error.message);
          console.log({ctxError: ctx.error.message, authClientError: error})
        },
      },
    )
    console.log({data, error})
  }

  return (
     <>
      <section>
        <form>
          <h1>Sign In</h1>
          <label>Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button
            onClick={doSignIn}
          >Sign In</button>
        </form>
      </section>
      <Spacer />
      <section>
        <h3>No Account?</h3>
        <Spacer orientation='horizontal' />
        <button
          type={"submit"}
          onClick={() => {
            navigate({to: '/auth/signup'})
          }}
        >
          Sign Up
        </button>
      </section>
    </>
  )
}

