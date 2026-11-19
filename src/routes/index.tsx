import { createFileRoute } from '@tanstack/react-router'
import { Spacer } from '~stzUtils/components/Spacer'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <main>
      <section>
        <h1>Tanstack Start with Better Auth</h1>
        <Spacer />
        <h2>Index Page Content Area</h2>
        <Spacer />
        <h3>Default element styling provided by <a href="https://andybrewer.github.io/mvp/" target="_blank" rel="noopener noreferrer">MVP.css</a></h3>
      </section>
    </main>
  )
}
