/**
 * Reaching the signed-in user's email and credit balance, both of which live behind the
 * account menu rather than in the header.
 *
 * `collapseUserBlock` in userBlock.tsx is permanently on: the header carries a user icon,
 * and the email, the wallet badge, Profile and Sign Out are inside a Disclosure panel. A
 * spec that asserts on them straight off the page finds the elements and fails on
 * visibility, which is what happened to three specs for weeks after the collapse landed.
 *
 * Two things about the panel shape the helpers below, and both are worth knowing before
 * writing a new spec against it:
 *
 *   - While open it renders a dismiss layer over the whole viewport. That layer absorbs
 *     the next click anywhere outside the panel — deliberately, so that dismissing never
 *     also acts on the page beneath. In a test it means an open panel silently eats the
 *     next `click()`, so every read here closes up after itself.
 *   - A document navigation closes it, a client-side one does not. Re-open after any
 *     `goto` or `reload`.
 */
import { expect, type Page, type Locator } from '@playwright/test'

/** The <details> the account menu lives in — scoped, since a page may hold others. */
function accountMenu(page: Page): Locator {
  return page.locator('details.stz-disclosure:has(> summary[title="Account"])')
}

/**
 * The always-visible control. Found by its accessible name rather than its tooltip, so
 * that removing the name breaks a test instead of quietly regressing the header for
 * anyone navigating it by screen reader.
 */
export function accountMenuControl(page: Page): Locator {
  return page.getByLabel('Account')
}

/** The credit readout inside the panel. Only visible while the menu is open. */
export function walletBadge(page: Page): Locator {
  return page.locator('span', { hasText: /Credits/ })
}

async function isAccountMenuOpen(page: Page): Promise<boolean> {
  return accountMenu(page).evaluate((element) => (element as HTMLDetailsElement).open)
}

export async function openAccountMenu(page: Page): Promise<void> {
  await expect(accountMenuControl(page)).toBeVisible({ timeout: 15_000 })
  // Idempotent: the control is a toggle, so clicking an already-open menu would shut it.
  if (await isAccountMenuOpen(page)) return
  await accountMenuControl(page).click()
  await expect(walletBadge(page)).toBeVisible({ timeout: 15_000 })
}

/**
 * Leaves the page as it was found. Clicking the control is what closes it — the panel's
 * own click-to-dismiss does not apply to the summary, which sits outside the panel.
 */
export async function closeAccountMenu(page: Page): Promise<void> {
  if (!(await isAccountMenuOpen(page))) return
  await accountMenuControl(page).click()
  await expect(walletBadge(page)).toBeHidden({ timeout: 15_000 })
}

/**
 * The common case: open, read the balance, close. `expected` is matched as a substring,
 * so callers pass the whole phrase they mean — "5 Credits", not "5".
 */
export async function expectWalletCredits(page: Page, expected: string): Promise<void> {
  await openAccountMenu(page)
  await expect(walletBadge(page)).toContainText(expected, { timeout: 15_000 })
  await closeAccountMenu(page)
}
