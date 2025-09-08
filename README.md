# Full-Stack Web App Foundation

A production-ready starter template with authentication, database integration, and modern tooling. Built with TanStack Start, Better Auth, and TypeScript for rapid development of secure web applications.

## What You Get

- 🔐 **Complete Authentication System** - Sign up, login, password reset, email verification
- 🗄️ **Database Ready** - SQLite with Drizzle ORM, easily switchable to PostgreSQL/MySQL
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
- **Secure by default** - CSRF protection, secure headers, input validation

**Database & Backend**
- **Drizzle ORM** - Type-safe database operations with migrations
- **SQLite** - Zero-config database (PostgreSQL/MySQL ready)
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
```

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
5. Deploy to Vercel with zero configuration

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