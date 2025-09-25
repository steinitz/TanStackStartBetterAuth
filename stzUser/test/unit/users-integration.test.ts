import {describe, it, expect} from 'vitest'
import {queryUsersWithKysely} from '~stzUser/lib/users'
import {auth} from '~stzUser/lib/auth'
import {testConstants} from '~stzUser/test/constants'
import {T} from 'vitest/dist/chunks/reporters.d.BFLkQcL6.js'

describe('queryUsersWithKysely basic test', () => {
  it('should query users from database and return proper structure', async () => {
    // Query all users using the function we want to test
    const users = await queryUsersWithKysely()

    // Log the number of users found
    console.log(`Found ${users.length} users in database`)

    // Verify basic array structure
    expect(Array.isArray(users)).toBe(true)

    // If we have users, verify the structure
    if (users.length > 0) {
      const user = users[0]

      // Verify basic user properties exist
      expect(user.id).toBeDefined()
      expect(user.email).toBeDefined()

      // Verify date conversion worked
      expect(user.createdAt).toBeInstanceOf(Date)
      expect(user.updatedAt).toBeInstanceOf(Date)

      // Verify role fields were added
      expect(user).toHaveProperty('role')
      expect(user).toHaveProperty('banned')
      expect(user).toHaveProperty('banReason')
      expect(user).toHaveProperty('banExpires')
    } else {
      console.log('No users found in database - test is still valid but limited')
    }
  })

  it('should create a test user with auth.api.signUpEmail and verify it exists', async () => {
    try {
      // Generate a unique test email
      const testEmail = `test-user-${Date.now()}@${testConstants.defaultUserDomain}`
      const password = testConstants.defaultPassword
      const name = `${testConstants.defaultUserName} ${Date.now()}`

      const newUser = await auth.api.createUser({
        body: {
          email: testEmail, // required
          password: password, // required
          name: "James Smith", // required
          role: "user", // optional role assignment, can be a string or array of strings
          data: {customField: "customValue"}, // optional custom data
        },
      });

      // Query users to verify the new user exists
      const users = await queryUsersWithKysely()
      const createdUser = users.find(user => user.email === testEmail)

      // Verify the user was created
      expect(createdUser).toBeDefined()
      expect(createdUser?.email).toBe(testEmail)

      // Clean up - delete the test user if possible
      if (createdUser?.id) {
        try {
          await auth.api.removeUser({
            body: {
              userId: createdUser.id
            }
          })
          console.log('Test user deleted successfully')
        } catch (deleteError) {
          console.error('Failed to delete test user:', deleteError)
        }
      }
    } catch (error) {
      console.error('Error in auth.api.signUpEmail test:', error)
      throw error
    }
  })
})