import type { FullConfig } from '@playwright/test';

type TestEnvResponse = {
  isPlaywrightRunning?: boolean;
  nodeEnv?: string;
};

function getBaseURL(config: FullConfig): string {
  const baseURL = config.projects[0]?.use?.baseURL;
  if (typeof baseURL !== 'string') {
    throw new Error('E2E readiness failed: Playwright baseURL is not configured');
  }
  return baseURL;
}

/** Verify the Playwright-owned built app without creating or deleting test data. */
async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = getBaseURL(config);
  const testEnvResponse = await fetch(`${baseURL}/api/test-env`);

  if (!testEnvResponse.ok) {
    throw new Error('E2E readiness failed: /api/test-env did not return 200');
  }

  const testEnv = await testEnvResponse.json() as TestEnvResponse;
  if (!testEnv.isPlaywrightRunning) {
    throw new Error('E2E readiness failed: server is not running under Playwright');
  }
  // If a non-authoritative dev E2E topology is ever added, this assertion must
  // become topology-aware because the dev server correctly reports development.
  if (testEnv.nodeEnv !== 'production') {
    throw new Error('E2E readiness failed: built server is not in production mode');
  }

  const sessionResponse = await fetch(`${baseURL}/api/auth/get-session`);
  if (!sessionResponse.ok) {
    throw new Error('E2E readiness failed: Better Auth or its database is unavailable');
  }
}

export default globalSetup;
