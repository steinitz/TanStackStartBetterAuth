import { createFileRoute } from '@tanstack/react-router'
import { Spacer } from '~stzUtils/components/Spacer'

export const Route = createFileRoute('/other')({
  component: Other,
})

function Other() {
  return (
    <main>
      <section>
        <h1>Other Page</h1>
        <Spacer />
        <p>This is a stub for the Other page.</p>
      </section>
    </main>
  )
}
