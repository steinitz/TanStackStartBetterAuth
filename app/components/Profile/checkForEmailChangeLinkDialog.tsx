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
        onClick={props.onClose}
      >
        Ok
      </button>
    </div>
  </Dialog>;
}
