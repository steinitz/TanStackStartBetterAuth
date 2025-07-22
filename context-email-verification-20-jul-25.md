# Email Verification Context - July 20, 2025

## Project Overview
TanStack Start + Better Auth project with email verification functionality.

## Current Issue
The email change verification process sends two emails, which the user considers harassment. Need to simplify to a single-email solution.

## Key Files Involved

### Authentication Configuration
- `stzUser/lib/auth.ts` - Better Auth server configuration
- `src/lib/auth.ts` - Main auth configuration with email templates
- `stzUser/lib/auth-client.ts` - Client-side auth configuration
- `src/lib/auth-client.ts` - Main client auth configuration

### Routes
- `src/routes/_app/auth/verify-email.tsx` - Email verification route
- `src/routes/_app/auth/change-email.tsx` - Email change approval route
- `src/routeTree.gen.ts` - Generated route tree

## Current Email Flow (Two-Step Process)
1. User requests email change
2. First email sent to current address for approval (`change-email` route)
3. Second email sent to new address for verification (`verify-email` route)

## Technical Details

### Better Auth Configuration
- Uses `changeEmail` plugin with `sendChangeEmailVerification`
- Uses `emailVerification` plugin with `sendVerificationEmail`
- Current logic in `sendVerificationEmail` checks for `verify-email` in URL

### Previous Attempts
- Modified URL pattern checking in auth.ts
- Updated route components with proper TypeScript types
- Fixed import issues (`useAuth` from `@/lib/auth-client`)
- Added `validateSearch` for URL parameters

## Next Steps
1. Simplify to single-email verification
2. Remove the dual-email harassment pattern
3. Maintain security while improving UX

## Code Snippets to Review

```typescript
// Current problematic logic in auth.ts
if(request?.url.includes('verify-email')) {
  // Email change verification logic
}
```

## User Feedback
- "There's no good reason to send two emails"
- "That's a form of mild harassment of the user"
- Wants to discard recent changes and start fresh

## Status
Paused - User wants to revisit with simplified approach in next session.