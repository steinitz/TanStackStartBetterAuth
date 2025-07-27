// vite.config.ts
import {defineConfig} from 'vite'
import tsConfigPaths from 'vite-tsconfig-paths'
import {tanstackStart} from '@tanstack/react-start/plugin/vite'
import {tanstackRouter} from '@tanstack/router-plugin/vite'
import viteReact from '@vitejs/plugin-react-swc'

export default defineConfig({
  server: {
    port: 3000,
  },
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
      verboseFileRoutes: false,
      virtualRouteConfig: './routes.ts',
    }),
    tsConfigPaths(), 
    tanstackStart({
      customViteReactPlugin: true
    }), 
    viteReact()],
  build: {
    rollupOptions: {
      external: [
        // Exclude reference directory from build
        /^\/reference\//,
      ],
    },
  },
  // Exclude reference directory from file watching and processing
  optimizeDeps: {
    exclude: ['reference'],
  },
})