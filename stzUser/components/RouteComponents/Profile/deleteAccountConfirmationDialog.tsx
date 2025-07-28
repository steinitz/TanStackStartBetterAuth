import {Dialog, DialogRefType} from "~stzUtils/components/Dialog";

export const DeleteAccountConfirmationDialog = ({
  onDelete,
  ref
}: {
  onDelete: () => void,
  ref: DialogRefType
}) => {
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
        <button onClick={() => ref.current.setIsOpen(false)}>
          Cancel
        </button>
      </div>
    </Dialog>
  );
};
