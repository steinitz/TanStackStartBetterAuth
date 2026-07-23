# Full-Stack Web App Foundation

A production-ready starter template with authentication, database integration, and modern tooling. Built with TanStack Start, Better Auth, and TypeScript for rapid development of secure web applications.

## What You Get

- 🔐 **Complete Authentication System** - Sign up, login, password reset, email verification, and **bot protection with Cloudflare Turnstile**
- 🗄️ **Database Ready** - LibSQL (SQLite) with Kysely, optimized for serverless/edge compatibility. Turso Cloud ready.
- 💳 **High-Precision Credit Ledger** - Built-in "Wallet" system with unified milli-credits ($0.001 bits), daily grants, and transaction ledgers. **Concurrency-safe by design** with atomic safeguards.
- 🎨 **Clean UI Foundation** - MVP.css styling with custom components
- 🧪 **Full Testing Suite** - Unit tests (Vitest) and E2E tests (Playwright) with email testing
- 📧 **Email Integration** - Transactional emails with Resend API
- 🚀 **Production Ready** - Vercel deployment, environment management, TypeScript
- 🛠️ **Developer Experience** - Hot reload, type safety, comprehensive tooling

## Perfect For

- SaaS applications requiring user authentication
- Web apps needing secure user management
- Projects requiring email workflows (verification, notifications)
- Teams wanting a solid foundation without boilerplate setup
- Developers who prefer TypeScript and modern tooling

## Quick Start

> **New to this template?** Fork this repository on GitHub first, then follow the setup below.

1. **Fork and setup**:
   - Fork this repository on GitHub and take note of your fork URL
   ```bash
   git clone <your-fork-url>
   cd <project-name>
   pnpm install
   ```

2. **Environment setup**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start development**:
   ```bash
   pnpm dev
   ```

## Tech Stack

**Frontend & Framework**
- **TanStack Start** - Full-stack React framework with file-based routing
- **TypeScript** - Type-safe development with excellent DX
- **Vite** - Lightning-fast build tooling and HMR

**Authentication & Security**
- **Better Auth** - Comprehensive auth with social providers, 2FA, sessions
- **Cloudflare Turnstile** - Non-interactive bot protection for the sign-up flow
- **Secure by default** - CSRF protection, secure headers, input validation, and server-side Turnstile verification

**Database & Backend**
- **Kysely** - Type-safe SQL builder for database operations
- **LibSQL** - Modern SQLite-compatible driver for serverless, edge, and cloud (Turso ready)
- **Server-side rendering** - SEO-friendly with hydration

**Testing & Quality**
- **Vitest** - Fast unit testing with TypeScript support
- **Playwright** - Reliable E2E testing with email verification
- **Mailpit** - Local email testing server

**Styling & UI**
- **MVP.css** - Semantic HTML styling without classes
- **Custom components** - Reusable UI elements with TypeScript
- **Responsive design** - Mobile-first approach

## Foundation - in stzUser directory

For detailed foundation documentation, see [README-STZUSER.md](./README-STZUSER.md).

## Development

```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm typecheck    # Check TypeScript types
pnpm test         # Run unit tests
pnpm test:e2e     # Run E2E tests
pnpm dev:vite     # Start Vite directly, bypassing the dev launcher
```

## Admin access and first-user bootstrap

Administrative access is effective when either Better Auth stores `admin` in the
user's role or the user's exact ID appears in the server-only, comma-separated
`ADMIN_USER_IDS` environment variable. The `/admin` page and its Footer link use
that same server-derived decision; hiding the link is only discovery, while every
money-changing server function authorizes independently.

`FIRST_USER_IS_ADMIN=true` promotes the first created user to the persisted Better
Auth `admin` role. An unset value is false, and any value other than explicit
`true` or `false` fails during configuration. The copied `.env.example` uses true
for lone-operator self-hosting convenience; `.env.e2e.example` uses false so test
fixtures never gain administration from creation order. Public deployments should
explicitly set:

```dotenv
FIRST_USER_IS_ADMIN=false
```

`ADMIN_USER_IDS` remains the recovery route when automatic first-user promotion is
disabled or an installation has no stored-role admin. Environment-admin IDs are
never sent to the browser.

To obtain a user's ID without database access, sign in and send a message through
the contact form; the sender's account ID appears at the foot of the resulting
support email. A site owner can read their own ID from a test message — or a
colleague's ID from a message that colleague sends — and add it to
`ADMIN_USER_IDS`.

## Testing Stripe purchases locally

Only relevant if you are working on the credit-purchase flow (`IS_STRIPE_ENABLED=true`). Otherwise ignore this — `pnpm dev` behaves like a normal dev server.

Stripe delivers purchase confirmations by webhook. Your laptop is not reachable from Stripe's servers, so a local webhook needs the Stripe CLI to relay events, and the app needs the matching signing secret. `pnpm dev` does both for you:

1. Install the [Stripe CLI](https://stripe.com/docs/stripe-cli) and run `stripe login` once — it persists, so this is a one-time step.
2. Run `pnpm dev`. When `IS_STRIPE_ENABLED=true` and the CLI is ready, it launches `stripe listen`, fetches a fresh signing secret with `stripe listen --print-secret`, and injects it into the dev server automatically — overriding any stale `STRIPE_WEBHOOK_SECRET` in `.env.development`, which is the usual cause of silently-failing local webhooks.

If the CLI is not installed or logged in, `pnpm dev` still starts normally and prints a note. Pay with a [Stripe test card](https://stripe.com/docs/testing) and credits land through the real webhook path — the same mechanism production uses.

## Project Structure

```
src/                 # Your application code (routes, components, client logic)
├── routes/          # File-based routing with TanStack Start
├── components/      # Reusable UI components
└── lib/             # Application utilities

stzUser/            # Authentication & user management foundation
├── lib/             # Auth, database, email utilities
├── components/      # Auth-related components
└── test/            # Comprehensive test suite

stzUtils/           # Shared UI utilities and components
public/             # Static assets (favicon, styles, images)
```

## Ready to Build

This template eliminates weeks of setup time. Fork it, configure your environment variables, and start building your application immediately. The foundation handles authentication, database operations, email workflows, and testing - so you can focus on your unique features.

**Next Steps:**
1. Fork this repository
2. Follow the Quick Start guide above
3. Customize the foundation in `stzUser/` for your needs
4. Build your application in `src/`
5. Deploy to Vercel/Netlify (see [Deployment Guide](./architecture/deployment.md))

Happy building! 🚀

## Getting Started

1. Update `package.json` with your project details
2. Modify this README with your specific project information
3. Start building your application features
4. Refer to `README-STZUSER.md` for foundation-specific documentation

## Keeping Updated (For Forked Projects)

To pull updates from the original foundation repository into your fork:

```bash
# Check if upstream already exists
git remote -v

# One-time setup (skip if upstream already exists)
git remote add upstream <original-repo-url>
# If you get "upstream already exists", you can skip this step

# Regular updates
git fetch upstream
git merge upstream/main
git push origin main
```

**Best practices:**
- Keep your changes in `src/` directory
- Avoid modifying `stzUser/` and `stzUtils/` when possible
- Test after each update to ensure compatibility

**Note:** If you've modified files in `stzUser/` or `stzUtils/`, you may need to resolve merge conflicts during updates.
