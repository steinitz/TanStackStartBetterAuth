// This may be obsolete if we can continue supressing the email verification
// email on email change -- see the emailVerification section in auth.ts 

import {Dialog, DialogRefType} from "~stzUtils/components/Dialog";

export const CheckForNewEmailVerificationLinkDialog = ({
  onClick,
  ref
}: {
  onClick: () => void,
  ref: DialogRefType
}) => {
  const handleClick = () => {
    ref.current?.setIsOpen(false);
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
          onClick={handleClick}
        >
          Ok
        </button>
      </div>
    </Dialog>
  );
};
