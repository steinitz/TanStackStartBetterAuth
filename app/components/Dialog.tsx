// import React from "react";

import { MouseEventHandler, ReactNode } from "react";

const Dialog = ({
  isOpen, onClose, children
}: {
  isOpen: boolean,
  onClose: MouseEventHandler<HTMLDivElement>,
  children: ReactNode // | string | JSX.Element | JSX.Element[] | (() => JSX.Element)
}) => {
    if (!isOpen) return null;

    // Tweaking the z-index of the divs might be the wrong approach
    // but without them, two problems:
    // 1. The occluding div doesn't hide all the parent page input fields
    // 2. The occluding div occludes the dialog

    return (
      <>
        {/*This div occludes the parent page*/}
        <div
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            backgroundColor: "var(--color-bg)",
            opacity: "0.5",
            zIndex: 2,
          }}
        />

        {/*This div positions the dialog*/}
        <div
          onClick={onClose}
          style={{
            position: "absolute",
            left: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/*This div is the dialog*/}
          <div
            style={{
              marginTop: "-8%", // adjust the dialog up a little from center
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
    );
};

export default Dialog;
