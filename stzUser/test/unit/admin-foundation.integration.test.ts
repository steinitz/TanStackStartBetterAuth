/**
 * @vitest-environment node
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { rmSync } from 'node:fs'

const { sendEmail, verifyTurnstileToken } = vi.hoisted(() => {
  process.env.DATABASE_URL = 'file:stzUser/test/admin-foundation.db'
  process.env.TURSO_AUTH_TOKEN = ''
  process.env.BETTER_AUTH_SECRET = 'admin-foundation-test-secret'
  process.env.BETTER_AUTH_URL = 'http://localhost:3000'
  process.env.PLAYWRIGHT_RUNNING = 'true'
  process.env.FIRST_USER_IS_ADMIN = 'true'
  process.env.ADMIN_USER_IDS = ' environment-admin ,, environment-admin '

  return {
    sendEmail: vi.fn(),
    verifyTurnstileToken: vi.fn().mockResolvedValue(true),
  }
})

vi.mock('~stzUser/lib/mail-utilities', () => ({
  sendEmail,
  transportOptions: {},
}))

vi.mock('~stzUser/lib/turnstile.server', () => ({
  verifyTurnstileToken,
}))

import { auth } from '~stzUser/lib/auth'
import { db, libsqlClient } from '~stzUser/lib/database'
import { ensureAdditionalTables } from '~stzUser/lib/migrations'

async function testHelpers(): Promise<any> {
  return (await auth.$context as any).test
}

async function clearAuthData() {
  for (const table of ['session', 'account', 'verification', 'transactions', 'user']) {
    await libsqlClient.execute(`DELETE FROM "${table}"`)
  }
}

async function userRole(userId: string) {
  return (await db
    .selectFrom('user')
    .select('role')
    .where('id', '=', userId)
    .executeTakeFirstOrThrow()).role
}

async function sessionCount(userId: string) {
  const result = await libsqlClient.execute({
    sql: 'SELECT COUNT(*) AS count FROM "session" WHERE "userId" = ?',
    args: [userId],
  })
  return Number(result.rows[0]?.count ?? 0)
}

describe.sequential('effective admin foundation integration', () => {
  beforeAll(async () => {
    await ensureAdditionalTables()
  })

  beforeEach(async () => {
    vi.clearAllMocks()
    verifyTurnstileToken.mockResolvedValue(true)
    await clearAuthData()
  })

  afterAll(async () => {
    await db.destroy()
    libsqlClient.close()
    for (const suffix of ['', '-shm', '-wal']) {
      rmSync(`stzUser/test/admin-foundation.db${suffix}`, { force: true })
    }
  })

  it('persists the first real signup role before verification can issue a session', async () => {
    const result = await auth.api.signUpEmail({
      body: {
        email: 'first-signup@example.com',
        password: 'correct-horse-battery-staple',
        name: 'First Signup',
      },
      headers: new Headers({ 'x-turnstile-token': 'test-token' }),
    })

    expect(result.user).toBeTruthy()
    const userId = result.user!.id
    expect(await userRole(userId)).toBe('admin')
    expect(await sessionCount(userId)).toBe(0)

    const emailText = sendEmail.mock.calls[0]?.[0]?.data?.text as string | undefined
    const verificationUrl = emailText?.match(/https?:\/\/\S+/)?.[0]
    expect(verificationUrl).toBeTruthy()
    const token = new URL(verificationUrl!).searchParams.get('token')
    expect(token).toBeTruthy()

    await auth.api.verifyEmail({ query: { token: token! } })

    expect(await sessionCount(userId)).toBe(1)
    expect(await userRole(userId)).toBe('admin')
  })

  it('promotes a testUtils-created first user before login', async () => {
    const test = await testHelpers()
    const saved = await test.saveUser(test.createUser({
      email: 'test-utils-first@example.com',
      role: 'user',
    }))

    expect(await userRole(saved.id)).toBe('admin')
    expect(await sessionCount(saved.id)).toBe(0)

    const login = await test.login({ userId: saved.id })

    expect(await sessionCount(saved.id)).toBe(1)
    expect(await userRole(saved.id)).toBe('admin')
    await expect(auth.api.getSession({ headers: login.headers })).resolves.toMatchObject({
      user: {
        id: saved.id,
        role: 'admin',
      },
    })
  })

  it('does not promote later users', async () => {
    const test = await testHelpers()
    const first = await test.saveUser(test.createUser({
      email: 'first@example.com',
      role: 'user',
    }))
    const second = await test.saveUser(test.createUser({
      email: 'second@example.com',
      role: 'user',
    }))

    expect(await userRole(first.id)).toBe('admin')
    expect(await userRole(second.id)).toBe('user')
  })

  it('lets stored-role and environment admins use guarded endpoints, but rejects a regular user', async () => {
    const test = await testHelpers()
    const storedAdmin = await test.saveUser(test.createUser({
      email: 'stored-admin@example.com',
      role: 'user',
    }))
    const environmentAdmin = await test.saveUser(test.createUser({
      id: 'environment-admin',
      email: 'environment-admin@example.com',
      role: 'user',
    }))
    const regularUser = await test.saveUser(test.createUser({
      email: 'regular@example.com',
      role: 'user',
    }))
    const target = await test.saveUser(test.createUser({
      email: 'target@example.com',
      role: 'user',
      emailVerified: false,
    }))

    const storedSession = await test.login({ userId: storedAdmin.id })
    const environmentSession = await test.login({ userId: environmentAdmin.id })
    const regularSession = await test.login({ userId: regularUser.id })

    await expect((auth.api as any).adminUpdateUser({
      body: {
        userId: target.id,
        data: { emailVerified: true },
      },
      headers: storedSession.headers,
    })).resolves.toMatchObject({ id: target.id, emailVerified: true })

    await expect((auth.api as any).adminUpdateUser({
      body: {
        userId: target.id,
        data: { emailVerified: false },
      },
      headers: environmentSession.headers,
    })).resolves.toMatchObject({ id: target.id, emailVerified: false })

    await expect((auth.api as any).adminUpdateUser({
      body: {
        userId: target.id,
        data: { emailVerified: true },
      },
      headers: regularSession.headers,
    })).rejects.toThrow()
  })
})
