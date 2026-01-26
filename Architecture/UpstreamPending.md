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
    - **Admin Wallet Tools**: Upgraded the `/admin` page with custom credit grant inputs (amount and description) to facilitate manual bank transfer processing.
- **Tech Stack Polish**: Refined terminology in `Acknowledgements.tsx` for Vite ("rapid build system"), SQLite ("file-based"), and Google Gemini ("non-physical consciousness").

## Future Upstream Work

### Payment Compliance & Polish

- **Pricing Refinement**: Further customize the `Pricing` component to handle dynamic data from Stripe integrations.
- **Compliance Placeholders**: Ensure `Terms.tsx` and `Privacy.tsx` stay up-to-date with standard Stripe requirements without requiring direct email contact info (prioritizing support links/portals).
