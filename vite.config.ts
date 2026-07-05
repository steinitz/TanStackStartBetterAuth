// vite.config.ts
import { defineConfig } from 'vite'
import tsConfigPaths from 'vite-tsconfig-paths'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import netlify from '@netlify/vite-plugin-tanstack-start'
import viteReact from '@vitejs/plugin-react-swc'

export default defineConfig({
  server: {
    // Vite does not auto-read PORT; the e2e rig sets it in .env.test to move the
    // test server to 3019 without disturbing the default HTTP dev server on 3000.
    port: parseInt(process.env.PORT || '3000'),
    strictPort: true,
  },
  plugins: [
    tsConfigPaths(),
    tanstackStart(),
    netlify(),
    viteReact()
  ],
  resolve: {
    alias: process.env.NETLIFY
      ? {
        '@libsql/client': '@libsql/client/web',
        'better-sqlite3': '/Users/steinitz/Documents/Projects/Web/TanStackStartBetterAuth/TanStackStartBetterAuth/stzUser/lib/mock-sqlite.ts'
      }
      : undefined,
  },
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
  ssr: {
    noExternal: ['better-auth', 'kysely-libsql', '@libsql/client'],
  },
})