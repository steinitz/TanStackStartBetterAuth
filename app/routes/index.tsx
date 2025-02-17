// app/routes/index.tsx
import {createFileRoute, useNavigate, useRouter} from '@tanstack/react-router'
import {UserBlock} from '~/components/userBlock'
import {sendEmail, testMessage} from '~/lib/mailUtilities'
import {useSession} from '~/lib/auth-client'
import {SignIn} from '~/components/SignIn'
import {getCount, updateCount} from '~/lib/count'


export const Route = createFileRoute('/')({
  component: Home,
  loader: async () => {
    return {
      theTestMessage: testMessage(),
      theCount: await getCount()
    }
  }
})

function Home() {
  const router = useRouter()
  const loaderData = Route.useLoaderData()
  const navigate = useNavigate()
  const {data: session} = useSession()
  // console.log('index Home', {session: session ?? 'no session',})
  const email = session?.user?.email

  return (
    <>
    <button
      type="button"
      onClick={() => {
        updateCount({data: 1}).then(() => {
          router.invalidate()
        })
      }}
    >
      Add 1 to {loaderData.theCount}?
    </button>
     <UserBlock />
      {
        ! email && <SignIn />
      }
      <button
        type="button"
        onClick={async () => {
          await sendEmail({data: loaderData.theTestMessage}).then(() => {
            console.log('sendEmail callback running')
          })
          alert ('Email sent')
        }}
      >
        Send Test Email
      </button>
    </>
  )
}
