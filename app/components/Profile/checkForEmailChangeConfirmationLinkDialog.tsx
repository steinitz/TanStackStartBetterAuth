import {forwardRef} from "react";
import {Dialog, dialogRefType} from "~/components/Dialog";

export const CheckForEmailChangeConfirmationLinkDialog = forwardRef<dialogRefType, {onClick?: () => void}>(
  function CheckForEmailChangeConfirmationLinkDialog({onClick}, ref) {
    const handleClick = () => {
      if (ref && 'current' in ref) {
        ref.current?.setIsOpen(false);
      }
      onClick?.();
    };

    return (
      <Dialog ref={ref}>
        <h3 style={{maxWidth: "17rem"}}>Check your email for a link to confirm that you wish to change your email address</h3>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "flex-end"
          }}
        >
          <button
            type="submit"
            onClick={handleClick}
          >
            Ok
          </button>
        </div>
      </Dialog>
    );
  }
);
