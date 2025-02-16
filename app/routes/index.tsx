// app/routes/index.tsx
import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/start'
import { UserBlock } from '~/components/userBlock'
import {getCount, updateCount } from '~/lib/count'
import {sendMailInnerFunction, testMessage } from '~/lib/mailUtilities'
import {useSession} from '~/lib/auth-client'
import { SignIn } from '~/components/SignIn'

export const sendEmail = createServerFn({method: 'POST'})
  .validator((d: any) => d)
  .handler(async ({data}) => {
    sendMailInnerFunction
  })

export const Route = createFileRoute('/')({
  component: Home,
  loader: async () => await getCount(),
})

function Home() {
  const router = useRouter()
  const state = Route.useLoaderData()
  const navigate = useNavigate()
  const {data: session} = useSession()
  // console.log('index Home', {session: session ?? 'no session',})
  const email = session?.user?.email

  return (
    <>
    <button
      type="button"
      onClick={() => {
        updateCount({ data: 1 }).then(() => {
          router.invalidate()
        })
      }}
    >
      Add 1 to {state}?
    </button>
     <UserBlock />
      {
        ! email && <SignIn />
      }
      <button
        type="button"
        onClick={() => {
          sendEmail({data: testMessage()}).then(() => {
            console.log('sendEmail callback running')
          })
        }}
      >
        Send Test Email
      </button>
    </>
  )
}
