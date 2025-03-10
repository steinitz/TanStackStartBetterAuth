import Dialog from "~/components/Dialog";

export function DeleteAccountConfirmationDialog(props: {
  open: boolean,
  onClose: () => void,
  onClick: any
}) {
  return <Dialog
    isOpen={props.open}
    onClose={
      props.onClose
    }
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
        onClick={props.onClick}
        style={{
          backgroundColor: "var(--color-error)",
          borderColor: "var(--color-error)"
        }}
      >
        Delete
      </button>
      <button onClick={props.onClose}>
        Cancel
      </button>
    </div>
  </Dialog>;
}
