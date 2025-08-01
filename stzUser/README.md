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

## Better Auth CLI Usage

Since the auth configuration is located in `stzUser/lib/auth.ts` (not the project root), Better Auth CLI commands require the `--config` flag:

```bash
# Database migrations
npx @better-auth/cli migrate --config stzUser/lib/auth.ts

# Other CLI commands
npx @better-auth/cli [command] --config stzUser/lib/auth.ts
```

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

## Design Principles

1. **Universal Applicability** - Components work across different applications
2. **Security First** - Implements authentication best practices
3. **Minimal Dependencies** - Focuses on core authentication functionality
4. **Clean Separation** - Clear boundaries between foundation and application layers