Initial version built with TanStack Router and TanStack Start based on instructions at https://tanstack.com/router/latest/docs/framework/react/start/build-from-scratch

Better-Auth installed with instructions at https://www.better-auth.com/docs/installation

then the better usage guide https://www.better-auth.com/docs/basic-usage

Note: pre-release Tanstack Start's api handling might have had issues with pnpm so reverted to npm.

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
   - Client-safe variables are automatically exposed through `clientEnv`
   - A type-safe `getEnvVar` helper ensures safe access to server-side environment variables

### Client-Side Environment Variables

The system elegantly handles client-side environment variables through SSR:

1. During server-side rendering, `clientEnv` is populated with safe-to-expose variables
2. These values are automatically injected into the page via a script tag
3. Client code can access these values through `clientEnv` with full type safety
4. TypeScript ensures only designated client-safe variables are accessible

Example of client-side usage:
```typescript
// In your client component
import { clientEnv } from '~/config/env'

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

1. Add it to your `.env` file
2. If it contains sensitive data (API keys, passwords, etc.), add it to `serverOnlyVars`
3. If it should be available to the client, add its type to `ClientEnv` interface
4. Use `getEnvVar` for server-side access or `clientEnv` for client-side access

The variable will be automatically:
- Loaded from the appropriate `.env.{environment}` file during bootstrap
- Filtered out of client-side code if in `serverOnlyVars`
- Made available to client code if defined in `ClientEnv`
- Type-safe on both server and client

### Example

```typescript
// In .env.development or .env.production
SMTP_PASSWORD=secret123
COMPANY_NAME=Acme Corp

// In app/config/env.ts
const serverOnlyVars = [
  'SMTP_PASSWORD',  // This will never reach the client
  // ... other sensitive vars
] as const

interface ClientEnv {
  COMPANY_NAME: string;  // This will be available on the client
}

// In your server-side code
import { getEnvVar, isServer } from '../config/env'

if (isServer()) {
  const password = getEnvVar('SMTP_PASSWORD')  // Type-safe server access
}

// In your client-side code
import { clientEnv } from '../config/env'

console.log(clientEnv.COMPANY_NAME)    // "Acme Corp" (safe to expose)
console.log(clientEnv.SMTP_PASSWORD)   // TypeScript error! Not in ClientEnv type
```

This approach provides security without complexity:
- Environment variables are loaded before any application code runs
- Sensitive data never reaches the client
- Client-safe variables are automatically available through SSR
- TypeScript ensures type safety on both server and client
- No build-time configuration or plugins required 