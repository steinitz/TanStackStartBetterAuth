import { createFileRoute } from '@tanstack/react-router'
import { createServerFileRoute } from '@tanstack/react-start/server'

// Endpoint to check if server is running in test mode
// Used by E2E tests to confirm an appropriate test server exists
export const ServerRoute = createServerFileRoute('/api/test-env').methods({
  GET: () => {
    const response = {
      isPlaywrightRunning: process.env.PLAYWRIGHT_RUNNING === 'true',
      environment: process.env.PLAYWRIGHT_RUNNING === 'true' ? 'test' : 'development',
      timestamp: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }
})