import { Link } from '@tanstack/react-router'

export const Route = createFileRoute({
  component: AboutComponent,
});

export default function AboutComponent() {
  return (
    <div>
      <h1>About Page</h1>
      <p>This is the about page for testing virtual file routing.</p>
      <p>You've successfully navigated to a second route!</p>
      <nav>
        <Link to="/">← Back to Home</Link>
      </nav>
    </div>
  )
}