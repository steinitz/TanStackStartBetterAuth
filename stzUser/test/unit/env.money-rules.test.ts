/**
 * @vitest-environment node
 *
 * The money-value rules and the signal built from them. This file replaces the older
 * env.credit-allowances tests, which asserted that an absent daily or welcome grant received a
 * legacy default — the opposite of the rule now, since a money value is never invented.
 *
 * These drive findEnvProblems through process.env rather than checking a rule table of their own,
 * so they exercise the same declarations the purchase guard reads. A copy of the rules here could
 * agree with itself while disagreeing with the code.
 */
import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import {
  findEnvProblems,
  findEnvValueProblem,
  isPositiveFiniteNumber,
  isPositiveWholeNumber,
} from '~stzUser/lib/env'

const SOUND_MONEY_ENV: Record<string, string> = {
  CREDIT_PRICE_AUD: '0.01',
  MIN_CREDITS_PURCHASE: '500',
  DEFAULT_CREDITS_PURCHASE: '500',
  DAILY_GRANT_CREDITS: '5',
  WELCOME_GRANT_CREDITS: '30',
}

describe('money environment rules', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    originalEnv = { ...process.env }
    Object.assign(process.env, SOUND_MONEY_ENV)
  })

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) delete process.env[key]
    }
    Object.assign(process.env, originalEnv)
  })

  describe('findEnvValueProblem', () => {
    const wholeRule = {
      key: 'DAILY_GRANT_CREDITS',
      isValid: isPositiveWholeNumber,
      requirement: 'a whole number above zero',
    }

    it('accepts a good value', () => {
      expect(findEnvValueProblem(wholeRule, '5')).toBeNull()
    })

    // Unset and blank are named rather than described. Both would fail the positivity rule anyway
    // — Number('') is 0 — but "must be a whole number above zero" is a poor account of an empty
    // box for the person who has to go and fill it.
    it('says a missing value is not set', () => {
      expect(findEnvValueProblem(wholeRule, undefined)).toBe('DAILY_GRANT_CREDITS is not set')
    })

    it.each([[''], ['   '], ['\t']])('says a value of %j is blank', (rawValue) => {
      expect(findEnvValueProblem(wholeRule, rawValue)).toBe('DAILY_GRANT_CREDITS is blank')
    })

    it.each([['0'], ['-1'], ['1.5'], ['NaN'], ['Infinity'], ['-Infinity'], ['five']])(
      'rejects %s and states the requirement',
      (rawValue) => {
        expect(findEnvValueProblem(wholeRule, rawValue)).toBe(
          'DAILY_GRANT_CREDITS must be a whole number above zero',
        )
      },
    )
  })

  describe('the predicates', () => {
    it.each([[0], [-1], [NaN], [Infinity], [-Infinity]])('%s is not positive and finite', (value) => {
      expect(isPositiveFiniteNumber(value)).toBe(false)
      expect(isPositiveWholeNumber(value)).toBe(false)
    })

    // The one place the two rules part company: a price may be fractional, a count may not.
    it('separates a fractional price from a fractional count', () => {
      expect(isPositiveFiniteNumber(0.01)).toBe(true)
      expect(isPositiveWholeNumber(0.01)).toBe(false)
    })
  })

  describe('findEnvProblems', () => {
    it('finds nothing wrong with a sound configuration', () => {
      expect(findEnvProblems()).toEqual([])
    })

    it.each([
      ['CREDIT_PRICE_AUD'],
      ['MIN_CREDITS_PURCHASE'],
      ['DEFAULT_CREDITS_PURCHASE'],
      ['DAILY_GRANT_CREDITS'],
      ['WELCOME_GRANT_CREDITS'],
    ])('reports %s when it is missing', (key) => {
      delete process.env[key]
      expect(findEnvProblems()).toEqual([`${key} is not set`])
    })

    it('reports every broken key, not just the first', () => {
      delete process.env.CREDIT_PRICE_AUD
      process.env.DAILY_GRANT_CREDITS = 'lots'

      expect(findEnvProblems()).toEqual([
        'CREDIT_PRICE_AUD is not set',
        'DAILY_GRANT_CREDITS must be a whole number above zero',
      ])
    })

    // A price is the one money value allowed to be fractional; a count of credits is not.
    it('accepts a fractional price but not a fractional count', () => {
      process.env.CREDIT_PRICE_AUD = '0.005'
      expect(findEnvProblems()).toEqual([])

      process.env.DAILY_GRANT_CREDITS = '2.5'
      expect(findEnvProblems()).toEqual(['DAILY_GRANT_CREDITS must be a whole number above zero'])
    })

    // The one cross-field rule: a default below the minimum pre-fills the buy box with an amount
    // whose own button is disabled on arrival, which nothing else reveals until a user meets it.
    it('reports a default purchase below the minimum', () => {
      process.env.DEFAULT_CREDITS_PURCHASE = '100'
      process.env.MIN_CREDITS_PURCHASE = '500'

      expect(findEnvProblems()).toEqual([
        'DEFAULT_CREDITS_PURCHASE must not be below MIN_CREDITS_PURCHASE',
      ])
    })

    it('accepts a default equal to the minimum', () => {
      process.env.DEFAULT_CREDITS_PURCHASE = '500'
      process.env.MIN_CREDITS_PURCHASE = '500'

      expect(findEnvProblems()).toEqual([])
    })

    // Both keys already report themselves, so the comparison adds nothing but noise when one of
    // them is the thing that is broken.
    it('does not add the cross-field complaint when a key it compares is itself broken', () => {
      delete process.env.MIN_CREDITS_PURCHASE

      expect(findEnvProblems()).toEqual(['MIN_CREDITS_PURCHASE is not set'])
    })
  })
})
