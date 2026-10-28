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
//
// returnPressesDefault: inside a Dialog, the default button takes the focus when the
// dialog opens, so Return presses it. Opt-in, because a form wants the focus in its
// first field instead, where the user starts typing.
export function AppleButtonGroup({
  defaultButton,
  alternativeButton,
  returnPressesDefault = false,
}: {
  defaultButton: ButtonSpec
  alternativeButton: ButtonSpec
  returnPressesDefault?: boolean
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
        data-autofocus={returnPressesDefault || undefined}
        onClick={defaultButton.onClick}
        disabled={defaultButton.disabled}
      >
        {defaultButton.label}
      </button>
    </div>
  )
}
