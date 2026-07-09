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

// True when the page is currently rendering its dark palette. Our own UI never needs
// this — dark mode is pure CSS (the `@media (prefers-color-scheme: dark)` gate under
// `:root[color-mode="user"]` in mvp.css / mvp-css-override.css does all of it). The
// one and only caller is Stripe's Appearance API, an external consumer that can't read
// our CSS vars and wants `theme: 'night'` vs 'stripe'; this mirrors that exact CSS gate
// so Stripe matches the page. If this stays Stripe's alone, that's the sign our dark
// mode is otherwise entirely CSS — no app code branches on it.
// A function, not a const: it must read live (SSR has no `window`; the value can
// change), so call it at the point of use, not at import.
export const isDarkMode = (): boolean =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-color-scheme: dark)').matches &&
  document.documentElement.getAttribute('color-mode') === 'user'