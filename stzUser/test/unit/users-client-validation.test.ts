import { describe, expect, it } from 'vitest'
import * as v from 'valibot'
import { UpdateEmailVerificationStatusSchema } from '~stzUser/lib/users-client'

describe('email-verification mutation input', () => {
  it('accepts the intended shape and trims the user ID', () => {
    expect(v.parse(UpdateEmailVerificationStatusSchema, {
      userId: ' target ',
      emailVerified: true,
    })).toEqual({
      userId: 'target',
      emailVerified: true,
    })
  })

  it.each([
    {},
    { userId: '', emailVerified: true },
    { userId: 'target', emailVerified: 'true' },
    { userId: 'target', emailVerified: true, extra: 'discarded' },
  ])('rejects malformed input %#', (input) => {
    expect(v.safeParse(UpdateEmailVerificationStatusSchema, input).success).toBe(false)
  })
})
