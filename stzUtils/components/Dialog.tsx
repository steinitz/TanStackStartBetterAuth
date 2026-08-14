import {ReactNode, RefObject, useState, useRef} from "react";

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
 */
type DialogProps = { children: ReactNode } & (
  | { ref: DialogRefType; isOpen?: never }
  | { isOpen: boolean; ref?: never }
);

export const Dialog = ({
  children,
  ref,
  isOpen: controlledIsOpen
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

  // Tweaking the z-index of the divs might be the wrong approach
  // but without them, two problems:
  // 1. The occluding div doesn't hide all the parent page input fields
  // 2. The occluding div occludes the dialog
  return (
    isOpen ?
      <>
        {/*This div occludes the parent page*/}
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            margin: '0',
            padding: '0',
            backgroundColor: "var(--color-bg)",
            opacity: "0.5",
            zIndex: 1,  // Lower z-index for the occluding background
          }}
        />

        {/*This div positions the dialog*/}
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2,  // Higher z-index for the dialog container
          }}
        >
          {/*This div is the dialog*/}
          <div
            style={{
              background: "var(--color-bg)",
              // this padding assumes an <h3> on top and buttons on the bottom
              padding: "0.5% 2% 1.5% 2%",
              border: "2px solid #000",
              borderRadius: "10px",
              minWidth: "200px",
              // Back-to-the-wall scrolling. The parent is position:fixed, so a
              // dialog taller than the screen overflows a centred box in both
              // directions and nothing can scroll it — the top goes out of reach.
              // dvh, not vh: on iOS Safari vh ignores the browser chrome, which is
              // exactly the inch a tall form runs out of.
              maxHeight: "90dvh",
              overflowY: "auto"
            }}
          >
            {children}
          </div>
        </div>
      </>
      :
      null
  );
};