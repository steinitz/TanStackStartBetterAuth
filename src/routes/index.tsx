// src/routes/index.tsx
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/')({  component: Home,
})

function Home() {
  const [count, setCount] = useState(0)

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Welcome to TanStack Start!</h1>
      <p>This is a basic counter example:</p>
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
    </div>
  )
}