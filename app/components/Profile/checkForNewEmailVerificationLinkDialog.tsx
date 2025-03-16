import {forwardRef} from "react";
import {Dialog, dialogRefType} from "~/components/Dialog";

export const CheckForNewEmailVerificationLinkDialog = forwardRef<dialogRefType, {onClick: () => void}>(
  function CheckForNewEmailVerificationLinkDialog({onClick}, ref) {
    const handleOnClick = () => {
      if (ref && 'current' in ref) {
        ref.current?.setIsOpen(false);
      }
      onClick();
    };

    return (
      <Dialog ref={ref}>
        <h3 style={{maxWidth: "17rem"}}>Check your email for a link to verify your new email address</h3>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "flex-end"
          }}
        >
          <button
            type="submit"
            onClick={handleOnClick}
          >
            Ok
          </button>
        </div>
      </Dialog>
    );
  }
);
