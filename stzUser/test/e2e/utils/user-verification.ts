import { appDatabase } from '~stzUser/lib/database';
import { newTestUser } from './EmailTester';
import { testConstants } from '~stzUser/test/constants';

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
 * Create a verified test user directly in the database
 * Bypasses the signup flow for test independence
 * @param options - Optional user data overrides
 * @returns The created user's email address
 */
export async function createVerifiedTestUser(options?: {
  name?: string;
  email?: string;
}): Promise<string> {
  const email = options?.email || newTestUser();
  const name = options?.name || testConstants.defaultUserName;
  
  try {
    // Insert user directly into database with emailVerified = 1
    const stmt = appDatabase.prepare(`
      INSERT INTO user (id, name, email, emailVerified, createdAt, updatedAt)
      VALUES (?, ?, ?, 1, datetime('now'), datetime('now'))
    `);
    
    const userId = crypto.randomUUID();
    stmt.run(userId, name, email);
    
    return email;
  } catch (error) {
    console.error('Error creating verified test user:', error);
    throw error;
  }
}