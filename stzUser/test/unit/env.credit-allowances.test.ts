import { describe, expect, it } from 'vitest'
import { parsePositiveWholeNumberEnv } from '~stzUser/lib/env'

describe('credit allowance environment parsing', () => {
  it.each([
    ['DAILY_GRANT_CREDITS', undefined, 100],
    ['DAILY_GRANT_CREDITS', '25', 25],
    ['WELCOME_GRANT_CREDITS', undefined, 500],
    ['WELCOME_GRANT_CREDITS', '750', 750],
  ] as const)('parses %s = %s', (name, rawValue, expected) => {
    expect(parsePositiveWholeNumberEnv(name, rawValue, expected)).toBe(expected)
  })

  it.each([
    ['0'],
    ['-1'],
    ['1.5'],
    ['NaN'],
    ['Infinity'],
    ['-Infinity'],
  ])('rejects an invalid daily allowance of %s', (rawValue) => {
    expect(() =>
      parsePositiveWholeNumberEnv('DAILY_GRANT_CREDITS', rawValue, 100),
    ).toThrow(/finite positive whole number/)
  })

  it.each([
    ['0'],
    ['-1'],
    ['1.5'],
    ['NaN'],
    ['Infinity'],
    ['-Infinity'],
  ])('rejects an invalid welcome allowance of %s', (rawValue) => {
    expect(() =>
      parsePositiveWholeNumberEnv('WELCOME_GRANT_CREDITS', rawValue, 500),
    ).toThrow(/finite positive whole number/)
  })
})
