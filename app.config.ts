// app.config.ts
import {defineConfig} from '@tanstack/react-start/config'
import tsConfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  // Or you can use the --preset flag with the build command
  // to specify the deployment target when building the application:
  // npm run build --preset node-server
  server: {
    preset: 'node-server',
  },
  vite: {
    plugins: [
      tsConfigPaths({
        projects: ['./tsconfig.json'],
      }),
    ],
  },
})
