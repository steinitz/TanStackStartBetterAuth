import { test, expect } from '~stzUser/test/e2e/utils/console-buffer'
import { APP_STARTED_FLAG } from '~stzUser/lib/entry-load-guard'

test.use({ ignoreHTTPSErrors: true })

/**
 * A tab from before a deploy asks for an entry file the deploy removed, and stayed blank: Steve's
 * stale tab, 2026-11-03. The cause is faked as it happens, the entry file answering 404 once, as it
 * does until the reload brings a page naming the new one. See planning doc pd-3e5lmh.
 */
test("a page whose entry file is gone reloads itself and starts", async ({ page }) => {
  let asked = 0
  await page.route('**/assets/main-*.js', async (route) => {
    asked += 1
    if (asked === 1) await route.fulfill({ status: 404, body: '' })
    else await route.continue()
  })

  await page.goto('/')

  await expect.poll(() => asked, { timeout: 20_000 }).toBeGreaterThan(1)
  await expect.poll(
    () => page.evaluate((flag) => (window as unknown as Record<string, unknown>)[flag] === true, APP_STARTED_FLAG),
    { timeout: 20_000 },
  ).toBe(true)
})
