import {useImperativeHandle, useRef} from "react";
import {Dialog, DialogRefType} from "~/components/Dialog";

export function CheckForEmailChangeLinkDialog({
  ref
}: any) {

  const dialogRef = useRef<DialogRefType>(null)
  const setIsOpen = dialogRef.current?.setIsOpen || (()=>{})

  useImperativeHandle(ref, () => {
    return {
      setIsOpen,
    }
  })

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
        onClick={() => setIsOpen(false)}
      >
        Ok
      </button>
    </div>
  </Dialog>;
}
