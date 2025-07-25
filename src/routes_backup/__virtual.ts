// NOTE: Virtual file routes are currently in development and not working with TanStack Start.
// This configuration is kept for future implementation when virtual routes are fully supported.
// Currently using temporary bridge files in src/routes/_app/ for routing to stzUser components.

import { 
  rootRoute,
  route, 
} from '@tanstack/virtual-file-routes'

export const routes = rootRoute('__root.tsx', [
  // Test virtual route mapping for profile component
  route('/profile', 'stzUser/routes/profile.tsx'),
])