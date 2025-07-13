// hack to get email address and login/logout buttons to line up
const loggedInButtonFormTopMarginTweak = '-21px'
import type {CSSProperties} from 'react'

export const hideFormBorder: CSSProperties = {
  border: "none",
  boxShadow: "none",
  // textAlign: "right",
  marginTop: loggedInButtonFormTopMarginTweak,
  maxWidth: 'auto',
  minWidth: 'auto',
}

export const fieldLabelSubtext: CSSProperties = {
  fontSize: '0.8rem',
  fontWeight: 'lighter',
  paddingLeft: '0.3rem',
  // nudge it up to align with the main label text
  position: 'relative',
  top: '-1px',
  // none of these nudge it up
  // paddingTop: '0px',
  // marginTop: '-30px',
  // marginBottom: '30px',
  // paddingBottom: '30px'
}

// copied from mvp.css -- see the stylesheet link in remix_app/root.tsx
export const repurposedFormBoxStyle = {
  border: "1px solid var(--color-bg-secondary)",
  borderRadius: "var(--border-radius)",
  boxShadow: "var(--box-shadow) var(--color-shadow)",
  display: "block",
  maxWidth: "var(--width-card-wide)",
  minWidth: "var(--width-card)",
  padding: "1.5rem",
  // textAlign: "var(--justify-normal)" // typescript doesn't like this ??
}

export const activeLinkStyle = {
  color: 'var(--color-text)',
  textDecoration: 'none',
}