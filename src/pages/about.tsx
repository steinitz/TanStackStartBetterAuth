import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
  component: AboutComponent,
})

function AboutComponent() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>About Page</h1>
      <p>This is the about page for testing virtual file routing.</p>
      <p>You've successfully navigated to a second route!</p>
      <nav style={{ marginTop: '2rem' }}>
        <Link 
          to="/" 
          style={{ 
            color: '#007acc', 
            textDecoration: 'underline',
            fontSize: '1.1rem'
          }}
        >
          ← Back to Home
        </Link>
      </nav>
    </div>
  )
}