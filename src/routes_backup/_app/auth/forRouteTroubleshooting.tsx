import { createFileRoute } from '@tanstack/react-router'
import { Profile } from '~stzUser/routes/auth/forRouteTroubleshooting'

// Temporary route that imports the troubleshooting component from stzUser
// This allows the project to build while we work on Virtual File Routes integration
export const Route = createFileRoute('/_app/auth/forRouteTroubleshooting')({
  component: Profile,
})