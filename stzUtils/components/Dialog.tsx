import {ReactNode, RefObject, useState, useRef} from "react";
import {useMountEffect} from "~stzUtils/lib/useMountEffect";

// The methods our dialog needs
export type DialogMethodsType = {
  isOpen?: () => boolean;
  setIsOpen: (value: boolean) => void;
};

// Utility function to create a dialog ref with initial methods
export const makeDialogRef = () => useRef<DialogMethodsType>({
  isOpen: () => false,
  setIsOpen: () => {}
});

// The ref type that includes React's current property
export type DialogRefType = RefObject<DialogMethodsType>;

/**
 * Two modes, and the type makes you pick one.
 *
 * `ref` — the dialog owns whether it is open, and callers command it through
 * setIsOpen. Right for a dialog opened by a click and closed by a click, where
 * nothing outside React has an opinion about its state.
 *
 * `isOpen` — the caller owns it, and the dialog only renders what it is told.
 * Reach for this when the dialog's openness is *also* represented somewhere
 * outside React — a URL search param being the case that prompted it, since such
 * a dialog is bookmarkable and reachable from another page. Two representations
 * of one fact must have one of them derived, and a ref can only command, never
 * derive: hand-syncing the two is how you get a dialog that opens exactly once
 * per page load.
 *
 * `onCancel` is called when the browser closes the dialog: Escape, on every
 * platform with one. Optional with `ref`, where the dialog closes itself anyway.
 * Required with `isOpen`, because the caller owns the state and must hear of a
 * close it did not make — otherwise it goes on believing an unseen dialog is open.
 */
type DialogProps = { children: ReactNode } & (
  | { ref: DialogRefType; isOpen?: never; onCancel?: () => void }
  | { isOpen: boolean; onCancel: () => void; ref?: never }
);

export const Dialog = ({
  children,
  ref,
  isOpen: controlledIsOpen,
  onCancel
}: DialogProps) => {
  const [selfIsOpen, setSelfIsOpen] = useState(false);
  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : selfIsOpen;

  // Create stable method references that are unique to this Dialog instance
  const methods = {
    isOpen: () => isOpen,
    setIsOpen: (value: boolean) => setSelfIsOpen(value)
  };

  // Update the ref's methods - each Dialog has its own ref from makeDialogRef
  if (ref?.current) {
    ref.current.isOpen = methods.isOpen;
    ref.current.setIsOpen = methods.setIsOpen;
  }

  const handleBrowserClose = () => {
    if (!isControlled) setSelfIsOpen(false);
    onCancel?.();
  };

  return isOpen ? <OpenDialog onBrowserClose={handleBrowserClose}>{children}</OpenDialog> : null;
};

/**
 * A native <dialog>, opened with showModal() while mounted. The top layer is the
 * point: it sits above every z-index in the document, where the old fixed divs at
 * z-index 1 and 2 sat under a chessboard's arrows at 20. It also keeps focus inside
 * and draws mvp.css's ::backdrop.
 */
function OpenDialog({children, onBrowserClose}: {children: ReactNode; onBrowserClose: () => void}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  // The latest callback, for a listener attached once at mount.
  const onBrowserCloseRef = useRef(onBrowserClose);
  onBrowserCloseRef.current = onBrowserClose;

  useMountEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    // A button its caller marked as the default takes the focus, so Return presses it.
    // Without one, showModal() has already focused the first control, the browser's choice.
    dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus();

    // Escape closes the element natively, and this tells React. The cancel event is
    // deliberately left alone: Chrome lets a page refuse Escape only twice before it
    // closes the dialog regardless, so refusing would only delay this. A close while
    // the element is open again is not hers — StrictMode's mount, unmount, mount
    // closes it in the cleanup below and opens it again before the event arrives.
    const handleClose = () => {
      if (!dialog.open) onBrowserCloseRef.current();
    };
    dialog.addEventListener('close', handleClose);

    // A modal's focus trap does not stop key events bubbling to window, where pages
    // listen for Enter and the arrow keys: they would act on the page behind. Stopping
    // them at the dialog leaves everything inside working, because the target phase
    // has already run.
    const swallowKeys = (event: KeyboardEvent) => event.stopPropagation();
    dialog.addEventListener('keydown', swallowKeys);

    return () => {
      // Removed before close(), so the component's own close is never reported as hers.
      dialog.removeEventListener('close', handleClose);
      dialog.removeEventListener('keydown', swallowKeys);
      if (dialog.open) dialog.close();
    };
  });

  return (
    <dialog
      ref={dialogRef}
      style={{
        // A native dialog's own colours are white, whatever the theme.
        background: "var(--color-bg)",
        color: "var(--color-text)",
        // this padding assumes an <h3> on top and buttons on the bottom
        padding: "0.5% 2% 1.5% 2%",
        border: "2px solid #000",
        borderRadius: "var(--border-radius)",
        boxSizing: "border-box",
        minWidth: "200px",
        // As wide as its content, as the old centred box was; mvp.css caps a dialog
        // at 39rem, which would squeeze a wide form.
        maxWidth: "100%",
        // Back-to-the-wall scrolling. A dialog taller than the screen must scroll
        // itself, or its top goes out of reach.
        // dvh, not vh: on iOS Safari vh ignores the browser chrome, which is
        // exactly the inch a tall form runs out of.
        maxHeight: "90dvh",
        overflowY: "auto"
      }}
    >
      {children}
    </dialog>
  );
}
