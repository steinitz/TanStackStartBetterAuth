import { auth } from '~stzUser/lib/auth'
import type { Page } from '@playwright/test'
import { testConstants } from '~stzUser/test/constants'

/**
 * Returns the testUtils test helpers from the auth context.
 * Requires PLAYWRIGHT_RUNNING=true (which adds the testUtils plugin to auth).
 * Typed via any — the plugin augments @better-auth/core but the conditional
 * spread in auth.ts means TypeScript can't infer its presence.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getTestHelpers(): Promise<any> {
  const ctx = await auth.$context
  return (ctx as any).test
}

/**
 * Creates a verified user and injects their session cookies into the Playwright
 * page context. Uses better-auth's testUtils plugin — no signup UI, no email,
 * no Mailpit. The page is authenticated before the first goto() call.
 *
 * Cookie domain and secure flags are mapped to match the test server so that
 * Playwright's addCookies() accepts them without silent failure.
 */
export async function createAuthenticatedUser(
  page: Page,
  overrides?: { email?: string; name?: string; role?: string }
): Promise<{ email: string; userId: string }> {
  const t = await getTestHelpers()

  const user = t.createUser({
    email: overrides?.email ?? `test-${Date.now()}@${testConstants.defaultUserDomain}`,
    name:  overrides?.name  ?? testConstants.defaultUserName,
    emailVerified: true,
    role: overrides?.role ?? 'user',
  })

  const savedUser = await t.saveUser(user)

  // Pilot logging: confirm createUser id is preserved through saveUser
  // (safe to remove once the pilot run confirms they match)
  console.log(`🔑 testUtils user ids — created: ${user.id}  saved: ${savedUser.id}`)

  const { cookies } = await t.login({ userId: savedUser.id })

  // Map cookies to match the test server's domain and protocol.
  // Playwright's addCookies() silently drops cookies with mismatched domains,
  // and sameSite: 'None' requires secure: true (broken on HTTP).
  const baseURL = process.env.BETTER_AUTH_BASE_URL ?? 'http://localhost:3000'
  const isHttps = baseURL.startsWith('https')

  const mappedCookies = cookies.map(c => ({
    ...c,
    domain: 'localhost',
    secure: isHttps,
    sameSite: (c.sameSite === 'None' && !isHttps ? 'Lax' : (c.sameSite ?? 'Lax')) as
      'Lax' | 'Strict' | 'None',
  }))

  await page.context().addCookies(mappedCookies)

  return { email: savedUser.email, userId: savedUser.id }
}
