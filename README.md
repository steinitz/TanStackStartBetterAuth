Initial version built with TanStack Router and TanStack Start based on instructions at https://tanstack.com/router/latest/docs/framework/react/start/build-from-scratch

Better-Auth installed with instructions at https://www.better-auth.com/docs/installation

then the better usage guide https://www.better-auth.com/docs/basic-usage

Note: pre-release Tanstack Start's api handling might have had issues with pnpm so reverted to npm.  Left an abandoned pnpm-lock.yaml in the repo

The Dialog component uses modern React patterns to share state with parent components. Instead of the deprecated forwardRef/useImperativeHandle approach, it employs a custom hook pattern that provides better type safety and clearer parent-child communication. This implementation demonstrates how to avoid ref-based imperative code in favor of more declarative patterns.

## Production Deployment

To deploy this application in production:

1. Build the application:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm run start:prod
   ```

> **Important**: Always use `npm run start:prod` to start the production server, not the command suggested by the build output. This ensures proper loading of environment variables required for authentication and other server features.

## Environment Variables

This project uses a "secure by default" approach to environment variables in an isomorphic (server + client) context. The system is designed to be developer-friendly while maintaining security:

### How It Works

1. Environment variables are loaded by `bootstrap.env.mjs` before any application code runs
2. The bootstrap process ensures critical variables (like authentication secrets) are available immediately
3. Once bootstrapped, `app/config/env.ts` provides type-safe access and validation:
   - Sensitive variables are protected by adding them to `serverOnlyVars`
   - Critical variables required for core functionality are validated via `criticalVars`
   - A type-safe `getEnvVar` helper ensures safe access to environment variables

### Adding New Environment Variables

When adding a new environment variable:

1. Add it to your `.env` file
2. If it contains sensitive data (API keys, passwords, etc.), add it to `serverOnlyVars`
3. If it's required for core functionality, add it to `criticalVars`
4. Use the `getEnvVar` helper to access it in your code

The variable will be automatically:
- Loaded from the appropriate `.env.{environment}` file during bootstrap
- Filtered out of client-side code if in `serverOnlyVars`
- Validated at startup if in `criticalVars`
- Safely accessed with proper error handling via `getEnvVar`

### Example

```typescript
// In .env.development or .env.production
SMTP_PASSWORD=secret123
PUBLIC_CONFIG=some-value

// In app/config/env.ts
const serverOnlyVars = [
  'SMTP_PASSWORD',  // This will never reach the client
  // ... other sensitive vars
] as const

const criticalVars = [
  'BETTER_AUTH_SECRET',  // Server won't start if this is missing
  'BETTER_AUTH_URL',     // Server won't start if this is missing
] as const

// In your code (server-side)
import { getEnvVar, isServer } from '../config/env'

if (isServer()) {
  const password = getEnvVar('SMTP_PASSWORD', true)  // Required, will throw if missing
  const config = getEnvVar('PUBLIC_CONFIG')          // Optional
}

// In your code (client-side)
console.log(process.env.SMTP_PASSWORD)    // undefined (filtered out)
console.log(process.env.PUBLIC_CONFIG)    // "some-value" (safe to expose)
```

This approach provides security without complexity:
- Environment variables are loaded before any application code runs
- Sensitive data never reaches the client
- Critical variables are validated at startup
- Type-safe access prevents runtime errors 