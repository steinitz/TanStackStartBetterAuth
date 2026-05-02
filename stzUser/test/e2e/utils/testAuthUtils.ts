import { auth } from '~stzUser/lib/auth'
import type { Page } from '@playwright/test'
import { testConstants } from '~stzUser/test/constants'

/**
 * Shared overrides accepted by both helpers.
 */
interface UserOverrides {
  email?: string
  name?: string
  role?: string
  password?: string
}

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
 * Creates a verified user in the DB and, if a password is provided, also creates
 * the credential account entry (password hash in the `account` table).
 *
 * Returns the saved user's email and ID. Does NOT inject cookies or touch
 * the Playwright page — use this when the test needs a user to exist but
 * does not want to be authenticated (e.g. password-reset-flow).
 */
export async function createUserWithCredentials(
  overrides?: UserOverrides
): Promise<{ email: string; userId: string }> {
  const ctx = await auth.$context
  const t = (ctx as any).test

  const user = t.createUser({
    email: overrides?.email ?? `test-${Date.now()}@${testConstants.defaultUserDomain}`,
    name:  overrides?.name  ?? testConstants.defaultUserName,
    emailVerified: true,
    role: overrides?.role ?? 'user',
  })

  const savedUser = await t.saveUser(user)

  // If password provided, hash it and create the credential account entry.
  // This mirrors what auth.api.signUpEmail() does internally via
  // ctx.internalAdapter.linkAccount().
  if (overrides?.password) {
    const hash = await ctx.password.hash(overrides.password)
    await ctx.internalAdapter.linkAccount({
      userId: savedUser.id,
      providerId: 'credential',
      accountId: savedUser.id,
      password: hash,
    })
  }

  return { email: savedUser.email, userId: savedUser.id }
}

/**
 * Creates a verified user and injects their session cookies into the Playwright
 * page context. Uses better-auth's testUtils plugin — no signup UI, no email,
 * no Mailpit. The page is authenticated before the first goto() call.
 *
 * If a password is provided, also creates the credential account entry so the
 * user can sign in via email/password, change password, or trigger a reset.
 *
 * Cookie domain and secure flags are mapped to match the test server so that
 * Playwright's addCookies() accepts them without silent failure.
 */
export async function createAuthenticatedUser(
  page: Page,
  overrides?: UserOverrides
): Promise<{ email: string; userId: string }> {
  const { email, userId } = await createUserWithCredentials(overrides)

  const t = await getTestHelpers()
  const { cookies } = await t.login({ userId })

  // Map cookies to match the test server's domain and protocol.
  // Playwright's addCookies() silently drops cookies with mismatched domains,
  // and sameSite: 'None' requires secure: true (broken on HTTP).
  const baseURL = process.env.BETTER_AUTH_BASE_URL ?? testConstants.testBaseURL
  const isHttps = baseURL.startsWith('https')

  const mappedCookies = cookies.map(c => ({
    ...c,
    domain: 'localhost',
    secure: isHttps,
    sameSite: (c.sameSite === 'None' && !isHttps ? 'Lax' : (c.sameSite ?? 'Lax')) as
      'Lax' | 'Strict' | 'None',
  }))

  await page.context().addCookies(mappedCookies)

  return { email, userId }
}
