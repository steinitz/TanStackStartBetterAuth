import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react-swc'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    provide: {
      dbLocked: false,
    },
    environment: 'jsdom',
    // Integration tests share one on-disk libSQL file. SQLite is single-writer, so
    // running test *files* in parallel causes SQLITE_BUSY. Serialize files. Note: the per-file
    // `describe.sequential` only orders tests *within* a file — it does NOT prevent cross-file
    // contention, so this flag is the actual guard.
    fileParallelism: false,
    /* Inject the DB path before any module initializes. database.ts reads process.env.DATABASE_URL
       and creates its client at module load time. Keep the unit setup file limited to jest-dom;
       loading env files there is both too late and capable of redirecting tests to a developer DB. */
    env: {
      DATABASE_URL: 'file:stzUser/test/test-unit.db',
    },
    setupFiles: ['./stzUser/test/unit/setup.ts'],
    globals: true, // Re-enable globals for jest-dom compatibility
    watch: false,
    /* Only target *.test.ts files for Vitest unit tests */
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: ['**/*.spec.ts', '**/*.spec.tsx', 'node_modules/**'],
  },
  ssr: {
    noExternal: ['better-auth', 'kysely-libsql', '@libsql/client'],
  },
})
