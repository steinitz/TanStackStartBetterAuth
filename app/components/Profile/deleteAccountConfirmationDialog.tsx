import {Dialog, dialogRefType} from "~/components/Dialog";
import {useImperativeHandle, useRef} from "react";

export function DeleteAccountConfirmationDialog({
  onClick,
  ref
}: any) {
  const dialogRef = useRef<dialogRefType>(null)

  const setIsOpen = dialogRef.current?.setIsOpen || (()=>{})
  useImperativeHandle(ref, () => {
    return {setIsOpen}
  })

  return <Dialog
    ref={dialogRef}
  >
    <h3>Delete Account? &nbsp;Can't be undone.</h3>
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between"
      }}
    >
      <button
        type="submit"
        onClick={onClick}
        style={{
          backgroundColor: "var(--color-error)",
          borderColor: "var(--color-error)"
        }}
      >
        Delete
      </button>
      <button onClick={() =>setIsOpen(false)}>
        Cancel
      </button>
    </div>
  </Dialog>;
}
