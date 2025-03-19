// Environment variable loading

import {createServerFn} from "@tanstack/react-start"
import * as dotenv from 'dotenv'

// Only load dotenv on the server side
const loadDotEnv = () => {
  if (typeof window === 'undefined') {
    dotenv.config({ path: `.env.${process.env.NODE_ENV || 'development'}` })
  }
}

loadDotEnv()

// Helper function to ensure we're on the server
export const isServer = () => typeof window === 'undefined'

// Server-only environment variables (never exposed to client)
export const serverEnv = {
  smtp: {
    host: isServer() ? process.env.SMTP_HOST : undefined,
    port: isServer() ? Number(process.env.SMTP_PORT) : undefined,
    username: isServer() ? process.env.SMTP_USERNAME : undefined,
    password: isServer() ? process.env.SMTP_PASSWORD : undefined,
  },
  auth: {
    secret: isServer() ? process.env.BETTER_AUTH_SECRET : undefined,
  },
  github: {
    clientId: isServer() ? process.env.GITHUB_CLIENT_ID : undefined,
    clientSecret: isServer() ? process.env.GITHUB_CLIENT_SECRET : undefined,
  },
} as const

// Client-safe environment variables
// These should be injected at build time or passed through a server endpoint
export const clientEnv = {
  smtp: {
    fromAddress: isServer() ? process.env.SMTP_FROM_ADDRESS : undefined,
    fromName: isServer() ? process.env.SMTP_FROM_NAME : undefined,
    replyToAddress: isServer() ? process.env.SMTP_REPLY_TO_ADDRESS : undefined,
    replyToName: isServer() ? process.env.SMTP_REPLY_TO_NAME : undefined,
  },
  company: {
    name: isServer() ? process.env.COMPANY_NAME : undefined,
  },
  auth: {
    url: process.env.BETTER_AUTH_URL,
  },
} as const

// Server function to safely get client environment variables
export const getClientEnv = createServerFn({method: 'POST'})
  .validator((d: any) => d)
  .handler(() => {
    if (!isServer()) {
      throw new Error('getClientEnv must be called from the server')
    }
    return {
      smtp: {
        fromAddress: process.env.SMTP_FROM_ADDRESS,
        fromName: process.env.SMTP_FROM_NAME,
        replyToAddress: process.env.SMTP_REPLY_TO_ADDRESS,
        replyToName: process.env.SMTP_REPLY_TO_NAME,
      },
      company: {
        name: process.env.COMPANY_NAME,
      },
    }
  })

// Only validate environment variables on the server
if (isServer()) {
  const requiredEnvVars = [
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USERNAME',
    'SMTP_PASSWORD',
    'SMTP_FROM_ADDRESS',
    'COMPANY_NAME',
    'BETTER_AUTH_SECRET',
    'BETTER_AUTH_URL',
  ] as const

  for (const key of requiredEnvVars) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`)
    }
  }
} 