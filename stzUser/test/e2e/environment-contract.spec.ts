import { expect, test } from '@playwright/test';
import { readE2eEnvFromProcess } from './config/e2e-env';

test('E2E environment contract reaches the worker and browser', async ({ page, request }) => {
  const expected = readE2eEnvFromProcess();
  const serverOnlyKeys = [
    'ADMIN_USER_IDS',
    'BETTER_AUTH_SECRET',
    'DATABASE_URL',
    'FIRST_USER_IS_ADMIN',
    'SMTP_PASSWORD',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'TURSO_AUTH_TOKEN',
    'TURNSTILE_SECRET_KEY',
  ];

  expect(expected.APP_NAME).toBeTruthy();
  expect(expected.FIRST_USER_IS_ADMIN).toBe(false);
  expect(typeof expected.IS_STRIPE_ENABLED).toBe('boolean');
  expect(expected.DAILY_GRANT_CREDITS).toBeGreaterThan(0);
  expect(expected.COPYRIGHT_START_YEAR).toMatch(/^\d{4}$/);

  await page.goto('/');
  const browserEnv = await page.evaluate((forbiddenKeys) => {
    const injectedEnv = window.__ENV as Record<string, unknown> | undefined;
    return {
      APP_NAME: window.__ENV?.APP_NAME,
      IS_STRIPE_ENABLED: window.__ENV?.IS_STRIPE_ENABLED,
      DAILY_GRANT_CREDITS: window.__ENV?.DAILY_GRANT_CREDITS,
      COPYRIGHT_START_YEAR: window.__ENV?.COPYRIGHT_START_YEAR,
      injectedServerOnlyKeys: forbiddenKeys.filter((key) => key in (injectedEnv ?? {})),
    };
  }, serverOnlyKeys);

  expect(browserEnv).toEqual({
    APP_NAME: expected.APP_NAME,
    IS_STRIPE_ENABLED: expected.IS_STRIPE_ENABLED,
    DAILY_GRANT_CREDITS: expected.DAILY_GRANT_CREDITS,
    COPYRIGHT_START_YEAR: expected.COPYRIGHT_START_YEAR,
    injectedServerOnlyKeys: [],
  });

  const testEnvResponse = await request.get('/api/test-env');
  expect(testEnvResponse.status()).toBe(200);
  const testEnv = await testEnvResponse.json();
  expect(testEnv.isPlaywrightRunning).toBe(true);
  // If a non-authoritative dev E2E topology is ever added, this assertion must
  // become topology-aware because the dev server correctly reports development.
  expect(testEnv.nodeEnv).toBe('production');
});
