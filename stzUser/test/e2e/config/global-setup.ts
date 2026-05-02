import { FullConfig } from '@playwright/test';
import { ensureServerRunning, ensureMailpitRunning } from 'stzUser/test/e2e/utils/e2e-services';
import { testConstants } from 'stzUser/test/constants';
import fs from 'fs';
import path from 'path';

/**
 * Global test setup.
 *
 * Auto-starts the dev server and Mailpit if they are not already running.
 * The developer does not need to start either service manually — running
 * `pnpm test:e2e` from a cold machine is sufficient. Mailpit must be
 * installed (`brew install mailpit` on macOS); ports 3019, 1025, and 8025
 * must be free.
 *
 * Also resets the test database (`test-e2e.db`) so every run starts from
 * a clean "First User is Admin" state.
 */
async function globalSetup(config: FullConfig) {
  // Clean up test database to ensure "First User is Admin" state
  const dbPath = path.resolve(process.cwd(), 'test-e2e.db');
  const dbFiles = [dbPath, `${dbPath}-wal`, `${dbPath}-shm`, `${dbPath}-journal`];
  
  dbFiles.forEach(file => {
    if (fs.existsSync(file)) {
      try {
        fs.rmSync(file);
      } catch (err) {
        console.warn(`Warning: Could not remove ${path.basename(file)}:`, err instanceof Error ? err.message : String(err));
      }
    }
  });
  
  const baseURL = config.projects[0]?.use?.baseURL || testConstants.testBaseURL;
  
  try {
    await ensureMailpitRunning();
    await ensureServerRunning(baseURL);
  } catch (error) {
    console.error('\n❌ Global Setup Failed');
    console.error('='.repeat(50));
    console.error('Error:', error instanceof Error ? error.message : String(error));
    console.error('\n💡 Recovery steps:');
    console.error(`   • Free up ports if another process is holding ${testConstants.testPort}, 8025, or 1025`);
    console.error('   • Confirm .env.test exists and sets PLAYWRIGHT_RUNNING=true');
    console.error('   • Install mailpit if missing: brew install mailpit (macOS)');
    console.error('   • As a last resort, start the dev server by hand: pnpx dotenv-cli -e .env.test -- pnpm dev');
    console.error('='.repeat(50));
    
    // Re-throw to fail the test suite
    throw error;
  }
}

export default globalSetup;
