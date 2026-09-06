import { test, expect } from './utils/console-buffer'
import { createAuthenticatedUser } from './utils/testAuthUtils'
import { openAccountMenu } from './utils/accountMenu'

/**
 * Sign out is the model for every other awaited auth action, so this spec pins the two
 * properties the others will copy: the indicator is on a control that survives the click,
 * and one click starts one request.
 */
test.describe('Sign out says it is happening', () => {
  test('the spinner is on the account trigger, not on the row that closes', async ({ page }) => {
    test.setTimeout(60_000)

    await createAuthenticatedUser(page)
    await page.goto('/')

    // Hold the request open so the pending state has a window rather than a race.
    //
    // The interception has to be at the browser, and that is not a stylistic choice: Better
    // Auth's client captures `globalThis.fetch` when `auth-client.ts` is first imported, so
    // a patch installed from inside the page afterwards never sees the call. Confirmed by
    // trying it — the sign-out completed untouched.
    let release!: () => void
    const held = new Promise<void>((resolve) => { release = resolve })
    await page.route('**/api/auth/sign-out', async (route) => {
      await held
      await route.continue()
    })

    await openAccountMenu(page)

    const signOutLink = page.getByRole('link', { name: 'Sign Out' })
    await signOutLink.click()

    // The claim is on the trigger. Scoped to <summary> deliberately — a spinner anywhere
    // else on the page would satisfy a bare locator and miss the entire point of the design.
    const accountTrigger = page.locator('summary[title="Account"]')
    await expect(accountTrigger.locator('[data-busy-spinner]')).toBeVisible({ timeout: 15_000 })

    // And this is why it cannot go on the row: the panel carries closeOnPanelClick, so the
    // control that was pressed is already gone while the work it started is still running.
    await expect(signOutLink).toBeHidden()

    // Still spinning after a beat — it indicates the wait rather than flashing at its end.
    await page.waitForTimeout(500)
    await expect(accountTrigger.locator('[data-busy-spinner]')).toBeVisible()

    release()
    await expect(page).toHaveURL(/\/auth\/signin/, { timeout: 15_000 })
  })

  // There is deliberately no repeat-click test here, and the reason is worth keeping.
  // The panel carries closeOnPanelClick, so after the first click the Sign Out link is
  // hidden — and Playwright waits for visibility even with `force`, so a second click can
  // only time out. The guard it would be testing is real, because two clicks landing in one
  // tick both run before React re-renders the closed panel; that case simply cannot be
  // driven through the browser one click at a time. It is covered where it is reachable,
  // in user-block.test.tsx, which dispatches three clicks synchronously and watches the
  // count. When this control is copied to the six auth actions whose buttons stay on screen,
  // those DO want an end-to-end repeat-click case.
})
