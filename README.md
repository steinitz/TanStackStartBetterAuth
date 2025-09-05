# Project Name

A modern web application built on the TanStack/Better-Auth foundation.

## Quick Start

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

## Foundation - in stzUser directory

This project is built on a comprehensive foundation that includes:
- **Authentication**: Complete user management with Better-Auth
- **Testing**: E2E testing with Playwright and unit testing with Vitest
- **Email**: Nodemailer for production and local email testing with Mailpit
- **TypeScript**: throughout the stack
- **Modern Stack**: Vite, TanStack Start, TanStack Router

For detailed foundation documentation, see [README-STZUSER.md](./README-STZUSER.md).

## Development

```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm typecheck    # Check TypeScript types
pnpm test         # Run unit tests
pnpm test:e2e     # Run E2E tests
```

## Project Structure

```
src/              # Main application code
stzUser/          # User management and authentication
stzUtils/         # Shared utilities and components
public/           # Static assets
```

## Getting Started

1. Update `package.json` with your project details
2. Modify this README with your specific project information
3. Start building your application features
4. Refer to `README-STZUSER.md` for foundation-specific documentation

## Keeping Updated (For Forked Projects)

To pull updates from the original foundation repository into your fork:

```bash
# One-time setup
git remote add upstream <original-repo-url>

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