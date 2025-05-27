// Environment variable loading
import * as dotenv from 'dotenv'

// Helper function to check if we're on the server
export const isServer = () => typeof window === 'undefined'

// List of environment variables that should never be exposed to the client
const serverOnlyVars = [
  'OPENAI_API_KEY',
  'GROQ_API_KEY',
  'ANTHROPIC_API_KEY',
] as const

// Helper to safely get environment variables (server-side only)
export function getEnvVar(name: string): string {
  if (!isServer()) {
    throw new Error('getEnvVar can only be called on the server')
  }

  const value = process.env[name]
  if (!value) {
    throw new Error(`Environment variable ${name} is not set`)
  }
  return value
}

// Type for client environment variables
type ClientEnv = any

// Client-safe environment variables populated during SSR.
// These values are public and safe to expose to the browser.
export let clientEnv: ClientEnv = {
  // APP_NAME: 'GenSX Demo'
}

// Declare window augmentation for TypeScript
declare global {
  interface Window {
    __ENV?: ClientEnv
  }
}

if (isServer()) {
  // Load environment variables on server
  dotenv.config()

  // Fallback to development env file
  dotenv.config({ path: `.env.${process.env.NODE_ENV || 'development'}` })

  // Populate client-safe variables
  try {
    clientEnv = {
      APP_NAME: process.env.APP_NAME || 'Steinitz Developements App'
    }
  } catch (error) {
    console.error('Error loading client environment variables:', error)
  }
} else {
  // On the client, get values from window.__ENV
  // This will be populated during SSR
  if (window.__ENV) {
    clientEnv = window.__ENV
  }
}

