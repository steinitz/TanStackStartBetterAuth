import {Dialog, dialogRefType} from "~/components/Dialog";
import {forwardRef} from "react";

export const DeleteAccountConfirmationDialog = forwardRef<dialogRefType, {onDelete: () => void}>(
  function DeleteAccountConfirmationDialog({onDelete}, ref) {
    return (
      <Dialog ref={ref}>
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
            onClick={onDelete}
            style={{
              backgroundColor: "var(--color-error)",
              borderColor: "var(--color-error)"
            }}
          >
            Delete
          </button>
          <button onClick={() => {
            if (ref && 'current' in ref) {
              ref.current?.setIsOpen(false);
            }
          }}>
            Cancel
          </button>
        </div>
      </Dialog>
    );
  }
);
