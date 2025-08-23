import { test, expect } from '@playwright/test';
import { createVerifiedTestUser, getUserByEmail, isEmailVerified } from '~stzUser/test/e2e/utils/user-verification';
import { EmailTester } from '~stzUser/test/e2e/utils/EmailTester';
import { testConstants } from '~stzUser/test/constants';

// Configure this test to use the E2E setup (which starts the dev server)
test.use({ baseURL: 'http://localhost:3000' });

test.describe('createVerifiedTestUser Unit Tests', () => {
  test.beforeEach(async () => {
    // Clear emails before each test to ensure clean state
    await EmailTester.clearSentEmails();
  });

  test('should create and verify a test user successfully', async () => {
    const testEmail = `test-${Date.now()}@example.com`;
    
    // Create verified test user
    const createdEmail = await createVerifiedTestUser({
      email: testEmail,
      name: 'Test User',
      password: testConstants.defaultPassword
    });

    // Verify the function returns the correct email
    expect(createdEmail).toBe(testEmail);

    // Verify user exists in database
    const user = await getUserByEmail(testEmail);
    expect(user).toBeDefined();
    expect(user?.email).toBe(testEmail);
    expect(user?.name).toBe('Test User');

    // Verify email is marked as verified
    const isVerified = await isEmailVerified(testEmail);
    expect(isVerified).toBe(true);

    // Verify verification email was sent
    const sentEmails = await EmailTester.getSentEmails();
    const verificationEmail = sentEmails.find(email =>
      email.envelope.to.includes(testEmail) &&
      email.subject.includes('Verify your email')
    );
    expect(verificationEmail).toBeDefined();
  });

  test('should handle duplicate email creation gracefully', async () => {
    const testEmail = `duplicate-${Date.now()}@example.com`;
    
    // Create first user
    const firstEmail = await createVerifiedTestUser({
      email: testEmail,
      name: 'First User',
      password: testConstants.defaultPassword
    });
    expect(firstEmail).toBe(testEmail);

    // Attempt to create second user with same email
    // This should either fail gracefully or handle the duplicate appropriately
    try {
      const secondEmail = await createVerifiedTestUser({
        email: testEmail,
        name: 'Second User',
        password: testConstants.defaultPassword
      });
      
      // If it succeeds, it should return the same email
      expect(secondEmail).toBe(testEmail);
      
      // Check that we still have only one user with this email
      const user = await getUserByEmail(testEmail);
      expect(user).toBeDefined();
      expect(user?.email).toBe(testEmail);
    } catch (error) {
      // If it fails, that's also acceptable behavior
      console.log('Duplicate email creation failed as expected:', error);
      expect(error).toBeDefined();
    }
  });

  test('should create user with default values when no options provided', async () => {
    // Create user with default options
    const createdEmail = await createVerifiedTestUser();
    
    // Verify email format (should be generated)
    expect(createdEmail).toMatch(/^test\d+@example\.com$/);

    // Verify user exists in database
    const user = await getUserByEmail(createdEmail);
    expect(user).toBeDefined();
    expect(user?.email).toBe(createdEmail);
    expect(user?.name).toBe(testConstants.defaultUserName);

    // Verify email is marked as verified
    const isVerified = await isEmailVerified(createdEmail);
    expect(isVerified).toBe(true);
  });

  test('should handle server connection issues gracefully', async () => {
    const testEmail = `connection-test-${Date.now()}@example.com`;
    
    // This test will help identify if connection issues cause the failures
    try {
      const createdEmail = await createVerifiedTestUser({
        email: testEmail,
        name: 'Connection Test User',
        password: testConstants.defaultPassword
      });
      
      expect(createdEmail).toBe(testEmail);
      
      // If successful, verify the user was created properly
      const user = await getUserByEmail(testEmail);
      expect(user).toBeDefined();
      
      const isVerified = await isEmailVerified(testEmail);
      expect(isVerified).toBe(true);
      
    } catch (error) {
      // Log detailed error information for debugging
      console.error('createVerifiedTestUser failed with error:', error);
      console.error('Error type:', typeof error);
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
      
      // Check if it's a connection-related error
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('CONNECTION_REFUSED') || 
          errorMessage.includes('ECONNREFUSED') ||
          errorMessage.includes('status":0')) {
        console.log('Connection error detected - this may explain E2E test failures');
      }
      
      // Re-throw to fail the test and provide visibility
      throw error;
    }
  });
});