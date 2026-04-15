import { FullConfig } from '@playwright/test';
import { ensureServerRunning, ensureMailpitRunning } from 'stzUser/test/e2e/utils/e2e-services';
import fs from 'fs';
import path from 'path';

/**
 * Global test setup.
 *
 * Auto-starts the dev server and Mailpit if they are not already running.
 * The developer does not need to start either service manually — running
 * `pnpm test:e2e` from a cold machine is sufficient. Mailpit must be
 * installed (`brew install mailpit` on macOS); ports 3000, 1025, and 8025
 * must be free.
 *
 * Also resets the test database (`test-e2e.db`) so every run starts from
 * a clean "First User is Admin" state.
 */
async function globalSetup(config: FullConfig) {
  console.log('\n🚀 Starting E2E Test Environment Setup');
  console.log('=' .repeat(50));
  
  // Clean up test database to ensure "First User is Admin" state
  const dbPath = path.resolve(process.cwd(), 'test-e2e.db');
  const dbFiles = [dbPath, `${dbPath}-wal`, `${dbPath}-shm`, `${dbPath}-journal`];
  
  console.log('\n🧹 Cleaning up test database...');
  dbFiles.forEach(file => {
    if (fs.existsSync(file)) {
      try {
        fs.rmSync(file);
        console.log(`   • Removed: ${path.basename(file)}`);
      } catch (err) {
        console.warn(`   • Warning: Could not remove ${path.basename(file)}:`, err instanceof Error ? err.message : String(err));
      }
    }
  });
  
  const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:3000';
  
  try {
    // Phase 1: Start Mailpit (email testing dependency)
    console.log('\n📧 Phase 1: Email Service Setup');
    await ensureMailpitRunning();
    
    // Phase 2: Start development server with test environment
    console.log('\n🌐 Phase 2: Development Server Setup');
    await ensureServerRunning(baseURL);
    
    // Phase 3: Environment validation
    console.log('\n✅ Phase 3: Environment Validation');
    console.log(`   • Server URL: ${baseURL}`);
    console.log(`   • Mailpit API: http://localhost:8025`);
    console.log(`   • SMTP Server: localhost:1025`);
    console.log(`   • Test Environment: ${process.env.PLAYWRIGHT_RUNNING === 'true' ? 'Active' : 'Inactive'}`);
    
    console.log('\n🎯 E2E Test Environment Ready');
    console.log('=' .repeat(50));
    
  } catch (error) {
    console.error('\n❌ Global Setup Failed');
    console.error('=' .repeat(50));
    console.error('Error:', error instanceof Error ? error.message : String(error));
    console.error('\n💡 Auto-start failed. Recovery steps:');
    console.error('   • Free up ports if another process is holding 3000, 8025, or 1025');
    console.error('   • Confirm .env.test exists and sets PLAYWRIGHT_RUNNING=true');
    console.error('   • Install mailpit if missing: brew install mailpit (macOS)');
    console.error('   • As a last resort, start the dev server by hand: pnpx dotenv-cli -e .env.test -- pnpm dev');
    console.error('=' .repeat(50));
    
    // Re-throw to fail the test suite
    throw error;
  }
}

export default globalSetup;
