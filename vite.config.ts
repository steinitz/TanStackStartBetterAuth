// vite.config.ts
import { defineConfig } from 'vite'
import tsConfigPaths from 'vite-tsconfig-paths'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import netlify from '@netlify/vite-plugin-tanstack-start'
import viteReact from '@vitejs/plugin-react-swc'

export default defineConfig(({ command }) => ({
  server: {
    // Vite does not auto-read PORT. Honour an explicitly supplied dev-server
    // port while keeping ordinary upstream development on 3000.
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
    alias: command === 'build'
      ? {
        '@libsql/client': '@libsql/client/web',
        'better-sqlite3': '/Users/steinitz/Documents/Projects/Web/TanStackStartBetterAuth/TanStackStartBetterAuth/stzUser/lib/mock-sqlite.ts'
      }
      : undefined,
  },
  // Client build only. Vite's resolver is eager: it walks a dynamic import to decide
  // whether to emit a chunk, and walking into nodemailer makes it report `util` and
  // `url` as externalized for the browser, 47 times a build. Nothing is emitted — the
  // import.meta.env.SSR guard in logToServer sees to that, and the contact-form handler
  // is stripped — so the warnings are noise, and noise that buries everything else in
  // build and test output.
  //
  // They arrived with 0a64c5e, which moved the SMTP primitive behind a dynamic import to
  // keep it out of the browser. That fix was right. A dynamic import is a chunk boundary,
  // and this is the price of one.
  //
  // Scoped to the client environment on purpose. The SSR build must still resolve and
  // bundle nodemailer, because that is where mail is actually sent.
  //
  // Warning: this tells the resolver to stop looking at the one library we most want
  // kept out of the browser, so it can no longer warn us either. A leak that used to
  // show as a build warning now shows as a browser error, because an externalized
  // import survives as a bare `nodemailer` specifier no browser can resolve.
  //
  // The check, after any change to how mail.server.ts is reached:
  //
  //   grep -rl nodemailer dist/client || echo clean
  //
  // When nodemailer last reached the client bundle the app shell died with
  // `Class extends value undefined`, past a green type check and a green unit suite.
  // Only the built artifact showed it, which is why the check is on dist, not on source.
  environments: {
    client: {
      build: {
        rollupOptions: {
          external: ['nodemailer'],
        },
      },
    },
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
}))
