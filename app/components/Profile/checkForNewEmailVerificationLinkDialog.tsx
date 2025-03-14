import {useImperativeHandle, useRef} from "react";
import {Dialog, dialogRefType} from "~/components/Dialog";

export function CheckForNewEmailVerificationLinkDialog({
  ref, onClick
}: any) {

  const dialogRef = useRef<dialogRefType>(null)
  const isOpen = dialogRef.current?.isOpen || (()=> {})
  const setIsOpen = dialogRef.current?.setIsOpen || (()=> {})

  useImperativeHandle(ref, () => ({isOpen, setIsOpen}))

  const handleOnClick = () => {
    setIsOpen(false)
    onClick()
  }

  return <Dialog
    ref={dialogRef}
   >
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
  </Dialog>;
}
