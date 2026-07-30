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
// default link colour — the same look in light and dark themes. This stays
// inline because the Link components apply their own inline colour, and only
// another inline style can win against it.
const footerLinkStyle = { color: 'var(--color-text)' }

// The footer's layout lives here rather than in inline styles because the
// narrow-screen rules below have to override it, and a stylesheet rule can
// never beat an inline style. It travels in this file rather than in the app's
// mvp-css-override.css so that syncing the footer between apps stays a single
// file copy.
const footerStyles = `
.site-footer {
  width: 100%;
  background-color: var(--color-bg);
  border-top: 1px solid var(--color-bg-secondary);
  padding: 1rem 0;
  margin-top: 2rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.site-footer-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.site-footer-row-site { font-size: 0.85rem; }

.site-footer-row-legal {
  font-size: 0.75rem;
  opacity: 0.8;
}

.site-footer-site-links { display: flex; gap: 1.5rem; }

.site-footer-legal-links {
  display: flex;
  gap: 1rem;
  /* A safety valve below the breakpoint: these three keep their shared line
     while it fits, and fold rather than squeeze on the narrowest phones. */
  flex-wrap: wrap;
}

.site-footer-copyright {
  display: flex;
  gap: 1rem;
  align-items: center;
}

/* Below roughly this width the legal links and the copyright sentence can no
   longer share a line, and the copyright wraps into a tall ragged column
   instead. So the whole footer becomes a plain left-aligned stack. A portrait
   iPad is 768px and stays on the wide layout, which is deliberate. */
@media (max-width: 600px) {
  .site-footer-row,
  .site-footer-site-links,
  .site-footer-copyright {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
}
`

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
    <footer className="site-footer">
      <style>{footerStyles}</style>

      {/* Row 1: Site Information */}
      <div className="site-footer-row site-footer-row-site">
        <div className="site-footer-site-links">
          <ContactLink style={footerLinkStyle} />
          <AboutLink style={footerLinkStyle} />
        </div>
        <AcknowledgementsLink style={footerLinkStyle} />
      </div>

      {/* Row 2: Legal, Copyright, Admin */}
      <div className="site-footer-row site-footer-row-legal">
        <div className="site-footer-legal-links">
          <TermsLink style={footerLinkStyle} />
          <RefundsLink style={footerLinkStyle} />
          <PrivacyLink style={footerLinkStyle} />
        </div>

        <div className="site-footer-copyright">
          <span>Copyright © {copyrightYear} {clientEnv.COMPANY_NAME}. All Rights Reserved.</span>
          {isAdmin && (
            <Link to="/admin" style={{ color: 'inherit', textDecoration: 'underline' }}>
              Admin Tools
            </Link>
          )}
        </div>
      </div>
    </footer>
  )
}
