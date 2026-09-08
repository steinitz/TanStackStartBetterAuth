import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { BusySpinner } from './BusySpinner'

/**
 * A button that says it is working, without changing size while it does.
 *
 * The spinner is drawn OVER the label rather than beside it or in place of it, and that is
 * the whole point of the component. Beside widens the button; in place of shrinks it,
 * because the circle is about 1em and a word is five. Over it, nothing enters or leaves the
 * flow, so neither the button nor the form beneath it can move. The header's nav links
 * solved the same problem the same way — see `.nav-link-*` in `styles.css`, which is these
 * rules under names that only make sense for links.
 *
 * The placement lives in inline styles rather than a stylesheet on purpose. Giving it CSS
 * would mean a second copy of those `.nav-link-*` rules under generic names, and naming
 * them is a decision Steve has set aside.
 *
 * Three things come from `BusySpinner` and must not be rebuilt here: the 150ms delay before
 * anything appears, which is why a fast response does not flash; the polite live region that
 * announces the wait; and `aria-hidden` on the circle, so the button keeps its own name.
 *
 * `busy` does not disable. A caller that must not run twice needs a ref — a `disabled` set
 * from state takes a render to arrive, and the second press happens before it does. Callers
 * that genuinely want the control unusable pass `disabled` themselves, and it composes.
 */
export function BusyButton({
  busy,
  busyLabel,
  children,
  style,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  busy?: boolean
  /** What assistive technology hears while busy. Name the work, not the button. */
  busyLabel?: string
  children: ReactNode
}) {
  return (
    <button {...rest} style={{ ...style, position: 'relative' }}>
      <span
        style={{
          transition: 'opacity 120ms',
          // Only on the way out, matching the spinner's own delay so the two cross rather
          // than leaving the button blank. Coming back is immediate: the label should
          // return the instant the wait ends, not after another 150ms of nothing.
          transitionDelay: busy ? 'var(--busy-delay)' : '0ms',
          opacity: busy ? 0 : 1,
        }}
      >
        {children}
      </span>
      {busy && (
        <span
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            // The label underneath keeps the click, so the overlay must not intercept it.
            pointerEvents: 'none',
          }}
        >
          <BusySpinner label={busyLabel ?? 'Working'} />
        </span>
      )}
    </button>
  )
}
