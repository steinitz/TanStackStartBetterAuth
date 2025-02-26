// app/routes/index.tsx
import {ReactNode, useNavigate, useRouter} from '@tanstack/react-router'
import {UserBlock} from '~/components/userBlock'
import {useSession} from '~/lib/auth-client'
import {Footer} from "~/components/Footer";


export const MainLayout = ({children}: Readonly<{children: ReactNode}>)=> {
  const router = useRouter()
  const navigate = useNavigate()
  const {data: session} = useSession()
  // console.log('index Home', {session: session ?? 'no session',})
  const email = session?.user?.email

  return (
    <main>
      <UserBlock />
      {children}
      <Footer />
    </main>
  )
}
