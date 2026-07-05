import { defineConfig, devices } from '@playwright/test';
import { config as loadDotenv } from 'dotenv';
import { testConstants } from 'stzUser/test/constants';

// Load .env.test so that test workers inherit PLAYWRIGHT_RUNNING, DATABASE_URL,
// BETTER_AUTH_SECRET, etc.  The auth instance imported directly in testAuthUtils
// must use the same database and secret as the dev server.
loadDotenv({ path: '.env.test' });

const requiredE2eEnvVars = [
  'PLAYWRIGHT_RUNNING',
  'BETTER_AUTH_SECRET',
  'BETTER_AUTH_URL',
  'BETTER_AUTH_BASE_URL',
  'BETTER_AUTH_TRUSTED_ORIGINS',
  'DATABASE_URL',
  'PORT',
  'TEST_BASE_PROTOCOL',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USERNAME',
  'SMTP_PASSWORD',
  'SMTP_FROM_ADDRESS',
  'SMTP_FROM_NAME',
  'SMTP_REPLY_TO_ADDRESS',
  'SMTP_REPLY_TO_NAME',
  'COMPANY_NAME',
  'APP_NAME',
  'SUPPORT_EMAIL_ADDRESS',
  'TURNSTILE_SITE_KEY',
  'TURNSTILE_SECRET_KEY',
  'CREDIT_PRICE_AUD',
  'MIN_CREDITS_PURCHASE',
  'DAILY_GRANT_CREDITS',
  'WELCOME_GRANT_CREDITS',
  'DEFAULT_CREDITS_PURCHASE',
  'BANK_TRANSFER_BSB',
  'BANK_TRANSFER_ACC',
  'IS_STRIPE_ENABLED',
] as const;

function validateE2eEnv() {
  const missing = requiredE2eEnvVars.filter((name) => !process.env[name]);
  const wrongValues = process.env.PLAYWRIGHT_RUNNING === 'true'
    ? []
    : ['PLAYWRIGHT_RUNNING=true'];

  if (missing.length || wrongValues.length) {
    const details = [
      missing.length ? `Missing: ${missing.join(', ')}` : null,
      wrongValues.length ? `Expected: ${wrongValues.join(', ')}` : null,
    ].filter(Boolean).join('\n');

    throw new Error(
      `Invalid E2E environment. .env.test is the source of truth for Playwright runs.\n${details}\n` +
      'Copy .env.test.example to .env.test and fill in the required local values.'
    );
  }
}

validateE2eEnv();

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
  /* Global teardown to clean up after tests */
  globalTeardown: './global-teardown.ts',
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
    baseURL: testConstants.testBaseURL,

    /* Ignore HTTPS errors for dev server's self-signed certificates */
    ignoreHTTPSErrors: true,

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
