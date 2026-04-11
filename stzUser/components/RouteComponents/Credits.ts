// Strings and selectors used by the Credits page and its e2e tests.
// The Credits page itself lives in src/routes/auth/credits.tsx (app-specific),
// but the e2e tests import from here so the selectors stay in the shared stzUser package.

export const creditsStrings = {
  claimWelcomeGrant: 'Claim Welcome Grant',
  welcomeGrantClaimed: 'Welcome Grant Claimed',
  welcomeGrantClaimedAlert: 'Welcome grant claimed! 🎁',
  payViaBankTransfer: 'Pay via Bank Transfer',
  requesting: 'Requesting...',
}

export const creditsSelectors = {
  claimWelcomeGrantButton: creditsStrings.claimWelcomeGrant,
  payViaBankTransferButton: creditsStrings.payViaBankTransfer,
}
