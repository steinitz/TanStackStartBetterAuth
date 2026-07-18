import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'dotenv';

const e2eFileName = '.env.e2e';
const e2eExampleFileName = '.env.e2e.example';
const forbiddenLocalFileName = '.env.e2e.local';

export const sharedRequiredE2eKeys = [
  'PLAYWRIGHT_RUNNING',
  'FIRST_USER_IS_ADMIN',
  'BETTER_AUTH_SECRET',
  'BETTER_AUTH_URL',
  'BETTER_AUTH_ADDITIONAL_TRUSTED_ORIGINS',
  'DATABASE_URL',
  'PORT',
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
  'COPYRIGHT_START_YEAR',
] as const;

const positiveNumericKeys = [
  'CREDIT_PRICE_AUD',
  'MIN_CREDITS_PURCHASE',
  'DAILY_GRANT_CREDITS',
  'WELCOME_GRANT_CREDITS',
  'DEFAULT_CREDITS_PURCHASE',
] as const;

type LoadE2eEnvOptions = {
  rootDir: string;
  additionalRequiredKeys?: readonly string[];
};

export type LoadedE2eEnv = {
  baseURL: string;
  env: Record<string, string>;
};

export type E2eProcessEnv = {
  APP_NAME: string;
  BETTER_AUTH_URL: string;
  COPYRIGHT_START_YEAR: string;
  CREDIT_PRICE_AUD: number;
  MIN_CREDITS_PURCHASE: number;
  DAILY_GRANT_CREDITS: number;
  WELCOME_GRANT_CREDITS: number;
  DEFAULT_CREDITS_PURCHASE: number;
  FIRST_USER_IS_ADMIN: false;
  IS_STRIPE_ENABLED: boolean;
  STRIPE_PUBLISHABLE_KEY: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
};

function invalidE2eEnvironment(issues: readonly string[]): Error {
  return new Error(
    `Invalid E2E environment. ${e2eFileName} is the source of truth for Playwright runs.\n` +
    `${issues.map((issue) => `- ${issue}`).join('\n')}\n` +
    `Copy ${e2eExampleFileName} to ${e2eFileName} and fill in the required local values.`,
  );
}

function readParsedEnv(filePath: string, displayName: string): Record<string, string> {
  if (!existsSync(filePath)) {
    throw invalidE2eEnvironment([`Missing file: ${displayName}`]);
  }

  return parse(readFileSync(filePath));
}

function validateUrlKey(env: Record<string, string>, key: string, issues: string[]): void {
  try {
    new URL(env[key]);
  } catch {
    issues.push(`${key} must be a valid URL`);
  }
}

function validateContract(env: Record<string, string>): string[] {
  const issues: string[] = [];
  const expectedBaseURL = 'http://localhost:3019';

  if (env.PLAYWRIGHT_RUNNING !== 'true') {
    issues.push('PLAYWRIGHT_RUNNING must be true');
  }

  if (env.FIRST_USER_IS_ADMIN !== 'false') {
    issues.push('FIRST_USER_IS_ADMIN must be false');
  }

  if (env.PORT !== '3019') {
    issues.push('PORT must be 3019');
  }

  validateUrlKey(env, 'BETTER_AUTH_URL', issues);
  if (env.BETTER_AUTH_URL !== expectedBaseURL) {
    issues.push('BETTER_AUTH_URL must be the E2E HTTP origin');
  }

  const trustedOrigins = env.BETTER_AUTH_ADDITIONAL_TRUSTED_ORIGINS
    .split(',')
    .map((origin) => origin.trim());
  if (!trustedOrigins.includes(expectedBaseURL)) {
    issues.push('BETTER_AUTH_ADDITIONAL_TRUSTED_ORIGINS must contain BETTER_AUTH_URL');
  }

  validateUrlKey(env, 'DATABASE_URL', issues);
  if (env.DATABASE_URL !== 'http://127.0.0.1:8081') {
    issues.push('DATABASE_URL must point to the Playwright-owned Turso server');
  }

  const smtpPort = Number(env.SMTP_PORT);
  if (!Number.isInteger(smtpPort) || smtpPort <= 0 || smtpPort > 65_535) {
    issues.push('SMTP_PORT must be a valid TCP port');
  }

  if (env.IS_STRIPE_ENABLED !== 'true' && env.IS_STRIPE_ENABLED !== 'false') {
    issues.push('IS_STRIPE_ENABLED must be true or false');
  }

  for (const key of positiveNumericKeys) {
    const value = Number(env[key]);
    if (!Number.isFinite(value) || value <= 0) {
      issues.push(`${key} must be a finite positive number`);
    }
  }

  if (!/^\d{4}$/.test(env.COPYRIGHT_START_YEAR)) {
    issues.push('COPYRIGHT_START_YEAR must be a four-digit year');
  }

  return issues;
}

/**
 * Loads and seals the E2E contract before Playwright creates workers or web servers.
 * This is the only E2E helper that reads files or mutates process.env.
 */
export function loadE2eEnv({
  rootDir,
  additionalRequiredKeys = [],
}: LoadE2eEnvOptions): LoadedE2eEnv {
  const examplePath = resolve(rootDir, e2eExampleFileName);
  const envPath = resolve(rootDir, e2eFileName);
  const localPath = resolve(rootDir, forbiddenLocalFileName);

  if (existsSync(localPath)) {
    throw invalidE2eEnvironment([
      `${forbiddenLocalFileName} is forbidden; put E2E values in ${e2eFileName}`,
    ]);
  }

  const exampleEnv = readParsedEnv(examplePath, e2eExampleFileName);
  const fileEnv = readParsedEnv(envPath, e2eFileName);
  const managedKeys = Object.keys(exampleEnv);
  const managedKeySet = new Set(managedKeys);
  const requiredKeys = [...sharedRequiredE2eKeys, ...additionalRequiredKeys];
  const issues: string[] = [];

  if (managedKeySet.has('NODE_ENV')) {
    issues.push(`${e2eExampleFileName} must not declare NODE_ENV`);
  }

  const undocumentedKeys = Object.keys(fileEnv).filter((key) => !managedKeySet.has(key));
  if (undocumentedKeys.length > 0) {
    issues.push(`Undocumented keys in ${e2eFileName}: ${undocumentedKeys.sort().join(', ')}`);
  }

  const undocumentedRequiredKeys = requiredKeys.filter((key) => !managedKeySet.has(key));
  if (undocumentedRequiredKeys.length > 0) {
    issues.push(
      `Required keys missing from ${e2eExampleFileName}: ${[...new Set(undocumentedRequiredKeys)].sort().join(', ')}`,
    );
  }

  const missingRequiredKeys = requiredKeys.filter((key) => !fileEnv[key]?.trim());
  if (missingRequiredKeys.length > 0) {
    issues.push(`Missing required keys: ${[...new Set(missingRequiredKeys)].sort().join(', ')}`);
  }

  if (issues.length > 0) {
    throw invalidE2eEnvironment(issues);
  }

  const sanitizedEnv = Object.fromEntries(
    managedKeys.map((key) => [key, fileEnv[key] ?? '']),
  );
  const contractIssues = validateContract(sanitizedEnv);
  if (contractIssues.length > 0) {
    throw invalidE2eEnvironment(contractIssues);
  }

  for (const [key, value] of Object.entries(sanitizedEnv)) {
    process.env[key] = value;
  }
  delete process.env.NODE_ENV;

  return {
    baseURL: sanitizedEnv.BETTER_AUTH_URL,
    env: sanitizedEnv,
  };
}

function readRequiredProcessValue(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw invalidE2eEnvironment([`Missing sanitized process key: ${key}`]);
  }
  return value;
}

function readPositiveProcessNumber(key: string): number {
  const value = Number(readRequiredProcessValue(key));
  if (!Number.isFinite(value) || value <= 0) {
    throw invalidE2eEnvironment([`${key} must be a finite positive number`]);
  }
  return value;
}

/**
 * Decodes the already-established worker environment without reading files or
 * mutating process.env.
 */
export function readE2eEnvFromProcess(): E2eProcessEnv {
  const firstUserAdminFlag = readRequiredProcessValue('FIRST_USER_IS_ADMIN');
  if (firstUserAdminFlag !== 'false') {
    throw invalidE2eEnvironment(['FIRST_USER_IS_ADMIN must be false']);
  }

  const stripeFlag = readRequiredProcessValue('IS_STRIPE_ENABLED');
  if (stripeFlag !== 'true' && stripeFlag !== 'false') {
    throw invalidE2eEnvironment(['IS_STRIPE_ENABLED must be true or false']);
  }

  return {
    APP_NAME: readRequiredProcessValue('APP_NAME'),
    BETTER_AUTH_URL: readRequiredProcessValue('BETTER_AUTH_URL'),
    COPYRIGHT_START_YEAR: readRequiredProcessValue('COPYRIGHT_START_YEAR'),
    CREDIT_PRICE_AUD: readPositiveProcessNumber('CREDIT_PRICE_AUD'),
    MIN_CREDITS_PURCHASE: readPositiveProcessNumber('MIN_CREDITS_PURCHASE'),
    DAILY_GRANT_CREDITS: readPositiveProcessNumber('DAILY_GRANT_CREDITS'),
    WELCOME_GRANT_CREDITS: readPositiveProcessNumber('WELCOME_GRANT_CREDITS'),
    DEFAULT_CREDITS_PURCHASE: readPositiveProcessNumber('DEFAULT_CREDITS_PURCHASE'),
    FIRST_USER_IS_ADMIN: false,
    IS_STRIPE_ENABLED: stripeFlag === 'true',
    STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY ?? '',
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? '',
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ?? '',
  };
}
