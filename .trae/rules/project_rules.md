# Project Testing Guidelines

## Email Testing Architecture
The project uses Mailpit as a lightweight local SMTP server for E2E testing. EmailTester has been migrated from Ethereal Email to integrate with Mailpit's HTTP API, allowing tests to capture and verify emails sent during test execution.

## Available Test Commands

### Unit Tests
- `pnpm test` - Run unit tests
- `pnpm test:ui` - Run unit tests with UI
- `pnpm test:run` - Run unit tests once

### E2E Tests
- `pnpm test:e2e` - Run all E2E tests
- `pnpm test:e2e:ui` - Run E2E tests with Playwright UI
- `pnpm test:all` - Run both unit and E2E tests

### Specific E2E Test Flows
- `pnpm test:e2e:contact` - Test contact form flow
- `pnpm test:e2e:signup` - Test user signup flow
- `pnpm test:e2e:change-email` - Test email change flow
- `pnpm test:e2e:password-reset` - Test password reset flow
- `pnpm test:e2e:create-verified-user` - Test createVerifiedTestUser utility function
- `pnpm test:e2e:mailpit` - Test Mailpit integration

## Development Commands
- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start:prod` - Start production server
- `pnpm typecheck` - Check TypeScript types

## Testing Best Practices
- Use the specific test commands above (e.g., `pnpm test:e2e:password-reset`)
- E2E tests automatically start the dev server as needed
- Avoid running the test version of the dev server manually
- Keep Mailpit running during E2E tests to avoid connection errors

## E2E Test Server Stability Investigation (In Progress)

### Issue Summary
Intermittent E2E test failures across non-trivial tests due to development server crashes during test execution, not during teardown as initially suspected.

### Key Findings
- **Root Cause**: Server crashes during test execution under load, not teardown issues
- **Pattern**: Tests show "Server ready" → Connection refused errors → "Already stopped" in teardown
- **Affected Tests**: All non-trivial E2E tests (contact, password-reset, change-email)
- **Working Tests**: Simple tests like mailpit.spec.ts pass consistently

### Files Modified
- `/stzUser/test/e2e/config/global-teardown.ts` - Added brutal server shutdown with `pkill -f "vite.*dev"` to ensure clean state between test runs
- This resolved "every other time" failure pattern but server still crashes during execution

### Key Files for Investigation
- `/stzUser/test/e2e/config/global-setup.ts` - Server startup logic
- `/stzUser/test/e2e/config/global-teardown.ts` - Modified with brutal shutdown
- `/stzUser/test/e2e/utils/server-check.ts` - Server health checking utilities
- `/stzUser/test/e2e/config/playwright.config.ts` - Test configuration

### Test Results Observed
- `mailpit.spec.ts` - ✅ Passes consistently
- `signup.spec.ts` - ✅ Passes with brutal shutdown
- `contact.spec.ts` - ❌ Server crashes during execution (net::ERR_CONNECTION_REFUSED)
- `password-reset.spec.ts` - ❌ Fails with signup utility errors
- `change-email.spec.ts` - ❌ Browser/page closes unexpectedly (timeout)

### Next Steps to Investigate
1. **Package Updates**: Update npm packages to see if newer versions resolve server stability issues
2. **Server Monitoring**: Add logging/monitoring during test execution to catch crash moments
3. **Memory/Resource Issues**: Check if server crashes due to resource constraints under test load
4. **Error Handling**: Improve server error handling and recovery mechanisms
5. **Test Isolation**: Investigate if tests are interfering with each other or server state
6. **Alternative Approach**: Consider restarting server between each test instead of brutal teardown

### Debugging Commands Used
- `ps aux | grep -E '(vite|node.*dev)'` - Check running server processes
- Individual test commands: `pnpm test:e2e:contact`, `pnpm test:e2e:signup`, etc.

### Status
- Brutal teardown implemented and working (clean state between runs)
- Server stability during execution still needs investigation
- Focus should be on why server crashes during test execution, not teardown behavior