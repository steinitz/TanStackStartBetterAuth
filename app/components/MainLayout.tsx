// app/routes/index.tsx
import { ReactNode } from "react";
import {Footer} from "~/components/Footer";
import {Header} from '~/components/Header';

export const MainLayout = ({children}: Readonly<{children: ReactNode}>)=> {
  const theCount = 5
  return (
    <main>
      <Header />
      {children}
      <Footer />
    </main>
  )
}
