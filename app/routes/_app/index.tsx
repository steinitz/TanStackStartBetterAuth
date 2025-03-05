import {createFileRoute} from '@tanstack/react-router'

export const Route = createFileRoute('/_app/')({
  component: Home,
})

function Home() {
  return (
    <section>
       <h3>Some Placeholder Content</h3>
    </section>
  )
}
