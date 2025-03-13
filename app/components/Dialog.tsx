import {ReactNode, useImperativeHandle, useState} from "react";

export type dialogRefType = {
  setIsOpen: (arg0: boolean) => void
}

export const Dialog = ({
  children, ref
}: {
  children: ReactNode,
  ref: any
}) => {

  // parents can access this child state via an imperative handle ref
  const[isOpen, setIsOpen] = useState(false)
  useImperativeHandle(ref, () => ({setIsOpen}))

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
            // overflow: 'hidden', /* Hide scrollbars */
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            margin: '0',
            padding: '0',
            backgroundColor: "var(--color-bg)",
            opacity: "0.5",
            zIndex: 2,
            // display: "flex",
          }}
        />

        {/*This div positions the dialog*/}
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: "absolute",
            left: 0,
            marginTop: '1rem',
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
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
              zIndex: 2,
            }}
          >
            {children}
          </div>
        </div>
      </>
      :
      null
  )
}

