const testPort = 3019;
// Scheme defaults to https because ChessHurdles' Maia worker needs TLS for cross-origin
// isolation. Upstream serves plain HTTP, so its .env.test sets TEST_BASE_PROTOCOL=http.
// This keeps the file byte-identical across both repos while serving each correctly.
const testProtocol = process.env.TEST_BASE_PROTOCOL ?? 'https';

export const testConstants = {
  defaultUserName: 'Test User',
  defaultUserDomain: 'example.com',
  defaultPassword: 'testPassword123',
  // If changing testPort, also update .env.test (PORT, and the BETTER_AUTH base URL + trusted origins).
  testPort,
  testBaseURL: `${testProtocol}://localhost:${testPort}`,
} as const;