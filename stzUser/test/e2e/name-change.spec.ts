import { test, expect } from './utils/console-buffer'
import { createAuthenticatedUser } from './utils/testAuthUtils'
import { testConstants } from '~stzUser/test/constants'
import { waitForElementVisible } from './utils/testActions'
import { profileStructuralSelectors } from '~stzUser/components/RouteComponents/Profile/Profile'

/**
 * E2E for changing the user's name from the profile.
 *
 * The reload is the whole test. Without it this would pass on an input that simply
 * kept what was typed into it — the field is uncontrolled, so the DOM holds the new
 * value whether or not anything was saved. After a reload the value can only have
 * come back from the session, and so from the database.
 *
 * The starting assertion earns its place for the same reason: a field that arrived
 * empty, or already showing the new name, would satisfy the ending assertion while
 * proving nothing.
 */
test.describe('Name Change Flow', () => {
  const newName = 'Renamed Person'

  test('changes the name and it survives a reload', async ({ page }) => {
    await createAuthenticatedUser(page, { password: testConstants.defaultPassword })

    await page.goto('/auth/profile')
    const profileForm = page.locator('[data-testid="profile-form"]')
    await waitForElementVisible(profileForm, {
      errorMessage: 'Profile form not found after maximum attempts'
    })

    const nameInput = page.locator(profileStructuralSelectors.nameInput)
    await expect(nameInput).toHaveValue(testConstants.defaultUserName)

    await nameInput.fill(newName)

    page.on('dialog', async dialog => {
      await dialog.accept()
    })

    await page.locator('button[type="submit"]').click()

    await page.reload()
    await waitForElementVisible(profileForm, {
      errorMessage: 'Profile form not found after reload'
    })
    await expect(page.locator(profileStructuralSelectors.nameInput)).toHaveValue(newName, {
      timeout: 10000,
    })
  })
})
