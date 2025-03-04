// app/routes/index.tsx
import { ReactNode } from "react";
import {Footer} from "~/components/Footer";
import {Header} from '~/components/Header';

export const MainLayout = ({children}: Readonly<{children: ReactNode}>)=> {
  // const {theCount} = Route.useLoaderData()
  const theCount = 5
  return (
    <main>
      <Header />
      {children}
      <Footer />
    </main>
  )
}

// export const Route = createFileRoute('/_mainLayout')({
//   component: MainLayout,
//   loader: async () => {
//     return {
//       theCount: await getCount(),
//       // testMessage: testMessage()
//     }
//   }
// })

