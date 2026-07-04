import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react-swc'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    // Integration tests share one on-disk libSQL file (sqlite.db). SQLite is single-writer, so
    // running test *files* in parallel causes SQLITE_BUSY. Serialize files. Note: the per-file
    // `describe.sequential` only orders tests *within* a file — it does NOT prevent cross-file
    // contention, so this flag is the actual guard.
    fileParallelism: false,
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