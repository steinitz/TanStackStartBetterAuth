// The app's start instance. Its global function middleware wraps every server function, including
// the ones a loader calls directly during server rendering.
//
// This app charges for nothing, so its price table is empty and every call is free. An app built
// on this one fills the table with its own events — see the middleware's own comment.
import { createStart } from '@tanstack/react-start'
import { createServerCallCharge } from '~stzUser/lib/server-call-charge'
import { createAppUpdateCheck } from '~stzUser/lib/app-update-middleware'

export const startInstance = createStart(() => ({
  // The update check first, so it wraps the charge and sees its failures too.
  functionMiddleware: [createAppUpdateCheck(), createServerCallCharge([])],
}))
