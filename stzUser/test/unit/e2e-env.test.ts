import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadE2eEnv } from '../e2e/config/e2e-env';

const validEnv: Record<string, string> = {
  PLAYWRIGHT_RUNNING: 'true',
  FIRST_USER_IS_ADMIN: 'false',
  BETTER_AUTH_SECRET: 'local-test-secret',
  BETTER_AUTH_URL: 'http://localhost:3019',
  BETTER_AUTH_ADDITIONAL_TRUSTED_ORIGINS: 'http://localhost:3019',
  DATABASE_URL: 'http://127.0.0.1:8081',
  TURSO_AUTH_TOKEN: '',
  PORT: '3019',
  COMPATIBILITY_DATE: '2025-08-10',
  SMTP_HOST: '127.0.0.1',
  SMTP_PORT: '1025',
  SMTP_USERNAME: 'test',
  SMTP_PASSWORD: 'test',
  SMTP_FROM_ADDRESS: 'test@example.com',
  SMTP_FROM_NAME: 'Test App',
  SMTP_REPLY_TO_ADDRESS: 'test@example.com',
  SMTP_REPLY_TO_NAME: 'Test App',
  COMPANY_NAME: 'STZDev',
  APP_NAME: 'E2E Test App',
  SUPPORT_EMAIL_ADDRESS: 'support@example.com',
  CONTACT_EMAIL: '',
  CONTACT_ADDRESS: '',
  REFUND_POLICY_URL: '/legal/refunds',
  COPYRIGHT_START_YEAR: '2025',
  SUPPORT_LINK_TEXT: 'Contact our Support Team',
  SUPPORT_LINK_URL: '/contact',
  PRODUCTION_HOST: '',
  TURNSTILE_SITE_KEY: 'test-site-key',
  TURNSTILE_SECRET_KEY: 'test-secret-key',
  CREDIT_PRICE_AUD: '1.5',
  MIN_CREDITS_PURCHASE: '10',
  DAILY_GRANT_CREDITS: '100',
  WELCOME_GRANT_CREDITS: '500',
  DEFAULT_CREDITS_PURCHASE: '5000',
  BANK_TRANSFER_BSB: '000-000',
  BANK_TRANSFER_ACC: '00000000',
  IS_STRIPE_ENABLED: 'false',
  STRIPE_PUBLISHABLE_KEY: '',
  STRIPE_SECRET_KEY: '',
  STRIPE_WEBHOOK_SECRET: '',
  STRIPE_MIN_CENTS: '',
};

function serializeEnv(env: Record<string, string>): string {
  return `${Object.entries(env).map(([key, value]) => `${key}=${value}`).join('\n')}\n`;
}

describe.sequential('E2E environment contract loader', () => {
  let rootDir: string;
  let originalProcessEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    rootDir = mkdtempSync(join(tmpdir(), 'e2e-env-'));
    originalProcessEnv = { ...process.env };
  });

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (!(key in originalProcessEnv)) delete process.env[key];
    }
    Object.assign(process.env, originalProcessEnv);
    rmSync(rootDir, { recursive: true, force: true });
  });

  function writeFixture(
    realEnv: Record<string, string> = validEnv,
    exampleEnv: Record<string, string> = validEnv,
  ): void {
    writeFileSync(join(rootDir, '.env.e2e.example'), serializeEnv(exampleEnv));
    writeFileSync(join(rootDir, '.env.e2e'), serializeEnv(realEnv));
  }

  it('lets the file beat a conflicting inherited value', () => {
    writeFixture();
    process.env.APP_NAME = 'Inherited shell app';

    const loaded = loadE2eEnv({ rootDir });

    expect(loaded.env.APP_NAME).toBe(validEnv.APP_NAME);
    expect(process.env.APP_NAME).toBe(validEnv.APP_NAME);
  });

  it('clears an inherited value for an omitted optional managed key', () => {
    const { STRIPE_SECRET_KEY: _omitted, ...withoutOptionalStripeSecret } = validEnv;
    writeFixture(withoutOptionalStripeSecret);
    process.env.STRIPE_SECRET_KEY = 'inherited-secret-that-must-not-leak';

    const loaded = loadE2eEnv({ rootDir });

    expect(loaded.env.STRIPE_SECRET_KEY).toBe('');
    expect(process.env.STRIPE_SECRET_KEY).toBe('');
  });

  it('removes inherited NODE_ENV after establishing the contract', () => {
    writeFixture();
    process.env.NODE_ENV = 'development';

    loadE2eEnv({ rootDir });

    expect(process.env.NODE_ENV).toBeUndefined();
  });

  it('fails by key name when a required key is missing', () => {
    const { APP_NAME: _omitted, ...withoutAppName } = validEnv;
    writeFixture(withoutAppName);

    expect(() => loadE2eEnv({ rootDir })).toThrow(/Missing required keys: APP_NAME/);
  });

  it('rejects undocumented keys in the real file', () => {
    writeFixture({ ...validEnv, UNDOCUMENTED_SECRET: 'must-not-be-read' });

    expect(() => loadE2eEnv({ rootDir })).toThrow(
      /Undocumented keys in \.env\.e2e: UNDOCUMENTED_SECRET/,
    );
  });

  it('enforces consumer-owned additional required keys', () => {
    writeFixture(validEnv, { ...validEnv, CONSUMER_FEATURE_FLAG: '' });

    expect(() => loadE2eEnv({
      rootDir,
      additionalRequiredKeys: ['CONSUMER_FEATURE_FLAG'],
    })).toThrow(/Missing required keys: CONSUMER_FEATURE_FLAG/);
  });

  it('never includes a secret value in diagnostics', () => {
    const secret = 'super-secret-do-not-print';
    const { APP_NAME: _omitted, ...withoutAppName } = validEnv;
    writeFixture({ ...withoutAppName, BETTER_AUTH_SECRET: secret });

    let message = '';
    try {
      loadE2eEnv({ rootDir });
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }

    expect(message).toContain('APP_NAME');
    expect(message).not.toContain(secret);
  });

  it.each([
    ['URL', { BETTER_AUTH_URL: 'not-a-url' }, 'BETTER_AUTH_URL'],
    ['port', { PORT: '3018' }, 'PORT'],
    ['first-user flag', { FIRST_USER_IS_ADMIN: 'true' }, 'FIRST_USER_IS_ADMIN'],
    ['boolean', { IS_STRIPE_ENABLED: 'sometimes' }, 'IS_STRIPE_ENABLED'],
  ])('rejects an invalid %s relationship before startup', (_label, override, key) => {
    writeFixture({ ...validEnv, ...override });

    expect(() => loadE2eEnv({ rootDir })).toThrow(new RegExp(key));
  });

  it('rejects the forbidden local override tier', () => {
    writeFixture();
    writeFileSync(join(rootDir, '.env.e2e.local'), 'APP_NAME=hidden-override\n');

    expect(() => loadE2eEnv({ rootDir })).toThrow(/\.env\.e2e\.local is forbidden/);
  });
});
