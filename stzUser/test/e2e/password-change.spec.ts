import { test, expect } from '@playwright/test'
import { createAuthenticatedUser } from './utils/testAuthUtils'
import { testConstants } from '~stzUser/test/constants'
import { signInUser, waitForElementVisible } from './utils/testActions'
import { profileTestIds, profileStructuralSelectors } from '~stzUser/components/RouteComponents/Profile/Profile'

/**
 * E2E tests for password change functionality
 *
 * These tests use Playwright to test the password change flow through the UI.
 * Each test creates a fresh verified user (with password credentials) via
 * testAuthUtils and tests the actual password change process.
 *
 * Test coverage:
 * - Successful password change through UI
 * - Authentication with new password after change
 */

test.describe('Password Change Flow', () => {
  const originalPassword = testConstants.defaultPassword
  const newPassword = 'NewSecurePassword123!'

  test.skip('should display password change form fields', async ({ page }) => {
    const { email: testUserEmail } = await createAuthenticatedUser(page, {
      password: originalPassword
    })

    // Navigate to profile page (already authenticated via cookies)
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
    const { email: testUserEmail } = await createAuthenticatedUser(page, {
      password: originalPassword
    })

    // Navigate to profile page (already authenticated via cookies)
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
})
