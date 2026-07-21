import type { ReactNode } from 'react'

const markerReset = `
.stz-help-disclosure > summary::-webkit-details-marker {
  display: none;
}

.stz-help-disclosure > summary::marker {
  content: '';
}
`

export function HelpDisclosure({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <details
      className="stz-help-disclosure"
      onClick={(event) => event.stopPropagation()}
      // MVP.css sets ~1.3rem top/bottom margin on <details>; as an inline-block
      // those vertical margins inflate its host row. Zero them explicitly —
      // margin-left alone leaves the global margins in force.
      style={{ display: 'inline-block', verticalAlign: 'middle', margin: '0 0 0 0.4rem' }}
    >
      <summary
        aria-label={label}
        style={{
          alignItems: 'center',
          border: '1px solid var(--color-link)',
          borderRadius: '50%',
          color: 'var(--color-link)',
          cursor: 'pointer',
          display: 'inline-flex',
          fontWeight: 'bold',
          // Just under a typical 1.5rem cell line-height so the circle does not
          // make a with-help row taller than a row without help.
          height: '1.4rem',
          justifyContent: 'center',
          lineHeight: 1,
          listStyle: 'none',
          width: '1.4rem',
        }}
      >
        ?
      </summary>
      {/* Inline styles cannot target Safari's marker pseudo-element. Keeping
          this tiny rule with the component makes every consumer iPad-safe. */}
      <style>{markerReset}</style>
      <div
        role="note"
        style={{
          backgroundColor: 'var(--color-bg)',
          border: '2px solid var(--color-link)',
          color: 'var(--color-text)',
          left: '50%',
          maxHeight: '80vh',
          overflowY: 'auto',
          padding: '1rem',
          position: 'fixed',
          textAlign: 'left',
          top: '10vh',
          transform: 'translateX(-50%)',
          // A table or other host may impose nowrap. Restore readable wrapping
          // here, including long configuration tokens on a portrait iPad.
          whiteSpace: 'normal',
          overflowWrap: 'break-word',
          width: 'min(28rem, calc(100vw - 2rem))',
          zIndex: 1000,
        }}
      >
        {children}
        <button
          type="button"
          onClick={(event) => {
            const details = event.currentTarget.closest('details')
            if (details) {
              details.open = false
              details.querySelector('summary')?.focus()
            }
          }}
        >
          Close
        </button>
      </div>
    </details>
  )
}
