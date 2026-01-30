# Implementation Plan - Netlify Deployment for Upstream Foundation

This plan outlines the steps to deploy the `TanStackStartBetterAuth` foundation project to Netlify, incorporating lessons learned from the `ChessHurdles` deployment.

## 1. Minimalist Netlify Configuration
- Rely on Nitro's automatic detection, similar to the working `stzdev.com` setup.
- **Action**: Update `netlify.toml` to only include the build command and publish directory.

## 2. Environment Parity
- Pin the Node version to avoid runtime surprises.
- **Action**: Create `.nvmrc` with `v22.2.0` (matching the version you've found stable for this upstream foundation).

## 3. Local Build Test (No File Changes)
- **Action**: Run `pnpm build` locally to verify the output structure.

## 4. Native Module Resolution (Pivot to Git Build)
- Manual CLI deployment from macOS uploads incompatible binaries for `libsql` and `better-sqlite3`.
- **Action**: Switch to Git-based deployment to ensure Netlify builds the project on Linux, installing the correct native dependencies.
- **Action**: Configured strict environment checks and safe bundling in `vite.config.ts`.

## 4. Local Build Verification
- Perform a manual production build locally to ensure everything works as expected.
- **Action**: Run `pnpm build`.

## 5. Deployment Setup (User Instructions)
- Create a new project on Netlify.
- Connect the repository.
- Configure the following environment variables in Netlify:
  - `DATABASE_URL`: Your Turso database URL (e.g., `libsql://your-db.turso.io`).
  - `TURSO_AUTH_TOKEN`: Your Turso authentication token.
  - `BETTER_AUTH_SECRET`: A secure random string (can be generated with `openssl rand -base64 32`).
  - `BETTER_AUTH_URL`: The public URL of your Netlify site.
  - `SMTP_HOST`: e.g., `mail.smtp2go.com` or `smtp.gmail.com`.
  - `SMTP_PORT`: e.g., `587`.
  - `SMTP_USER`: Your SMTP username.
  - `SMTP_PASS`: Your SMTP password.
  - `SMTP_FROM_ADDRESS`: The email address to send from.
  - `TURNSTILE_SITE_KEY`: (Optional) Your Cloudflare Turnstile site key.
  - `TURNSTILE_SECRET_KEY`: (Optional) Your Cloudflare Turnstile secret key.

## 6. Post-Deployment Verification
- Verify sign-up flow.
- Verify email verification (using Mailpit locally or real SMTP in prod).
- Verify database migrations (foundation tables should auto-sync on startup).
