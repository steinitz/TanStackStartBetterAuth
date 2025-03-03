// app/routes/index.tsx
import {createFileRoute} from '@tanstack/react-router'
import {useSession} from '~/lib/auth-client'
import {SignIn} from '~/components/SignIn'
import {Spacer} from '~/components/Spacer'
import {DeveloperTools} from "~/components/DeveloperTools";
import {getCount} from '~/lib/count';
import {testMessage} from '~/lib/mailUtilities';


export const Route = createFileRoute('/')({
  component: Home,
  loader: async () => {
    return {
      theCount: await getCount(),
      testMessage: testMessage()
    }
  }
})

function Home() {
  const {data: session} = useSession()
  const email = session?.user?.email

  const {testMessage, theCount} = Route.useLoaderData()

  return (
    <section>
      {
        ! email && <SignIn />
      }
      <h3>Some Placeholder Content</h3>
      {
        process.env.NODE_ENV === 'development' &&
        (
          <>
          <Spacer />
            <DeveloperTools
              theCount={theCount}
            />
          </>
        )
      }
    </section>
  )
}


// graveyard

  //    <details style={{position: 'relative', top: '21rem', left: '0rem'}}>
