/**
 * The one spinner every busy control renders.
 *
 * It is deliberately presentational and owns no state: the component that started the work
 * owns whether it is waiting, because that is the only place that can know when it stops.
 * Share the drawing, keep the behaviour local.
 *
 * It draws `.spinner` — the same circle the auth pages centre in a form — rather than a Font
 * Awesome glyph, and that is the point of the component rather than an implementation detail.
 * Font Awesome ships `font-display: block` on every face, so until its 150KB webfont arrives
 * from a third-party CDN a glyph is rendered with an INVISIBLE fallback: present in the DOM,
 * correctly sized, animating, and painting nothing, for up to the three seconds the spec
 * allows. An indicator whose whole job is to appear during a wait must not itself wait on a
 * download. `.spinner` is drawn with a border and needs no font.
 *
 * Accessibility: the circle is `aria-hidden` so it never replaces the control's own name, and
 * the wait is announced once through a polite live region instead.
 *
 * There is no `prefers-reduced-motion` rule, and that is deliberate. Steve, 2026-09-05: the
 * site is low-motion already — this spinner turns once every eight seconds — so ask him
 * before adding any.
 *
 * **This component draws the spinner; where it goes is the caller's decision, and the three
 * answers look inconsistent side by side because each has its own reason:**
 *
 * - **Beside the label**, which is the plain case. There is room, so the spinner joins what
 *   is already there and the control keeps its name on screen.
 * - **Over the label**, where a row only just fits on a phone and a spinner with any width
 *   of its own would risk wrapping it.
 * - **Instead of the control**, where the control is an icon or an image with no text to sit
 *   beside. Pass `size` so the replacement reserves exactly what it stands in for and the
 *   layout cannot jump.
 */
export function BusySpinner({
  label = 'Loading',
  size,
}: {
  /** What assistive technology hears. Say what is being waited for where it is not obvious. */
  label?: string
  /** Matches the spinner to whatever it stands in for, when it replaces rather than joins it. */
  size?: string
}) {
  return (
    <>
      {/* A span, and it must stay a span. mvp.css styles `a em, a i` as a button-shaped chip
          — `border: 2px solid`, a border radius and `padding: 1rem 2rem` — so an <i> here,
          which is what most icons are, drew a rectangle around the spinner and shoved the
          link's layout apart. */}
      <span
        className="spinner spinner-inline"
        aria-hidden="true"
        // Waiting is a state, and a test that hunted for it by class name would be asserting
        // on the stylesheet rather than on the app. Specs read this attribute.
        data-busy-spinner=""
        // One number: `.spinner` derives its height and cap from it, so the circle stays a
        // circle at any size. Left unset, it follows the surrounding text.
        style={size ? ({ '--spinner-size': size } as React.CSSProperties) : undefined}
      />
      <span role="status" style={visuallyHidden}>
        {label}
      </span>
    </>
  )
}

// Reachable by a screen reader, invisible and zero-sized to everything else. `display: none`
// and `visibility: hidden` would take it out of the accessibility tree along with the layout.
const visuallyHidden = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
} as const
