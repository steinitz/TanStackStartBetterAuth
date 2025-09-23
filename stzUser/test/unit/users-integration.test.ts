import { describe, it, expect } from 'vitest'
import { queryUsersWithKysely } from '../../lib/users'

describe('queryUsersWithKysely basic test', () => {
  it('should query users from database and return at least one user', async () => {
    // Query all users using the function we want to test
    const users = await queryUsersWithKysely()
    
    // Verify users array is not empty (assuming there's at least one user in the database)
    expect(users.length).toBeGreaterThan(0)
    
    // If we have users, verify the first user has expected structure
    if (users.length > 0) {
      const user = users[0]
      
      // Verify basic user properties exist
      expect(user.id).toBeDefined()
      expect(user.email).toBeDefined()
      
      // Verify date conversion worked
      expect(user.createdAt).toBeInstanceOf(Date)
      expect(user.updatedAt).toBeInstanceOf(Date)
      
      // Verify role fields were added
      expect(user.role).toBeNull()
      expect(user.banned).toBeNull()
      expect(user.banReason).toBeNull()
      expect(user.banExpires).toBeNull()
    }
  })
})