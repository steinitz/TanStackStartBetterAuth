import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';
import { loadE2eEnv } from './e2e-env';
import { assertE2eToolsInstalled, createE2eWebServers } from './e2e-web-servers';

const rootDir = fileURLToPath(new URL('../../../../', import.meta.url));
const { baseURL, env } = loadE2eEnv({ rootDir });

assertE2eToolsInstalled();

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: '..',
  /* Only target *.spec.ts files for Playwright E2E tests */
  testMatch: '**/*.spec.ts',
  /* Verify the built app, Better Auth, and database without mutating them. */
  globalSetup: './global-setup.ts',
  /* Playwright owns and tears down the Turso and app process groups. */
  webServer: createE2eWebServers({ rootDir, env }),
  /* Disable parallel execution to avoid race conditions with shared resources */
  fullyParallel: false,
  /* Run tests serially with single worker */
  workers: 1,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { outputFolder: '../.output/playwright-report', open: 'never' }],
    ['list'],
  ],
  /* Output directory for test results */
  outputDir: '../.output/test-results',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // Temporarily disabled for faster test development
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],
});
