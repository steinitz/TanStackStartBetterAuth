import { defineConfig, devices } from '@playwright/test';

// Email handling uses isPlaywrightRunning() detection instead of NODE_ENV=test

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: '..',
  /* Only target *.spec.ts files for Playwright E2E tests */
  testMatch: '**/*.spec.ts',
  /* Global setup to verify server is running */
  globalSetup: './global-setup.ts',
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
    ['list']
  ],
  /* Output directory for test results */
  outputDir: '../.output/test-results',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3000',

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

  /* Manual server management - start 'pnpm dev' separately for full server log visibility */
});