# Foundation Layer

This directory contains the "pure foundation" authentication components and utilities that can be reused across multiple applications.

## Structure

- **`lib/`** - Core authentication logic and utilities
  - `auth.ts` - Better-Auth server configuration
  - `auth-client.ts` - Better-Auth client configuration
  - `database.ts` - Database setup
  - `form.tsx` - Form utilities and validation helpers
  - `EmailTestUtils.ts` - General utility functions

  - `turnstile.server.ts` - Cloudflare Turnstile server-side verification
  - `wallet.logic.ts` - Core ledger and consumption business logic
  - `wallet.server.ts` - Resource usage and credit ledger server functions
  - `migrations.ts` - Declarative database schema sync

- **`components/`** - Reusable UI components
  - `SignIn.tsx` - Sign-in form component
  - `userBlock.tsx` - User authentication status display
  - `FormFieldError.tsx` - Form validation error display
  - `ValidatedInput.tsx` - Input with validation
  - `Spinner.tsx` - Loading spinner

- **`routes/`** - Authentication routes
  - `auth/` - Authentication flow routes (signin, signup, password reset)
  - `profile.tsx` - User profile management
  - `api/auth/` - Authentication API endpoints

## Credit Ledger & Wallet System

The foundation includes a robust, "bulletproof" wallet system designed for usage-based SaaS applications.

### Key Features
- **Unified Credit Balance**: A single cached `credits` field on the user profile for high-performance UI display.
- **Immutable Ledger**: Every change to a user's balance is recorded in the `transactions` table, providing a complete audit trail.
- **High-Precision Economy**: Standardized on a **$0.001 per credit** (milli-credit) baseline for granular resource pricing (e.g. 35 credits = $0.035).
- **Lazy Daily Grant**: Users receive a "Daily Grant" (e.g., +100 credits) upon their first activity or visit of the day. This is calculated server-side using UTC time for consistency.
- **Atomic Concurrency**: 
  - **Double-Grant Protection**: Uses database transactions to ensure a daily grant is only applied once, even if multiple requests arrive simultaneously.
  - **Negative Balance Safeguard**: Uses atomic `WHERE credits >= amount` updates to guarantee that a user's balance never drops below zero.

### Event-Driven UI
The wallet system uses browser-native `CustomEvents` to decouple the UI from the underlying logic:
- `stz-event-insufficient-credits`: Dispatched when an action fails due to lack of funds. Listened to by the global `CreditsRequiredDialog`.
- `stz-event-wallet-updated`: Dispatched after any credit change. Listened to by the `WalletWidget` to trigger an immediate re-fetch of the balance.

### Components
- `WalletWidget.tsx` - A clean, responsive display of the current credit balance, linking to the user's credits page.
- `CreditsRequiredDialog.tsx` - A self-triggering singleton dialog that elegantly handles insufficient credit states across the entire application, providing a direct link to top up.
- `/auth/credits` - A user-facing route for viewing the ledger, claiming grants, and requesting bank transfer purchases with smart adaptive UI that dims completed tasks.
- **Robust Claim Detection**: Uses a dedicated `welcome_claimed` database column for bulletproof one-time onboarding grant management.
- **UI Logic Polish**: Includes fixes for the React "sticky zero" numeric input issue, theme-aware input styling (inherited from global CSS), and perfect vertical alignment for numeric labels.

### Admin Tools (Admin-Only)
- Enhanced `/admin` dashboard with manual credit grant tools (amount and description) to facilitate processing offline payments.

## Path Aliases

stzUser components use the `~stzUser/` path alias:

import { SignIn } from '~stzUser/components/SignIn'
import { signIn } from '~stzUser/lib/auth-client'
```

Application-specific components continue to use the `~/` alias:
```typescript
import { Header } from '~/components/Header'
import { constants } from '~/constants'
```

## Better Auth CLI Usage

Since the auth configuration is located in `stzUser/lib/auth.ts` (not the project root), Better Auth CLI commands require the `--config` flag:

```bash
# Database migrations
npx @better-auth/cli migrate --config stzUser/lib/auth.ts

# Other CLI commands
npx @better-auth/cli [command] --config stzUser/lib/auth.ts
```

## Database Migrations

This foundation uses a dual-engine migration strategy:

1. **Better Auth Tables**: Managed by the Better Auth CLI (`npx @better-auth/cli migrate`). This handles users, sessions, accounts, etc.
2. **Custom Foundation Tables**: Managed by **"Slim Sync"** logic in `stzUser/lib/migrations.ts`.
   - **How it works**: Uses Kysely's `.ifNotExists()` pattern to declaratively define tables for LibSQL/SQLite.
   - **Execution**: Triggered automatically on application startup in `src/server.ts`.
   - **Benefits**: Zero-configuration, no migration history files, and immediate consistency across environments.

## Important Configuration Notes

### Admin System Architecture

Better Auth provides two distinct paths for admin privileges that can create conflicts if not properly understood:

1. **Hardcoded Admin IDs** (`adminUserIds`) - Users whose IDs are included in the `adminUserIds` array have permanent admin privileges regardless of their database role
2. **Role-based Admins** - Users assigned the "admin" role in the database

**Critical Insight**: According to [Better Auth documentation](https://www.better-auth.com/docs/plugins/admin), admin operations are available to "any user assigned the admin role **OR** any user whose ID is included in the adminUserIds option."

This "OR" relationship means:
- `adminUserIds` acts as an **override** that bypasses role-based permissions
- Users in `adminUserIds` maintain admin access even with "user" role in database
- Role-based permission checks may fail for non-`adminUserIds` users
- Admin privileges cannot be revoked from `adminUserIds` users through the UI

**Recommendation**: Choose one approach consistently - either use `adminUserIds` for emergency access only, or remove it entirely and rely on database roles for cleaner architecture.

## Environment Variable System

This foundation separates environment **loading** from environment **projection/access**. The runtime that launches the application owns loading values; `stzUser/lib/env.ts` reads the resulting `process.env`, projects the client-safe subset, and never opens an env file itself.

### How It Works

1. **Runtime Loading**: Vite supplies `.env.development` during ordinary `pnpm dev`; deployment platforms and process managers inject production values; Playwright explicitly seals `.env.e2e` before its build and server start.
2. **Server Access**: Server-only code reads secrets from `process.env` or the `getEnvVar` helpers.
3. **Client Projection**: `stzUser/lib/env.ts` provides a typed, allow-listed projection:
   - Sensitive variables are kept server-only
   - Client-safe variables are converted and exposed through `clientEnv`
   - The browser fails loudly if the root route did not inject the complete projection

### Server-Side Environment Variables
These variables are only accessible on the server and should contain sensitive information:

```env
DATABASE_URL=your_database_connection_string (e.g., file:sqlite.db or libsql://...)
TURSO_AUTH_TOKEN=your_turso_auth_token (required for remote LibSQL)
BETTER_AUTH_SECRET=your_auth_secret
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA # Dummy key for dev
```

### Client-Safe Environment Variables
These variables are safely exposed to the browser via the hydration mechanism:

```env
APP_NAME="Your App Name"
COMPANY_NAME="Your Company"
SMTP_FROM_ADDRESS="noreply@yourcompany.com"
TURNSTILE_SITE_KEY=1x00000000000000000000AA # Dummy key for dev
```

### Environment Variable Hydration

The system handles client-side environment variables through SSR:

1. **Runtime Population**: The launcher establishes `process.env` before application modules load.
2. **SSR Projection**: During server-side rendering, `computeClientEnv()` creates the safe allow-listed object.
3. **Client Hydration**: The root route injects that object into `window.__ENV`.
4. **Client Access**: Browser modules obtain the complete injected object through `clientEnv`.
5. **TypeScript Safety**: Only names declared by `ClientEnv` can appear in the client projection.

### Example Usage in Components

```typescript
// In your client component
import { clientEnv } from '~stzUser/lib/env'

function ContactForm() {
  // Type-safe access to client environment variables
  const { COMPANY_NAME, SMTP_FROM_ADDRESS } = clientEnv
  
  return (
    <form>
      <p>Contact {COMPANY_NAME}</p>
      {/* ... */}
    </form>
  )
}
```

### Adding New Environment Variables

When adding a new environment variable:

1. **Add it at the owning runtime**: For example `.env.development` for local Vite development, hosting configuration for deployment, or both `.env.e2e.example` and local `.env.e2e` for E2E.
2. **Server-only variables**: If it contains sensitive data (API keys, passwords, etc.), keep it server-only
3. **Client-safe variables**: If it should be available to the client, add its type to `ClientEnv` and its conversion/default to `computeClientEnv()` in `stzUser/lib/env.ts`
4. **Access patterns**: Use `clientEnv` for client-side access or direct `process.env` for server-side access

The foundation will not load the variable from disk. Once the launcher supplies it, the variable remains server-only unless it is deliberately added to the `ClientEnv` projection.

### Complete Example

```typescript
// In .env.development or .env.production
SMTP_PASSWORD=secret123
COMPANY_NAME="Acme Corp"

// In stzUser/lib/env.ts - ClientEnv interface
interface ClientEnv {
  COMPANY_NAME: string;  // This will be available on the client
  APP_NAME: string;
  SMTP_FROM_ADDRESS: string;
}

// In your server-side code
if (typeof window === 'undefined') {
  const password = process.env.SMTP_PASSWORD  // Server-only access
}

// In your client-side code
import { clientEnv } from '~stzUser/lib/env'

console.log(clientEnv.COMPANY_NAME)    // "Acme Corp" (safe to expose)
console.log(clientEnv.SMTP_PASSWORD)   // TypeScript error! Not in ClientEnv type
```

### Production Deployment

For production deployment:

1. Build the application: `pnpm build`
2. Supply the production environment through the hosting platform, shell, or process manager
3. Start the built server: `pnpm start:prod`

> **Important**: `pnpm start:prod` serves the existing `dist` output with `NODE_ENV=production`; it deliberately does not load an env file. Required values must already be present in the process environment before the server starts.

**Security Benefits**: This approach provides security without complexity:
- Environment loading has one explicit owner per runtime
- Sensitive data never reaches the client
- Client-safe values are allow-listed and injected through SSR
- TypeScript ensures type safety on both server and client
- Missing or partial browser injection fails loudly

## Design Principles

1. **Universal Applicability** - Components work across different applications
2. **Security First** - Implements authentication best practices
3. **Minimal Dependencies** - Focuses on core authentication functionality
4. **Clean Separation** - Clear boundaries between foundation and application layers
