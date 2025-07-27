import { Link } from '@tanstack/react-router'

export const Route = createFileRoute({  
  component: HomeComponent,
})

function HomeComponent() {
  return (
    <div>
      <h1>Virtual File Routing Test</h1>
      <p>This is a simple test page for virtual file routing.</p>
      <p>If you can see this, the basic routing is working!</p>
      <div>
        <Link to="/about">Go to About page</Link>
      </div>
      <div>
        <h3>File-Based Routing Status:</h3>
        <p>• Index route working ✅</p>
        <p>• About route not working ❌</p>
        <p>• Virtual routing causing infinite loop</p>
      </div>
    </div>
  )
}