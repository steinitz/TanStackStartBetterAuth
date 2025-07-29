import { createFileRoute } from '@tanstack/react-router'
import {getCount} from '~/lib/count'

export const Route = createFileRoute('/')({ 
  component: Home,
  loader: async () => await getCount(),
})

function Home() {
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>Main Content Area</h1>
    </div>
  )
}