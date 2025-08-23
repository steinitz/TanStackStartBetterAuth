import { test, expect } from '@playwright/test';
import { testConstants } from '~stzUser/test/constants';

// Configure this test to use the E2E setup (which starts the dev server)
test.use({ baseURL: 'http://localhost:3000' });

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

  test('should be able to make a signup API call directly', async ({ request }) => {
    // Test the signup endpoint directly with HTTP request
    const testEmail = `direct-test-${Date.now()}@example.com`;
    
    try {
      const response = await request.post('/api/auth/sign-up/email', {
        data: {
          email: testEmail,
          password: 'TestPassword123!',
          name: 'Direct Test User'
        },
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Direct signup response status:', response.status());
      console.log('Direct signup response headers:', await response.headers());
      
      if (response.status() !== 200) {
        const responseText = await response.text();
        console.log('Direct signup response body:', responseText);
      }
      
      // The signup might fail for various reasons (user exists, validation, etc.)
      // but we should get a proper HTTP response, not a connection error
      expect(response.status()).not.toBe(0);
      expect(response.status()).toBeGreaterThan(0);
      
    } catch (error) {
      console.error('Direct signup request failed:', error);
      throw error;
    }
  });
});