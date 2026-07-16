// Dev launcher — plain Vite by default, with automatic Stripe webhook wiring when opted in.
//
// Prime directive: this must never make `pnpm dev` worse than `vite dev`. Vite always starts,
// no matter what the Stripe orchestration does or fails to do. Everything Stripe-related is
// best-effort and wrapped so any hiccup falls through to a normal dev server.
//
// When `.env.development` has IS_STRIPE_ENABLED=true AND the `stripe` CLI is installed and logged
// in, it launches `stripe listen` and injects a *fresh* signing secret into Vite's environment —
// which overrides any stale STRIPE_WEBHOOK_SECRET in .env.development, the usual cause of silent
// webhook signature failures locally. See README → "Testing Stripe purchases locally".

import { spawn, spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const port = process.env.PORT || '3000'
const children = []

// Read the opt-in flag straight from .env.development. A missing file (fresh clone) or any parse
// trouble is treated as off, so a newcomer or non-Stripe developer gets plain Vite.
function stripeEnabled() {
  try {
    return readFileSync(join(repoRoot, '.env.development'), 'utf8')
      .split(/\r?\n/)
      .some((line) => /^\s*IS_STRIPE_ENABLED\s*=\s*true\s*$/.test(line))
  } catch {
    return false
  }
}

// `--print-secret` does double duty: it fetches the signing secret and detects readiness. If the
// CLI is missing, not logged in, or unreachable, it errors or times out and we return null.
function fetchWebhookSecret() {
  try {
    const res = spawnSync('stripe', ['listen', '--print-secret'], {
      encoding: 'utf8',
      timeout: 8000,
      shell: true,
    })
    const match = res.status === 0 && res.stdout ? res.stdout.match(/whsec_[A-Za-z0-9]+/) : null
    return match ? match[0] : null
  } catch {
    return null
  }
}

let viteEnv = {}
try {
  if (stripeEnabled()) {
    const secret = fetchWebhookSecret()
    if (secret) {
      console.log('\n  ✓ Stripe: launching `stripe listen` relay and wiring a fresh STRIPE_WEBHOOK_SECRET into Vite.\n')
      const relay = spawn(
        'stripe',
        ['listen', '--forward-to', `localhost:${port}/api/stripe-webhook`],
        { stdio: 'inherit', shell: true },
      )
      children.push(relay)
      viteEnv = { STRIPE_WEBHOOK_SECRET: secret }
    } else {
      console.log('\n  ⚠️  Stripe is enabled but the `stripe` CLI is not ready (missing or not logged in).')
      console.log('     Local purchases will not grant credits until the webhook relay is running.')
      console.log('     See README → "Testing Stripe purchases locally". Continuing with Vite.\n')
    }
  }
} catch (err) {
  console.warn('  [dev] Stripe launcher skipped (' + (err && err.message) + '); continuing with plain Vite.')
}

// The guarantee: Vite always starts, behaving exactly like `vite dev`.
const vite = spawn('vite', ['dev'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, ...viteEnv },
})
children.push(vite)

function shutdown(code) {
  for (const child of children) {
    try {
      child.kill()
    } catch {}
  }
  process.exit(code || 0)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))
vite.on('exit', (code) => shutdown(code == null ? 0 : code))
