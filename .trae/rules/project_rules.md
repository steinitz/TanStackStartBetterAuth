# Project Testing Guidelines

## Email Testing Architecture
The project uses Mailpit as a lightweight local SMTP server for E2E testing. EmailTester has been migrated from Ethereal Email to integrate with Mailpit's HTTP API, allowing tests to capture and verify emails sent during test execution.

## Available Test Commands

### Unit Tests
- `pnpm test` - Run unit tests
- `pnpm test:ui` - Run unit tests with UI
- `pnpm test:run` - Run unit tests once
- `pnpm typecheck` - Check TypeScript types

### E2E Tests
- `pnpm test:e2e` - Run all E2E tests
- `pnpm test:e2e:ui` - Run E2E tests with Playwright UI
- `pnpm test:all` - Run both unit and E2E tests

### Specific E2E Test Flows
- `pnpm test:e2e:contact` - Test contact form flow
- `pnpm test:e2e:signup` - Test user signup flow
- `pnpm test:e2e:change-email` - Test email change flow
- `pnpm test:e2e:password-reset` - Test password reset flow
- `pnpm test:e2e:mailpit` - Test Mailpit integration

### Development Commands
- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start:prod` - Start production server

## Testing Best Practices
- Use the specific test commands above (e.g., `pnpm test:e2e:password-reset`)
- E2E tests automatically start the dev server as needed
- Avoid running the test version of the dev server manually
- Keep Mailpit running during E2E tests to avoid connection errors