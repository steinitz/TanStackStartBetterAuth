# Foundation Layer

This directory contains the "pure foundation" authentication components and utilities that can be reused across multiple applications.

## Structure

- **`lib/`** - Core authentication logic and utilities
  - `auth.ts` - Better-Auth server configuration
  - `auth-client.ts` - Better-Auth client configuration
  - `database.ts` - Database setup
  - `form.tsx` - Form utilities and validation helpers
  - `utils.ts` - General utility functions

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

## Design Principles

1. **Universal Applicability** - Components work across different applications
2. **Security First** - Implements authentication best practices
3. **Minimal Dependencies** - Focuses on core authentication functionality
4. **Clean Separation** - Clear boundaries between foundation and application layers