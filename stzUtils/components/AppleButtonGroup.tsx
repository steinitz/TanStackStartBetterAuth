type ButtonSpec = {
  label: string
  onClick?: () => void
  // 'submit' lets the default button submit a surrounding <form> (Enter also works).
  // Defaults to 'button'. The alternative button is always a plain button.
  type?: 'button' | 'submit'
  disabled?: boolean
}

// The Apple/macOS dialog convention: the default (confirming) action sits on the
// RIGHT, the alternative (cancel/dismiss) on the LEFT. The alternative renders as a
// muted-grey secondary via the `buttonSecondary` class (mvp-css-override) — a plain
// button, so it is safe inside a <form>. Encoded here so callers never re-describe it.
export function AppleButtonGroup({
  defaultButton,
  alternativeButton,
}: {
  defaultButton: ButtonSpec
  alternativeButton: ButtonSpec
}) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      gap: '10px',
    }}>
      <button
        type="button"
        className="buttonSecondary"
        onClick={alternativeButton.onClick}
        disabled={alternativeButton.disabled}
      >
        {alternativeButton.label}
      </button>
      <button
        type={defaultButton.type ?? 'button'}
        onClick={defaultButton.onClick}
        disabled={defaultButton.disabled}
      >
        {defaultButton.label}
      </button>
    </div>
  )
}
