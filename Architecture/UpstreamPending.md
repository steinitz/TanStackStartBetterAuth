# Upstream Pending Changes

This document tracks technical improvements identified during the development of ChessHurdles that should be merged back into the upstream `stzUser` / `stzUtils` templates.

## Completed in this Session

- **Admin Page Migration**: Moved Developer Tools from a footer expansion to a dedicated, secure `/admin` route. Simplified `UserManagement` by removing redundant internal role checks.
- **Wallet & Transaction Ledger**: Shifted to a robust, atomic transaction ledger (`transactions` table) with redundant `credits` column on the `user` table for performance.
- **Kysely Database Integration**: Standardized all database interactions with Kysely and implemented the "Slim Sync" migration pattern in `lib/migrations.ts`.
- **Compliance Foundation**:
    - **Bare-Bones Footer**: Implemented the minimalist two-row layout using granular link components.
    - **Standalone Policy Pages**: Created audit-friendly routes and components for `/legal/about`, `/legal/acknowledgements`, `/legal/privacy`, `/legal/pricing`, and `/legal/refunds`.
    - **UI Granularity**: Extracted `TermsLink`, `PrivacyLink`, etc., and the `LegalLinksBundle` for easy placement across the app.
    - **Wallet Widget**: Enhanced the standalone `WalletWidget` with a subtle border and `cursor: pointer`, linked to the `/auth/credits` route for a seamless integrated feel.
    - **Credit Input & Behavior Polish**:
    - **"Sticky Zero" Fixed**: Resolved the common React numeric input issue where clearing the field snapped it back to `0` (preventing easy single-digit typing).
    - **Theme-Aware Styling**: Moved all input background and text color overrides to `mvp-css-override.css`, allowing fields to naturally inherit dark mode themes without hardcoded JSX colors.
    - **Vertical Alignment**: Zeroed out legacy margins and synced line-heights for perfect vertical centering within the "Credits:" line.
    - **Stepper Removal**: Cleaned up the numeric UI by hiding the spin buttons (steppers) via localized CSS.
- **Credit Economy Refinement**:
    - **Milli-Credit Basis**: Standardized on a $0.001 (1 milli-credit) baseline to allow high-precision charging (e.g., 35 credits for $0.035) without floating-point errors.
    - **Configurable Defaults**: Introduced `DEFAULT_CREDITS_PURCHASE` (e.g., 5000 / $5.00) alongside `MIN_CREDITS_PURCHASE` to improve initial purchase flow UX.
    - **Dynamic UI Text**: Replaced hardcoded grant descriptions with dynamic env-driven strings (e.g., `{clientEnv.WELCOME_GRANT_CREDITS} free credits`).
- **Tech Stack Polish**: Refined terminology in `Acknowledgements.tsx` for Vite ("rapid build system"), SQLite ("file-based"), and Google Gemini ("non-physical consciousness").

## Future Upstream Work

### Payment Compliance & Polish

- **Pricing Refinement**: Further customize the `Pricing` component to handle dynamic data from Stripe integrations.
- **Compliance Placeholders**: Ensure `Terms.tsx` and `Privacy.tsx` stay up-to-date with standard Stripe requirements without requiring direct email contact info (prioritizing support links/portals).
