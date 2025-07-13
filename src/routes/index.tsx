// src/routes/index.tsx
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useSession, signOut } from '../lib/auth-client'

export const Route = createFileRoute('/')({ 
  component: Home,
})

function Home() {
  const [count, setCount] = useState(0)
  const { data: session, isPending } = useSession()

  const handleSignOut = async () => {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = '/'
        },
      },
    })
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <nav style={{ marginBottom: '20px', padding: '10px 0', borderBottom: '1px solid #ccc' }}>
        {isPending ? (
          <p>Loading...</p>
        ) : session?.user ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Welcome, {session.user.name || session.user.email}!</span>
            <button 
              onClick={handleSignOut}
              style={{
                padding: '8px 16px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '10px' }}>
            <Link 
              to="/auth/signin"
              style={{
                padding: '8px 16px',
                backgroundColor: '#007acc',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '4px'
              }}
            >
              Sign In
            </Link>
            <Link 
              to="/auth/signup"
              style={{
                padding: '8px 16px',
                backgroundColor: '#28a745',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '4px'
              }}
            >
              Sign Up
            </Link>
          </div>
        )}
      </nav>
      
      <h1>Welcome to TanStack Start!</h1>
      <p>This is a basic counter example with authentication:</p>
      <div style={{ margin: '20px 0' }}>
        <button 
          onClick={() => setCount(count + 1)}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#007acc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Count: {count}
        </button>
      </div>
      <p>Click the button to increment the counter!</p>
      
      {session?.user && (
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
          <h3>User Information:</h3>
          <p><strong>Email:</strong> {session.user.email}</p>
          <p><strong>Name:</strong> {session.user.name || 'Not provided'}</p>
          <p><strong>Email Verified:</strong> {session.user.emailVerified ? 'Yes' : 'No'}</p>
        </div>
      )}
    </div>
  )
}