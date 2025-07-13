// src/lib/auth.ts
import { betterAuth } from "better-auth"
import { reactStartCookies } from "better-auth/react-start"
import Database from "better-sqlite3"

// Create database instance
const database = new Database("sqlite.db")

export const auth = betterAuth({
  database,
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    reactStartCookies() // This plugin handles cookie setting for TanStack Start
  ],
})