// The app's start instance. Its global function middleware wraps every server function, including
// the ones a loader calls directly during server rendering.
import { createStart } from '@tanstack/react-start'
import { serverCallCharge } from '~stzUser/lib/server-call-charge'

export const startInstance = createStart(() => ({ functionMiddleware: [serverCallCharge] }))
