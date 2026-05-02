export const testConstants = {
  defaultUserName: 'Test User',
  defaultUserDomain: 'example.com',
  defaultPassword: 'testPassword123',
  // If changing testPort, also update .env.test (PORT, BETTER_AUTH_URL, BETTER_AUTH_BASE_URL, BETTER_AUTH_TRUSTED_ORIGINS)
  testPort: 3019,
  testBaseURL: 'https://localhost:3019',
} as const;