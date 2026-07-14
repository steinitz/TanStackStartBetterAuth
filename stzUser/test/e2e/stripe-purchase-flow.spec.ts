import { test, expect, type Locator } from '@playwright/test'
import { createAuthenticatedUser } from './utils/testAuthUtils'
import { readE2eEnvFromProcess } from './config/e2e-env'
import { creditsSelectors, creditsStrings } from '~stzUser/components/RouteComponents/Credits'

const typeIntoStripeField = async (locator: Locator, value: string) => {
  await locator.click()
  await locator.pressSequentially(value, { delay: 25 })
}

const typeIfVisible = async (locator: Locator, value: string) => {
  const field = locator.first()
  if (await field.isVisible().catch(() => false)) await typeIntoStripeField(field, value)
}

// Step 4 happy path: the embedded Payment Element from an authenticated user through to the shared
// provisioning state. It exercises the REAL Stripe test API (a live PaymentIntent) and Stripe.js in a
// cross-origin iframe, so it needs Stripe test-mode config in `.env.e2e`. With that config present it
// runs under the ordinary `pnpm test:e2e` command, like the rest of the E2E suite.
//
// The balance-reflects-the-credit assertion is intentionally NOT made here: granting is webhook-only,
// and the normal run has no `stripe listen` forwarder (Codex P2). This test proves the UI path and
// that a real intent is created; the end-to-end balance proof lives in the manual Stripe-sandbox gate.
const e2eEnv = readE2eEnvFromProcess()

const missingStripeConfig = [
  e2eEnv.IS_STRIPE_ENABLED ? null : 'IS_STRIPE_ENABLED=true',
  e2eEnv.STRIPE_SECRET_KEY.startsWith('sk_test_') ? null : 'STRIPE_SECRET_KEY=sk_test_...',
  e2eEnv.STRIPE_PUBLISHABLE_KEY.startsWith('pk_test_') ? null : 'STRIPE_PUBLISHABLE_KEY=pk_test_...',
].filter((requirement): requirement is string => Boolean(requirement))

const stripeSkipReason = missingStripeConfig.length
  ? `Stripe E2E skipped: add ${missingStripeConfig.join(', ')} to .env.e2e.`
  : null

if (stripeSkipReason) console.warn(stripeSkipReason)

test.describe('Stripe card purchase (Step 4)', () => {
  test.skip(Boolean(stripeSkipReason), stripeSkipReason ?? undefined)

  test('renders the card UI, creates a real intent, and reaches provisioning', async ({ page }) => {
    await createAuthenticatedUser(page, { name: 'Stripe Tester' })
    await page.goto('/auth/credits')
    await expect(page.locator('h1')).toContainText('Credits', { timeout: 15_000 })

    // ── Stable core: the flag-on card UI renders, and clicking it creates a real PaymentIntent whose
    // clientSecret mounts the Payment Element. This alone proves createStripePaymentIntent end-to-end.
    const payButton = page.getByRole('button', { name: creditsSelectors.payWithCardButton })
    await expect(payButton).toBeVisible({ timeout: 15_000 })
    await payButton.click()

    // The Payment Element renders its fields inside Stripe's private iframe(s).
    const stripeFrame = page.frameLocator('iframe[name^="__privateStripeFrame"]').first()
    const cardNumber = stripeFrame.locator('input[name="number"]')
    await expect(cardNumber).toBeVisible({ timeout: 20_000 })

    // ── Full happy path: fill the standard test card (no SCA) and confirm. Stripe Elements is not a
    // plain form: type like a user so its internal formatting/completeness state advances.
    await typeIntoStripeField(cardNumber, '4242424242424242')
    await typeIntoStripeField(stripeFrame.locator('input[name="expiry"]'), '1234')
    await typeIntoStripeField(stripeFrame.locator('input[name="cvc"]'), '123')
    // Some Payment Element layouts also collect a postal code; fill it only if present.
    const postal = stripeFrame.locator('input[name="postalCode"]')
    await typeIfVisible(postal, '2000')
    // Stripe can expose Link signup fields inside the Payment Element. They are iframe-internal and
    // vary by account/browser experiment, so keep them conditional but fill them when visible.
    await typeIfVisible(stripeFrame.getByRole('textbox', { name: 'Email' }), 'stripe-e2e@example.com')
    await typeIfVisible(stripeFrame.getByRole('textbox', { name: 'Mobile number' }), '0412345678')
    await typeIfVisible(stripeFrame.getByRole('textbox', { name: 'Full name' }), 'Stripe Tester')

    await page.getByRole('button', { name: new RegExp(`^Pay AUD\\$`) }).click()

    // Both completion paths converge here. (granted/balance needs a running webhook — not asserted.)
    await expect(page.getByText(creditsStrings.provisioning)).toBeVisible({ timeout: 30_000 })
  })
})
