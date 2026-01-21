// src/server.ts
import {
  createStartHandler,
  defaultStreamHandler,
} from '@tanstack/react-start/server'
import { createRouter } from './router'
import { ensureAdditionalTables } from '~stzUser/lib/migrations'

// Ensure database tables exist on startup
await ensureAdditionalTables()

export default createStartHandler({
  createRouter,
})(defaultStreamHandler)