import { createFileRoute } from '@tanstack/react-router'
import { getCount } from '~/lib/count'

export const Route = createFileRoute('/')({
  component: Home,
  loader: async () => {
    const count = await getCount()
    return { count }
  },
})

function Home() {
  const { count } = Route.useLoaderData()

  return (
    <main>
      <section>
        <h1>Tanstack Start with Better Auth</h1>
        <p>Welcome! The user management table has been moved to Developer Tools.</p>
        <p>Current count: {count}</p>
      </section>
    </main>
  )
}