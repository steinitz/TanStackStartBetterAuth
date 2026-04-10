// src/server.ts
import {
  createStartHandler,
  defaultStreamHandler,
} from '@tanstack/react-start/server'
import { ensureAdditionalTables } from '~stzUser/lib/migrations'

// Ensure database tables exist on startup
await ensureAdditionalTables()

const fetch = createStartHandler(defaultStreamHandler)

export default {
  async fetch(...args: Parameters<typeof fetch>) {
    return await fetch(...args)
  },
}
