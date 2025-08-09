import { FullConfig } from '@playwright/test';
import { verifyServerRunning } from '../../utils/server-check';

async function globalSetup(config: FullConfig) {
  const baseURL = config.webServer?.url || 'http://localhost:3000';
  await verifyServerRunning(baseURL);
}

export default globalSetup;