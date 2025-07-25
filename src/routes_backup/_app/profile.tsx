import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'

// Lazy load the Profile component from stzUser
const ProfileComponent = lazy(async () => {
  const module = await import('~stzUser/routes/profile')
  return { default: module.Profile }
})

export const Route = createFileRoute('/_app/profile')({
  component: ProfileComponent,
})