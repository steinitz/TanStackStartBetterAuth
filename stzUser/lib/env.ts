// Environment variable projection and access

// Static, deliberately. This import was dynamic to break a cycle: logToServer read clientEnv for
// an email subject. The subject now takes the app name from getEmailEnvironmentVars instead, so
// the arrow points one way, env to logger, and nothing here has to be deferred.
import { logToServer, logWithThrottledNotification } from '~stzUser/lib/logToServer'

// Helper function to check if we're on the server
export const isServer = () => typeof window === 'undefined'

// True only in local development, never on a deployed build. Guards developer-only console guidance
// (see below and the Stripe webhook handler) so nothing chatters in production.
export const isDevRuntime = () => process.env.NODE_ENV !== 'production' && !process.env.NETLIFY

// Calm boot-time nudge: Stripe is on but no webhook secret is present, so local purchases will not
// grant credits. Fires once at server startup in dev only. `pnpm dev` normally wires the secret for
// you; this catches the case where Vite was started directly or the secret was removed.
if (isServer() && isDevRuntime() && process.env.IS_STRIPE_ENABLED === 'true' && !process.env.STRIPE_WEBHOOK_SECRET) {
  console.warn('⚠️ Stripe is enabled but STRIPE_WEBHOOK_SECRET is not set — local purchases will not grant credits until the `stripe listen` relay is running. Use `pnpm dev` (it wires this automatically) or see README → "Testing Stripe purchases locally".')
}

// Helper to safely get environment variables (server-side only)
export function getEnvVar(name: string): string {
  if (!isServer()) {
    throw new Error('getEnvVar can only be called on the server')
  }

  const value = process.env[name]
  if (!value) {
    console.warn(`⚠️ Environment variable ${name} is not set. This might cause a crash if required at startup.`);
    return ''; // Return empty string instead of throwing to avoid top-level crashes
  }
  return value
}

// Helper to get optional environment variables
export function getOptionalEnvVar(name: string, defaultValue?: string): string | undefined {
  if (!isServer()) {
    throw new Error('getOptionalEnvVar can only be called on the server')
  }
  return process.env[name] || defaultValue
}

// ---------------------------------------------------------------------------
// Money configuration — one rule layer, two consumers
//
// None of the values below has a fallback, because inventing a price is worse than not having
// one. That leaves a single hazard worth naming: an unset key reads as NaN, and every `<` and
// `>` comparison against NaN is false, so a purchase guard written as a comparison waves the
// broken configuration straight through.
//
// The rules are therefore declared once and read by both parties that care — `findEnvProblems`,
// which describes what is wrong, and `assertValidPurchaseConfiguration`, which refuses the
// transaction. Two consumers of one rule cannot disagree; two copies of a rule can drift until
// the signal calls a configuration healthy while a guard admits it.
// ---------------------------------------------------------------------------

export const isPositiveFiniteNumber = (value: number) => Number.isFinite(value) && value > 0

export const isPositiveWholeNumber = (value: number) =>
  isPositiveFiniteNumber(value) && Number.isInteger(value)

export type EnvValueRule = {
  key: string
  isValid: (value: number) => boolean
  requirement: string
}

/**
 * One rule against one raw value. Unset and blank are named rather than described: `Number('')`
 * and `Number('   ')` are both 0, so they do fail the positivity rules — but "must be a number
 * above zero" is a poor account of an empty box for the person who has to go and fill it.
 */
export function findEnvValueProblem(
  rule: EnvValueRule,
  rawValue: string | undefined,
): string | null {
  if (rawValue === undefined) return `${rule.key} is not set`
  if (rawValue.trim() === '') return `${rule.key} is blank`
  return rule.isValid(Number(rawValue)) ? null : `${rule.key} must be ${rule.requirement}`
}

export function findEnvValueProblems(rules: readonly EnvValueRule[]): string[] {
  return rules
    .map((rule) => findEnvValueProblem(rule, process.env[rule.key]))
    .filter((problem): problem is string => problem !== null)
}

const WHOLE_ABOVE_ZERO = 'a whole number above zero'

// The two keys that price a purchase, kept apart from the rest because the guard below checks
// exactly these: a broken daily grant is a bad day, a broken price is a wrong charge.
const purchaseEnvRules: readonly EnvValueRule[] = [
  { key: 'CREDIT_PRICE_AUD', isValid: isPositiveFiniteNumber, requirement: 'a number above zero' },
  { key: 'MIN_CREDITS_PURCHASE', isValid: isPositiveWholeNumber, requirement: WHOLE_ABOVE_ZERO },
]

const grantEnvRules: readonly EnvValueRule[] = [
  { key: 'DEFAULT_CREDITS_PURCHASE', isValid: isPositiveWholeNumber, requirement: WHOLE_ABOVE_ZERO },
  { key: 'DAILY_GRANT_CREDITS', isValid: isPositiveWholeNumber, requirement: WHOLE_ABOVE_ZERO },
  { key: 'WELCOME_GRANT_CREDITS', isValid: isPositiveWholeNumber, requirement: WHOLE_ABOVE_ZERO },
]

/**
 * The signal. Returns a list; never throws — see the boot-safety note above computeClientEnv.
 * It rides to the browser on `window.__ENV` as `envProblems`, so server and client hold the same
 * verdict with no new plumbing. An app with money keys of its own merges its list onto this one;
 * see `src/lib/env.app.ts`.
 */
export function findEnvProblems(): string[] {
  const problems = findEnvValueProblems([...purchaseEnvRules, ...grantEnvRules])

  // The one cross-field rule, and it earns its place: a default below the minimum pre-fills the
  // buy box with an amount whose own button is disabled on arrival — invisible until a user meets
  // it. Only asked when both values are sane alone, since a comparison involving NaN is false
  // either way and both keys have already reported themselves above.
  const defaultCredits = Number(process.env.DEFAULT_CREDITS_PURCHASE)
  const minimumCredits = Number(process.env.MIN_CREDITS_PURCHASE)
  if (
    isPositiveWholeNumber(defaultCredits) &&
    isPositiveWholeNumber(minimumCredits) &&
    defaultCredits < minimumCredits
  ) {
    problems.push('DEFAULT_CREDITS_PURCHASE must not be below MIN_CREDITS_PURCHASE')
  }

  return problems
}

/**
 * The guard. Same rules as the signal, opposite posture: this one stops the transaction, because
 * a signal is data and data stops nothing.
 *
 * Both purchase paths must call it. Card and bank transfer each compute their own amount from
 * CREDIT_PRICE_AUD, so guarding only one leaves the other emailing `AUD$NaN` to support.
 *
 * The thrown message names no keys. Those go to the server log, where the person who can act on
 * them is; the buyer gets the only fact they can act on, which is "not now".
 */
export function assertValidPurchaseConfiguration(): void {
  const problems = findEnvValueProblems(purchaseEnvRules)
  if (problems.length === 0) return

  console.error(`[purchase] refused — ${problems.join('; ')}`)
  throw new Error('Credit purchasing is unavailable: the server is missing pricing configuration')
}

/**
 * The signal's server-side owner. `envProblems` is data, and data emits nothing — this is what
 * puts it in front of an operator, once per server process, on the same notification throttle the
 * Stripe fulfillment alerts use.
 *
 * Never throws and never blocks: a misconfigured deployment should serve a page that says so
 * rather than refuse to boot.
 */
export function reportEnvProblems(problems: string[]): void {
  if (!isServer() || problems.length === 0) return
  try {
    void logWithThrottledNotification({
      level: 'error',
      source: 'Server',
      // A stable throttle key; the varying detail rides in context, as the throttle expects.
      message: 'Environment configuration is incomplete',
      context: { problems },
    }).catch(() => {})
  } catch {
    // reporting a broken configuration must never itself be the thing that breaks
  }
}

// Client-safe environment variables.
// Optional values are null, never undefined: JSON.stringify drops undefined keys, and the
// browser validator (requireInjectedEnv) requires every key to survive the injection.
export type ClientEnv = {
  APP_NAME: string
  SMTP_FROM_ADDRESS: string | null
  SUPPORT_EMAIL_ADDRESS: string | null
  COMPANY_NAME: string
  BETTER_AUTH_URL: string
  TURNSTILE_SITE_KEY: string
  // Support & Compliance
  CONTACT_EMAIL: string | null
  CONTACT_ADDRESS: string | null
  REFUND_POLICY_URL: string
  COPYRIGHT_START_YEAR: string
  SUPPORT_LINK_TEXT: string
  SUPPORT_LINK_URL: string
  // Bank Transfer & Pricing
  BANK_TRANSFER_BSB: string | null
  BANK_TRANSFER_ACC: string | null
  CREDIT_PRICE_AUD: number
  MIN_CREDITS_PURCHASE: number
  DAILY_GRANT_CREDITS: number
  WELCOME_GRANT_CREDITS: number
  DEFAULT_CREDITS_PURCHASE: number
  IS_STRIPE_ENABLED: boolean
  // Publishable key is client-safe by design (Stripe means it to ship to the browser).
  // The secret + webhook keys are server-only and never appear in ClientEnv — see stripe.server.ts.
  STRIPE_PUBLISHABLE_KEY: string | null
  // Every money value that is missing or malformed, in words. Empty means the configuration is
  // sound. Present on the client too, so a page can say so without asking the server.
  envProblems: string[]
}

// True in Node and Node-like test runtimes (Vitest/jsdom), false in a real browser.
// This is the linchpin of the fail-loud contract below: it must be false in the browser so
// the browser takes the require-injection path. The release-name check resists a browser
// process polyfill giving a false positive.
function isNodeLikeRuntime() {
  return (
    typeof process !== 'undefined' &&
    process.release?.name === 'node' &&
    Boolean(process.versions?.node)
  )
}

// Fire-and-forget telemetry when a browser injection check fails, so a broken __ENV surfaces as
// a server-side alert (and optional email), not just a console throw only a devtools-open user
// would see. Only real browsers reach requireInjectedEnv in the app, so the isNodeLikeRuntime
// guard skips server/test runtimes — which also keeps the unit test from firing real telemetry.
// The call is wrapped so telemetry can never mask or delay the throw that immediately follows.
// It now runs synchronously as far as its first await, where the dynamic import used to defer the
// whole of it — so the wrapping matters more than it did, not less. The message is a stable
// throttle key; variable detail rides in context.
function reportInjectionFailure(message: string, context: Record<string, unknown>): void {
  if (isNodeLikeRuntime()) return
  try {
    void logToServer({ data: { level: 'error', message, context, notify: true } }).catch(() => {})
  } catch {
    // telemetry must never interfere with fail-loud
  }
}

// Accept the root-injected window.__ENV only if it is a complete object. The template is a
// factory so a wholly missing injection throws before it runs — the fail-loud error owes
// nothing to how the bundler lowered process.env. A present-but-partial object still runs the
// factory, but only to derive Object.keys; its values are never used.
function requireInjectedEnv<T>(value: unknown, getTemplate: () => T, label: string): T {
  if (!value || typeof value !== 'object') {
    reportInjectionFailure(`${label}: window.__ENV was not injected`, { reason: 'missing-or-not-an-object' })
    throw new Error(`${label}: window.__ENV was not injected before client env loaded`)
  }
  const env = value as Record<string, unknown>
  const missing = Object.keys(getTemplate() as object).filter((key) => !(key in env))
  if (missing.length) {
    reportInjectionFailure(`${label}: window.__ENV is missing keys`, { missing })
    throw new Error(`${label}: window.__ENV is missing keys: ${missing.join(', ')}`)
  }
  return env as T
}

// The app's own name, and the one home of its default. Two consumers read it: computeClientEnv,
// which projects it to the browser, and getEmailEnvironmentVars, which puts it in an alert
// subject. A copied default would let those two disagree about what the app is called.
export const DEFAULT_APP_NAME = 'TanStack Start with Better Auth'
export const getAppName = () => process.env.APP_NAME || DEFAULT_APP_NAME

// The single home of every client-env name and default. The server runs this from process.env;
// the browser receives the result via window.__ENV (see __root). Tests run it too, since jsdom
// is Node-like, so no test-setup injection is needed.
export function computeClientEnv(): ClientEnv {
  return {
    APP_NAME: getAppName(),
    SMTP_FROM_ADDRESS: process.env.SMTP_FROM_ADDRESS ?? null,
    SUPPORT_EMAIL_ADDRESS: process.env.SUPPORT_EMAIL_ADDRESS ?? null,
    COMPANY_NAME: process.env.COMPANY_NAME || 'Your Company',
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
    TURNSTILE_SITE_KEY: process.env.TURNSTILE_SITE_KEY || '1x00000000000000000000AA',
    CONTACT_EMAIL: process.env.CONTACT_EMAIL || process.env.SUPPORT_EMAIL_ADDRESS || null,
    CONTACT_ADDRESS: process.env.CONTACT_ADDRESS ?? null,
    REFUND_POLICY_URL: process.env.REFUND_POLICY_URL || '/legal/refunds',
    COPYRIGHT_START_YEAR: process.env.COPYRIGHT_START_YEAR || new Date().getFullYear().toString(),
    SUPPORT_LINK_TEXT: process.env.SUPPORT_LINK_TEXT || 'Contact our Support Team',
    SUPPORT_LINK_URL: process.env.SUPPORT_LINK_URL || '/contact',
    BANK_TRANSFER_BSB: process.env.BANK_TRANSFER_BSB ?? null,
    BANK_TRANSFER_ACC: process.env.BANK_TRANSFER_ACC ?? null,
    // No fallbacks below this line, deliberately: a money value is never invented. An unset key
    // therefore reads as NaN rather than a plausible number — which is the point, since NaN is
    // what findEnvProblems reports and assertValidPurchaseConfiguration refuses. Neither throws
    // here, so a deployment missing its money keys still boots and can say what is wrong.
    CREDIT_PRICE_AUD: Number(process.env.CREDIT_PRICE_AUD),
    MIN_CREDITS_PURCHASE: Number(process.env.MIN_CREDITS_PURCHASE),
    DAILY_GRANT_CREDITS: Number(process.env.DAILY_GRANT_CREDITS),
    WELCOME_GRANT_CREDITS: Number(process.env.WELCOME_GRANT_CREDITS),
    DEFAULT_CREDITS_PURCHASE: Number(process.env.DEFAULT_CREDITS_PURCHASE),
    IS_STRIPE_ENABLED: process.env.IS_STRIPE_ENABLED === 'true', // master kill-switch, env-driven (Step 0)
    STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY ?? null,
    envProblems: findEnvProblems(),
  }
}

// Server and Node-like tests compute from process.env; a real browser must use the complete
// root-injected object, and fails loudly via requireInjectedEnv if it is missing or partial.
export const clientEnv: ClientEnv =
  isServer() || isNodeLikeRuntime()
    ? computeClientEnv()
    : requireInjectedEnv(window.__ENV, computeClientEnv, 'clientEnv')

// Extend window interface for client-side access
declare global {
  interface Window {
    __ENV?: ClientEnv
  }
}

export { isNodeLikeRuntime, requireInjectedEnv }
