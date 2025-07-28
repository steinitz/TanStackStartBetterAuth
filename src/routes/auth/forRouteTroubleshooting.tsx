import { createFileRoute } from '@tanstack/react-router'
import { Profile } from '~stzUser/components/RouteComponents/ForRouteTroubleshooting'

// Temporary route that imports the troubleshooting component from stzUser
// This allows the project to build while we work on Virtual File Routes integration
export const Route = createFileRoute('/auth/forRouteTroubleshooting')({
  component: Profile,
})