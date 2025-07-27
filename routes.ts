// routes.ts
import { rootRoute, route, index } from '@tanstack/virtual-file-routes'

export const routes = rootRoute('__root.tsx', [
  index('index.tsx'),
  route('/about', '../outside-routes/about.tsx'),
])
export default routes
