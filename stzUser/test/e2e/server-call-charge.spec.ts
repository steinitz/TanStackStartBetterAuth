import { test, expect } from './utils/console-buffer'
import { createAuthenticatedUser } from './utils/testAuthUtils'
import { readWalletCredits } from './utils/accountMenu'
import { homeLinkName } from '~stzUser/constants'

// The whole chain of server-call-charge.ts in one journey: a signed-in call is charged, the new
// balance rides home with the call's result, and the wallet display takes it with no reload and
// no second call. Written for any app whose home page loads data through a charged server function.
test.describe('Server call charge', () => {
  test('a signed-in call is charged, and the balance keeps up without a reload', async ({ page }) => {
    await createAuthenticatedUser(page, { name: 'Server Call Tester' })

    // The Credits page's own calls are free, so the balance read here is where the story starts.
    await page.goto('/auth/credits')
    const before = await readWalletCredits(page)

    // A client-side navigation, so the home page's loader runs in the browser and its charged call
    // brings the balance home. The wallet status is never refetched on navigation, so a lower
    // balance can only have arrived with that call.
    await page.getByRole('link', { name: homeLinkName }).click()
    await expect.poll(() => readWalletCredits(page), { timeout: 15_000 }).toBeLessThan(before)

    await page.goto('/auth/credits')
    await expect(page.getByText(/Resource consumption: server_call:\w+ \(1 credits\)/).first()).toBeVisible()
  })
})
