import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ 
  component: Home,
})

function Home() {
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>Main Content Area</h1>
    </div>
  )
}