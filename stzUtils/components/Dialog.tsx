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

export const Dialog = ({
  children,
  ref
}: {
  children: ReactNode,
  ref: DialogRefType
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Create stable method references that are unique to this Dialog instance
  const methods = {
    isOpen: () => isOpen,
    setIsOpen: (value: boolean) => setIsOpen(value)
  };
  
  // Update the ref's methods - each Dialog has its own ref from makeDialogRef
  if (ref.current) {
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
              minWidth: "200px"
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