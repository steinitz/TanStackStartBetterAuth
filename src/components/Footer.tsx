import { clientEnv } from '~stzUser/lib/env'
import { useAdminStatus } from '~stzUser/lib/admin-queries'
import { Link } from '@tanstack/react-router'
import {
  AboutLink,
  AcknowledgementsLink,
  ContactLink,
  PrivacyLink,
  RefundsLink,
  TermsLink
} from '~stzUser/components/Legal/Links'

// Footer links blend with the footer's text colour rather than showing the
// default link colour — the same look in light and dark themes.
const footerLinkStyle = { color: 'var(--color-text)' }

export const Footer = () => {
  const { data: adminStatus } = useAdminStatus()
  // Footer discovery follows the same server-derived effective identity as the page. Do not
  // simplify this to session.user.role: configured environment admins may have role "user".
  const isAdmin = Boolean(adminStatus?.isAdmin)

  const currentYear = new Date().getFullYear()
  const copyrightYear = clientEnv.COPYRIGHT_START_YEAR === currentYear.toString()
    ? currentYear
    : `${clientEnv.COPYRIGHT_START_YEAR}-${currentYear}`

  return (
    <footer
      style={{
        width: '100%',
        backgroundColor: 'var(--color-bg)',
        borderTop: '1px solid var(--color-bg-secondary)',
        display: 'flex',
        flexDirection: 'column',
        padding: '1rem 0',
        marginTop: '2rem',
      }}
    >
      <div style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}>
        {/* Row 1: Site Information */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.85rem',
        }}>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <ContactLink style={footerLinkStyle} />
            <AboutLink style={footerLinkStyle} />
          </div>
          <AcknowledgementsLink style={footerLinkStyle} />
        </div>

        {/* Row 2: Legal, Copyright, Admin */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.75rem',
          opacity: 0.8,
        }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <TermsLink style={footerLinkStyle} />
            <RefundsLink style={footerLinkStyle} />
            <PrivacyLink style={footerLinkStyle} />
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span>Copyright © {copyrightYear} {clientEnv.COMPANY_NAME}. All Rights Reserved.</span>
            {isAdmin && (
              <Link to="/admin" style={{ color: 'inherit', textDecoration: 'underline' }}>
                Admin Tools
              </Link>
            )}
          </div>
        </div>
      </div>
    </footer>
  )
}
