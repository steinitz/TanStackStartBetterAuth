import { test, expect } from './utils/console-buffer'
import { createAuthenticatedUser } from './utils/testAuthUtils'
import { readE2eEnvFromProcess } from './config/e2e-env'

const e2eEnv = readE2eEnvFromProcess()

test.describe('Wallet Visibility and Reactivity', () => {
  test('admin credit adjustments and self-ledger purge react without a reload', async ({ page }) => {
    test.setTimeout(60_000)

    const {
      email: uniqueEmail,
      userId,
    } = await createAuthenticatedUser(page, { role: 'admin' })
    await page.goto('/')

    await expect(page.locator('p', { hasText: uniqueEmail })).toBeVisible({
      timeout: 15_000,
    })

    const walletBadge = page.locator('span', { hasText: /Credits/ })
    await expect(walletBadge).toBeVisible({ timeout: 15_000 })
    await expect(walletBadge).toContainText(
      `${e2eEnv.DAILY_GRANT_CREDITS} Credits`,
    )

    await page.goto('/admin')
    await expect(page.getByRole('heading', {
      name: 'Credit administration',
    })).toBeVisible({ timeout: 15_000 })

    await page.getByLabel('Please enter a user ID').fill(userId)
    await page.getByRole('button', { name: 'Look up user' }).click()
    await expect(page.getByText(`User ID: ${userId}`)).toBeVisible()
    await expect(page.getByText(/Credit balance:/)).toContainText(
      `${e2eEnv.DAILY_GRANT_CREDITS} credits`,
    )

    await page.locator('#admin-add-amount').fill('10')
    await page.locator('#admin-add-description').fill('E2E add adjustment')
    await page.getByRole('button', { name: 'Add credits' }).click()
    await expect(page.getByText(/Credits added:/)).toContainText(
      `${e2eEnv.DAILY_GRANT_CREDITS} → ${e2eEnv.DAILY_GRANT_CREDITS + 10}`,
    )
    await expect(walletBadge).toContainText(
      `${e2eEnv.DAILY_GRANT_CREDITS + 10} Credits`,
    )

    await page.locator('#admin-remove-amount').fill('1')
    await page.locator('#admin-remove-description').fill('E2E remove adjustment')
    await page.getByRole('button', { name: 'Remove credits' }).click()
    await expect(page.getByText(/Credits removed:/)).toContainText(
      `${e2eEnv.DAILY_GRANT_CREDITS + 10} → ${e2eEnv.DAILY_GRANT_CREDITS + 9}`,
    )
    await expect(walletBadge).toContainText(
      `${e2eEnv.DAILY_GRANT_CREDITS + 9} Credits`,
    )

    await expect(page.getByText(/Purge all/)).toContainText(
      '0 Stripe purchase rows',
    )
    await page.getByLabel(/Type.*purge my ledger.*to confirm/).fill(
      'purge my ledger',
    )
    await page.getByRole('button', { name: 'Purge ledger' }).click()
    await expect(page.getByText(/Cached balance is zero/)).toBeVisible()
    await expect(walletBadge).toContainText('0 Credits')

    // A later ordinary wallet read legitimately creates a fresh daily grant because purge
    // removed today's evidence. The old adjustment rows stay gone.
    await page.goto('/auth/credits')
    await expect(walletBadge).toContainText(
      `${e2eEnv.DAILY_GRANT_CREDITS} Credits`,
    )
    await expect(page.getByText('Daily credit grant')).toBeVisible()
    await expect(page.getByText('E2E add adjustment')).toHaveCount(0)
    await expect(page.getByText('E2E remove adjustment')).toHaveCount(0)
  })
})
