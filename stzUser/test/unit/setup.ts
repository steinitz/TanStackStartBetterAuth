import '@testing-library/jest-dom'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load test environment variables. This first call cannot clobber the DATABASE_URL
// that vitest.config.ts pins via test.env, because dotenv leaves existing vars alone.
dotenv.config({ path: path.resolve(process.cwd(), '.env.test') })

// Footgun: override:true means a DATABASE_URL in .env.test.local silently defeats the
// isolated unit-test database pinned in vitest.config.ts, and sends the unit tests at the
// development database instead. A stale line here did exactly that, unnoticed, for months.
// The file is gitignored, so the breakage is per-machine and never shows up in git status.
dotenv.config({ path: path.resolve(process.cwd(), '.env.test.local'), override: true })
