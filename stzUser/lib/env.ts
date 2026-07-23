// Environment variable projection and access

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
}

export function parsePositiveWholeNumberEnv(
  name: 'DAILY_GRANT_CREDITS' | 'WELCOME_GRANT_CREDITS',
  rawValue: string | undefined,
  defaultValue: number,
): number {
  const value = Number(rawValue ?? defaultValue)

  if (!Number.isFinite(value) || !Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a finite positive whole number`)
  }

  return value
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
// logToServer is imported dynamically to avoid a static import cycle (it imports clientEnv) and
// to keep it out of env.ts's eager graph. The whole thing is wrapped so telemetry can never mask
// or delay the throw that immediately follows. The message is a stable throttle key; variable
// detail rides in context.
function reportInjectionFailure(message: string, context: Record<string, unknown>): void {
  if (isNodeLikeRuntime()) return
  try {
    void import('~stzUser/lib/logToServer')
      .then(({ logToServer }) => logToServer({ data: { level: 'error', message, context, notify: true } }))
      .catch(() => {})
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

// The single home of every client-env name and default. The server runs this from process.env;
// the browser receives the result via window.__ENV (see __root). Tests run it too, since jsdom
// is Node-like, so no test-setup injection is needed.
export function computeClientEnv(): ClientEnv {
  return {
    APP_NAME: process.env.APP_NAME || 'TanStack Start with Better Auth',
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
    CREDIT_PRICE_AUD: Number(process.env.CREDIT_PRICE_AUD || '0.001'),
    MIN_CREDITS_PURCHASE: Number(process.env.MIN_CREDITS_PURCHASE || '10'),
    DAILY_GRANT_CREDITS: parsePositiveWholeNumberEnv(
      'DAILY_GRANT_CREDITS',
      process.env.DAILY_GRANT_CREDITS,
      100,
    ),
    WELCOME_GRANT_CREDITS: parsePositiveWholeNumberEnv(
      'WELCOME_GRANT_CREDITS',
      process.env.WELCOME_GRANT_CREDITS,
      500,
    ),
    DEFAULT_CREDITS_PURCHASE: Number(process.env.DEFAULT_CREDITS_PURCHASE || '5000'),
    IS_STRIPE_ENABLED: process.env.IS_STRIPE_ENABLED === 'true', // master kill-switch, env-driven (Step 0)
    STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY ?? null,
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
