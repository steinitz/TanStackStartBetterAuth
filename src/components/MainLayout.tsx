import type { ReactNode } from 'react'
import { Header } from './Header'
import { Footer } from './Footer'

export const MainLayout = ({ children }: Readonly<{ children: ReactNode }>) => {
  return (
    <main>
      <Header />
      {children}
      <Footer />
    </main>
  )
}