import { createFileRoute } from '@tanstack/react-router'
import { Profile } from '~stzUser/routes/profile'

// Temporary route that imports the Profile component from stzUser
// This allows the project to build while we work on Virtual File Routes integration
export const Route = createFileRoute('/_app/profile')({
  component: Profile,
})