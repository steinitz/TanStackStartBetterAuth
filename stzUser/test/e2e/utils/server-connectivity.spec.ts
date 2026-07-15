import { test, expect } from '../utils/console-buffer';
import { testConstants } from '~stzUser/test/constants';

// Playwright supplies the shared built-app E2E topology.
// (Inherits baseURL from playwright.config.ts)

test.describe('Server Connectivity Tests', () => {
  test('should be able to reach the server', async ({ request }) => {
    // Test basic server connectivity
    const response = await request.get('/');
    expect(response.status()).toBe(200);
  });

  test('should be able to reach auth API endpoints', async ({ request }) => {
    // Test auth API endpoint availability
    const response = await request.get('/api/auth');
    // Should return some response (not necessarily 200, but not connection error)
    expect(response.status()).not.toBe(0);
  });

  test('should successfully call the signup API directly', async ({ request }) => {
    const testEmail = `direct-test-${Date.now()}@example.com`;
    const response = await request.post('/api/auth/sign-up/email', {
      data: {
        email: testEmail,
        password: testConstants.defaultPassword,
        name: 'Direct Test User'
      },
      headers: {
        'Content-Type': 'application/json',
        'x-turnstile-token': 'test-token',
      }
    });

    expect(response.status()).toBe(200);
  });
});
