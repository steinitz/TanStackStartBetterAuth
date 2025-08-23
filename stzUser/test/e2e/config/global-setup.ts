import { FullConfig } from '@playwright/test';
import { ensureServerRunning, ensureMailpitRunning } from 'stzUser/test/e2e/utils/server-check';

// Global setup that automatically starts dev server and Mailpit if not running
async function globalSetup(config: FullConfig) {
  console.log('🔍 BETTER_AUTH_TELEMETRY_DEBUG:', process.env.BETTER_AUTH_TELEMETRY_DEBUG);
  
  // Start Mailpit first (needed for email testing)
  await ensureMailpitRunning();
  
  // Then start the dev server
  const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:3000';
  await ensureServerRunning(baseURL);
}

export default globalSetup;
