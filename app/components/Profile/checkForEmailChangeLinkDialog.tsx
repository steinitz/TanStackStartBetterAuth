import Dialog from "~/components/Dialog";

export function CheckForEmailChangeLinkDialog(props: {
  open: boolean,
  onClose: () => void,
}) {
  return <Dialog
    isOpen={props.open}
    onClose={
      props.onClose
    }
  >
    <h3>Check your email for a link to verify your new email address</h3>
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between"
      }}
    >
      <button
        type="submit"
        onClick={props.onClose}
        style={{
          backgroundColor: "var(--color-error)",
          borderColor: "var(--color-error)"
        }}
      >
        Ok
      </button>
    </div>
  </Dialog>;
}
