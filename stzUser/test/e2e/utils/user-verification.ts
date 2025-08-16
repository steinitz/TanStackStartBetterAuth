import { appDatabase } from '~stzUser/lib/database';
import { newTestUser } from './EmailTester';
import { testConstants } from '~stzUser/test/constants';
import { signUp } from '~stzUser/lib/auth-client';

/**
 * Utility functions for checking user verification status in E2E tests
 */

/**
 * Check if a user's email is verified by email address
 * @param email - The user's email address
 * @returns boolean - true if email is verified, false otherwise
 */
export async function isEmailVerified(email: string): Promise<boolean> {
  try {
    const stmt = appDatabase.prepare('SELECT emailVerified FROM user WHERE email = ?');
    const result = stmt.get(email) as { emailVerified: number } | undefined;
    
    // SQLite stores boolean as 0/1, convert to boolean
    return result ? Boolean(result.emailVerified) : false;
  } catch (error) {
    console.error('Error checking email verification status:', error);
    return false;
  }
}

/**
 * Check if a user's email is verified by user ID
 * @param userId - The user's ID
 * @returns boolean - true if email is verified, false otherwise
 */
export async function isEmailVerifiedById(userId: string): Promise<boolean> {
  try {
    const stmt = appDatabase.prepare('SELECT emailVerified FROM user WHERE id = ?');
    const result = stmt.get(userId) as { emailVerified: number } | undefined;
    
    // SQLite stores boolean as 0/1, convert to boolean
    return result ? Boolean(result.emailVerified) : false;
  } catch (error) {
    console.error('Error checking email verification status:', error);
    return false;
  }
}

/**
 * Get user data by email address
 * @param email - The user's email address
 * @returns User data or null if not found
 */
export async function getUserByEmail(email: string): Promise<{
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
} | null> {
  try {
    const stmt = appDatabase.prepare('SELECT * FROM user WHERE email = ?');
    const result = stmt.get(email) as any;
    
    if (!result) return null;
    
    return {
      ...result,
      emailVerified: Boolean(result.emailVerified)
    };
  } catch (error) {
    console.error('Error getting user by email:', error);
    return null;
  }
}

/**
 * Create a verified test user using the signup flow
 * Uses signUp.email followed by manual email verification
 * @param options - Optional user data overrides
 * @returns The created user's email address
 */
export async function createVerifiedTestUser(options?: {
  name?: string;
  email?: string;
  password?: string;
}): Promise<string> {
  const email = options?.email || newTestUser();
  const name = options?.name || testConstants.defaultUserName;
  const password = options?.password || testConstants.defaultPassword;
  
  try {
    // Create user using Better Auth signup
    const { data, error } = await signUp.email({
      email,
      name,
      password,
    });
    
    if (error) {
      console.error('Error creating test user via signup:', error);
      console.error('Error type:', typeof error);
      console.error('Error keys:', Object.keys(error));
      throw new Error(`Signup failed: ${JSON.stringify(error)}`);
    }
    
    if (!data?.user?.id) {
      throw new Error('Signup succeeded but no user ID returned');
    }
    
    // Manually verify the email in the database
    const stmt = appDatabase.prepare(`
      UPDATE user SET emailVerified = 1 WHERE id = ?
    `);
    
    const result = stmt.run(data.user.id);
    
    if (result.changes === 0) {
      throw new Error('Failed to verify email - user not found in database');
    }
    
    return email;
  } catch (error) {
    console.error('Error creating verified test user:', error);
    throw error;
  }
}