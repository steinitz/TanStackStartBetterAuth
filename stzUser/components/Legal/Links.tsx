import React from 'react'
import { Link } from '@tanstack/react-router'
import { clientEnv } from '~stzUser/lib/env'

// Links read as links (theme link colour) by default, so they stand out in
// document prose. The footer passes its own colour to blend them with its text.
const legalLinkStyle: React.CSSProperties = {
  textDecoration: 'none',
  color: 'var(--color-link)',
}

// The short names are the footer's, where the four share one line on a phone — Steve, 2026-10-06.
// A sentence passes its own, as Terms does for the Refund Policy.
export const TermsLink = ({ label = 'Terms', style = {} }) => (
  <Link to="/legal/terms" style={{ ...legalLinkStyle, ...style }}>
    {label}
  </Link>
)

export const PrivacyLink = ({ label = 'Privacy', style = {} }) => (
  <Link to="/legal/privacy" style={{ ...legalLinkStyle, ...style }}>
    {label}
  </Link>
)

export const ContactLink = ({ label = clientEnv.SUPPORT_LINK_TEXT, style = {} }) => (
  <Link to={clientEnv.SUPPORT_LINK_URL} style={{ ...legalLinkStyle, ...style }}>
    {label}
  </Link>
)

export const RefundsLink = ({ label = 'Refunds', style = {} }) => (
  <Link to={clientEnv.REFUND_POLICY_URL || '/legal/refunds'} style={{ ...legalLinkStyle, ...style }}>
    {label}
  </Link>
)

export const PricingLink = ({ label = 'Pricing', style = {} }) => (
  <Link to="/legal/pricing" style={{ ...legalLinkStyle, ...style }}>
    {label}
  </Link>
)

export const AboutLink = ({ label = 'About', style = {} }) => (
  <Link to="/legal/about" style={{ ...legalLinkStyle, ...style }}>
    {label}
  </Link>
)

export const AcknowledgementsLink = ({ label = 'Acknowledgements', style = {} }) => (
  <Link to="/legal/acknowledgements" style={{ ...legalLinkStyle, ...style }}>
    {label}
  </Link>
)

export const LegalLinksBundle = ({ separator = ' | ', style = {} }) => (
  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'nowrap', ...style }}>
    <TermsLink />
    {separator}
    <RefundsLink />
    {separator}
    <PrivacyLink />
  </div>
)
