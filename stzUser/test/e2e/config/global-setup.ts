import { FullConfig } from '@playwright/test';
import { ensureServerRunning } from 'stzUser/test/e2e/utils/server-check';

// Global setup that automatically starts dev server if not running
async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:3000';
  await ensureServerRunning(baseURL);
}

export default globalSetup;
