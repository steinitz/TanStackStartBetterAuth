import {Spacer} from "~/components/Spacer";
import {sendTestEmail} from "~/lib/mailUtilities";
import {updateCount} from "~/lib/count";
import {useRouter} from "@tanstack/react-router";

export function DeveloperTools({theCount, testMessage}: any) {
  const router = useRouter()
  //const theCount2 = await getCount() can't use asynce in client components
  const handleSendTestMessage = async () => {
    sendTestEmail()
    alert('test email sent')
  }
  const handleUpdateCount = () => {
    updateCount({data: 1}).then(() => {
      router.invalidate()
    })
  }
  return <details>
    <summary>Developer Tools</summary>
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        justifyContent: "flex-start",
      }}
    >
      <button
        type="button"
        onClick={handleSendTestMessage}
      >
        Send Test Email
      </button>
      <Spacer orientation={"horizontal"}/>
      <button
        type="button"
        onClick={handleUpdateCount}
      >
        Add 1 to {theCount}
      </button>
    </div>
  </details>;
}
