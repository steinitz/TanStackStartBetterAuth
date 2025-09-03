import { test, expect } from '@playwright/test'
import { createVerifiedTestUser, getUserByEmail } from './utils/user-verification'
import { testConstants } from '~stzUser/test/constants'
import { signInUser, waitForElementVisible } from './utils/testActions'
import { profileTestIds, profileStructuralSelectors } from '~stzUser/components/RouteComponents/Profile/Profile'
// import { passwordValidation, currentPasswordValidation } from '~stzUser/lib/password-validation'
// import { clientEnv } from '~stzUser/lib/env'
// import * as v from 'valibot'

/**
 * E2E tests for password change functionality
 * 
 * These tests use Playwright to test the password change flow through the UI.
 * Each test creates a fresh verified user and tests the actual password change process.
 * 
 * Test coverage:
 * - Successful password change through UI
 * - Authentication with new password after change
 */

// Configure test-specific options
test.use({
  // headless: false,
  launchOptions: {
    slowMo: 1000,
  },
})

test.describe('Password Change Flow', () => {
  let testUserEmail: string
  const originalPassword = testConstants.defaultPassword
  const newPassword = 'NewSecurePassword123!'
  // const invalidPassword = 'wrong'

  test.beforeEach(async () => {
    // Create a fresh verified user for each test
    testUserEmail = await createVerifiedTestUser({
      password: testConstants.defaultPassword
    })
  })

  test.skip('should display password change form fields', async ({ page }) => {
    // Sign in with the test user using the utility function
    await signInUser(page, testUserEmail, testConstants.defaultPassword)
    
    // Navigate to profile page with correct auth route
    await page.goto('/auth/profile')
    
    // Wait for the profile form using abstracted exponential backoff utility
    const profileForm = page.locator('[data-testid="profile-form"]');
    await waitForElementVisible(profileForm, {
      errorMessage: 'Profile form not found after maximum attempts'
    });
    
    // Verify password input fields are present
    const currentPasswordInput = page.locator(profileStructuralSelectors.currentPasswordInput)
    const newPasswordInput = page.locator(profileStructuralSelectors.newPasswordInput)
    
    await expect(currentPasswordInput).toBeVisible()
    await expect(newPasswordInput).toBeVisible()
    
    // Test basic interaction - fill in the fields
    await currentPasswordInput.fill(testConstants.defaultPassword)
    await newPasswordInput.fill(newPassword)
    
    // Verify the values were entered
    await expect(currentPasswordInput).toHaveValue(testConstants.defaultPassword)
    await expect(newPasswordInput).toHaveValue(newPassword)
    
    console.log('✅ Password form fields are visible and interactive')
  })

  test('should successfully change password with correct current password', async ({ page }) => {
    // Sign in with the test user using the utility function
    await signInUser(page, testUserEmail, originalPassword)
    
    // Navigate to profile page
    await page.goto('/auth/profile')
    
    // Wait for the profile form using abstracted exponential backoff utility
    const profileForm = page.locator('[data-testid="profile-form"]');
    await waitForElementVisible(profileForm, {
      errorMessage: 'Profile form not found after maximum attempts'
    });
    
    // Fill in the password change form
    const currentPasswordInput = page.locator(profileStructuralSelectors.currentPasswordInput)
    const newPasswordInput = page.locator(profileStructuralSelectors.newPasswordInput)
    
    await expect(currentPasswordInput).toBeVisible()
    await expect(newPasswordInput).toBeVisible()
    
    await currentPasswordInput.fill(originalPassword)
    await newPasswordInput.fill(newPassword)
    
    // Set up alert handler to dismiss the success alert
    page.on('dialog', async dialog => {
      console.log(`Dialog appeared: ${dialog.type()} - ${dialog.message()}`)
      await dialog.accept()
    })
    
    // Submit the form
    const submitButton = page.locator('button[type="submit"]')
    await expect(submitButton).toBeEnabled()
    await submitButton.click()
    
    // Wait for form submission to complete and verify success
    // The form should clear the password fields on successful change
    await expect(currentPasswordInput).toHaveValue('', { timeout: 10000 })
    await expect(newPasswordInput).toHaveValue('', { timeout: 10000 })
    
    console.log('✅ Password change form submitted and fields cleared')
    
    // Sign out to test the new password
    await page.goto('/auth/signout')
    // Verify we can sign in with the new password
    await signInUser(page, testUserEmail, newPassword)
    
    console.log('✅ Successfully signed in with new password')
    
    // Verify old password no longer works by attempting to change password again with old password
    await page.goto('/auth/profile')
    await waitForElementVisible(profileForm, {
      errorMessage: 'Profile form not found after maximum attempts'
    });
    
    // Try to use old password - this should fail
    await currentPasswordInput.fill(originalPassword) // This should be wrong now
    await newPasswordInput.fill('AnotherNewPassword123!')
    await submitButton.click()
    
    // The form should NOT clear fields if there's an error, or we should see an error message
    // Wait a moment for any error processing
    await page.waitForTimeout(2000)
    
    // Either the fields should still have values (indicating error) or we should see an error message
    const currentPasswordValue = await currentPasswordInput.inputValue()
    const hasError = currentPasswordValue !== '' // Fields not cleared indicates error
    expect(hasError).toBe(true)
    console.log('✅ Old password correctly rejected')
  })

  // TODO: Consider finishing these draft unit tests or convert them to E2E tests, as done for the above
  // it('should fail to change password with incorrect current password', async () => {
  //   // Attempt password change with wrong current password
  //   const { data, error } = await changePassword({
  //     currentPassword: invalidPassword,
  //     newPassword: newPassword,
  //     revokeOtherSessions: true
  //   })
  //
  //   // Verify password change failed
  //   expect(error).toBeTruthy()
  //   expect(data).toBeFalsy()
  //   expect(error?.message).toContain('password') // Error should mention password issue
  //
  //   // Verify original password still works
  //   const signInResult = await signIn.email({
  //     email: testUserEmail,
  //     password: originalPassword
  //   })
  //
  //   expect(signInResult.error).toBeFalsy()
  //   expect(signInResult.data?.user?.email).toBe(testUserEmail)
  // }, 10000)
  //
  // it('should fail to change password with invalid new password', async () => {
  //   const tooShortPassword = '123'
  //
  //   // Attempt password change with invalid new password
  //   const { data, error } = await changePassword({
  //     currentPassword: originalPassword,
  //     newPassword: tooShortPassword,
  //     revokeOtherSessions: true
  //   })
  //
  //   // Verify password change failed due to validation
  //   expect(error).toBeTruthy()
  //   expect(data).toBeFalsy()
  //
  //   // Verify original password still works
  //   const signInResult = await signIn.email({
  //     email: testUserEmail,
  //     password: originalPassword
  //   })
  //
  //   expect(signInResult.error).toBeFalsy()
  //   expect(signInResult.data?.user?.email).toBe(testUserEmail)
  // }, 10000)
  //
  // it('should handle network errors gracefully', async () => {
  //   // This test verifies error handling structure
  //   // In a real scenario, you might temporarily disable network or use a bad endpoint
  //   
  //   try {
  //     const { data, error } = await changePassword({
  //       currentPassword: originalPassword,
  //       newPassword: newPassword,
  //       revokeOtherSessions: true
  //     })
  //
  //     // Either success or proper error structure
  //     if (error) {
  //       expect(error).toHaveProperty('message')
  //       expect(typeof error.message).toBe('string')
  //     } else {
  //       expect(data).toBeTruthy()
  //     }
  //   } catch (networkError: any) {
  //     // Network errors should be caught and handled
  //     expect(networkError).toBeInstanceOf(Error)
  //     expect(networkError.message).toBeDefined()
  //   }
  // }, 10000)
  //
  // describe('Authentication Flow Integration', () => {
  //   it('should maintain session after password change', async () => {
  //     // Change password
  //     const { data: changeData, error: changeError } = await changePassword({
  //       currentPassword: originalPassword,
  //       newPassword: newPassword,
  //       revokeOtherSessions: false // Keep current session
  //     })
  //
  //     expect(changeError).toBeFalsy()
  //     expect(changeData).toBeTruthy()
  //
  //     // Verify new password works for sign in
  //     const { data: signInData, error: signInError } = await signIn.email({
  //       email: testUserEmail,
  //       password: newPassword
  //     })
  //
  //     expect(signInError).toBeFalsy()
  //     expect(signInData?.user?.email).toBe(testUserEmail)
  //
  //     // Verify old password no longer works
  //     const { data: oldSignInData, error: oldSignInError } = await signIn.email({
  //       email: testUserEmail,
  //       password: originalPassword
  //     })
  //
  //     expect(oldSignInError).toBeTruthy()
  //     expect(oldSignInData?.user).toBeFalsy()
  //   }, 15000)
  //
  //   it('should revoke other sessions when requested', async () => {
  //     // This test verifies the revokeOtherSessions functionality
  //     const { data, error } = await changePassword({
  //       currentPassword: originalPassword,
  //       newPassword: newPassword,
  //       revokeOtherSessions: true
  //     })
  //
  //     expect(error).toBeFalsy()
  //     expect(data).toBeTruthy()
  //
  //     // Verify new password works
  //     const signInResult = await signIn.email({
  //       email: testUserEmail,
  //       password: newPassword
  //     })
  //
  //     expect(signInResult.error).toBeFalsy()
  //     expect(signInResult.data?.user?.email).toBe(testUserEmail)
  //   }, 10000)
  // })
})