const testPort = 3019;
// Playwright establishes BETTER_AUTH_URL before E2E workers import this module.
// Vitest consumers also import the user/password constants without an E2E env,
// so retain the upstream HTTP test origin as a harmless fallback.
const testBaseURL = process.env.BETTER_AUTH_URL ?? `http://localhost:${testPort}`;

export const testConstants = {
  defaultUserName: 'Test User',
  defaultUserDomain: 'example.com',
  defaultPassword: 'testPassword123',
  // If changing testPort, also update .env.e2e (PORT, and the Better Auth URL + trusted origins).
  testPort,
  testBaseURL,
} as const;
