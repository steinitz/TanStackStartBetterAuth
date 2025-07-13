// src/lib/auth-client.ts
import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
  baseURL: "http://localhost:3000", // or your production URL
})

export const {
  signIn,
  signUp,
  signOut,
  useSession,
} = authClient