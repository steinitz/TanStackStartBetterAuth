import { Link } from '@tanstack/react-router'

export const Route = createFileRoute({  
  component: HomeComponent,
})

function HomeComponent() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Virtual File Routing Test</h1>
      <p>This is a simple test page for virtual file routing.</p>
      <p>If you can see this, the basic routing is working!</p>
      <div style={{ marginTop: '2rem' }}>
        {/* <Link to="/about" style={{ 
          display: 'inline-block',
          padding: '0.5rem 1rem',
          backgroundColor: '#007acc',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '4px'
        }}>
          Go to About Page
        </Link> */}
      </div>
      <div style={{ marginTop: '2rem', padding: '1rem', borderRadius: '8px' }}>
        <h3>File-Based Routing Status:</h3>
        <p>• Index route working ✅</p>
        <p>• About route working ✅</p>
        <p>• Standard file-based routing active</p>
      </div>
    </div>
  )
}