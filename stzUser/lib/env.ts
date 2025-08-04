// Environment variable loading and validation
import * as dotenv from 'dotenv'

// Helper function to check if we're on the server
export const isServer = () => typeof window === 'undefined'

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

// Helper to get optional environment variables
export function getOptionalEnvVar(name: string, defaultValue?: string): string | undefined {
  if (!isServer()) {
    throw new Error('getOptionalEnvVar can only be called on the server')
  }
  return process.env[name] || defaultValue
}

// Client-safe environment variables
type ClientEnv = {
  APP_NAME: string
  SMTP_FROM_ADDRESS: string | undefined
  COMPANY_NAME: string
}

// Load environment variables based on NODE_ENV
if (isServer()) {
  dotenv.config({ path: `.env.${process.env.NODE_ENV || 'development'}` })
}

// Client-safe environment variables (exposed to browser)
export const clientEnv: ClientEnv = isServer() 
  ? {
      APP_NAME: process.env.APP_NAME || 'TanStack Start with Better Auth',
      SMTP_FROM_ADDRESS: process.env.SMTP_FROM_ADDRESS,
      COMPANY_NAME: process.env.COMPANY_NAME || 'Your Company',
    }
  : (typeof window !== 'undefined' && window.__ENV) 
    ? window.__ENV
    : {
        APP_NAME: 'TanStack Start with Better Auth',
        SMTP_FROM_ADDRESS: undefined,
        COMPANY_NAME: 'Your Company',
      }

// console.log({clientEnv});

// Extend window interface for client-side access
declare global {
  interface Window {
    __ENV?: ClientEnv
  }
}