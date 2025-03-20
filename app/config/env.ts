// Environment variable loading
import * as dotenv from 'dotenv'

// Helper function to check if we're on the server
export const isServer = () => typeof window === 'undefined'

// List of environment variables that should never be exposed to the client
const serverOnlyVars = [
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USERNAME',
  'SMTP_PASSWORD',
  'BETTER_AUTH_SECRET',
  'GITHUB_CLIENT_ID',
  'GITHUB_CLIENT_SECRET',
] as const

// Helper to safely get environment variables
export function getEnvVar(name: string, required = false): string | undefined {
  const value = process.env[name]
  if (required && !value) {
    throw new Error(`Required environment variable ${name} is not set`)
  }
  return value
}

if (isServer()) {
  // Load environment variables on server
  dotenv.config({ path: `.env.${process.env.NODE_ENV || 'development'}` })

  // Validate critical infrastructure variables at startup
  const criticalVars = [
    'BETTER_AUTH_SECRET',  // needed for auth to work at all
    'BETTER_AUTH_URL',     // needed for auth to work at all
  ] as const

  for (const key of criticalVars) {
    getEnvVar(key, true)
  }
} else {
  // On the client, filter out server-only variables
  const safeVars = Object.entries(process.env).reduce((acc, [key, value]) => {
    if (!serverOnlyVars.includes(key as any)) {
      acc[key] = value
    }
    return acc
  }, {} as Record<string, string | undefined>)
  
  process.env = safeVars
} 