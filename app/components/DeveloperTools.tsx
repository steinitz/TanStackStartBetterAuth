import {Spacer} from "~/components/Spacer";
import {sendTestEmail} from "~/lib/mailUtilities";
import {getCount, updateCount} from "~/lib/count";
import {getRouteApi, useRouter} from "@tanstack/react-router";
import {useEffect, useState} from "react";

type DetailsItemsStyleAttributeType = {
  detailItemsStyleAttribute?: {
    position: string,
    top: string,
    left:string,
  }
}

export const DeveloperTools =(
  {detailItemsStyleAttribute}: any /*{
    detailItemsStyleAttribute?: DetailsItemsStyleAttributeType
  }*/
)=> {
  const [theCount, setTheCount] = useState(0)

  // crappy way to get the count since I can't have a loader here
  // because its not a route
  const doGetCount = async () => {
    const count =  await getCount()
    setTheCount(count)
  }

  const router = useRouter()
  // build the styling for the details items
  // include the position styling if provided in the props
  const detailsItemsStyle: any = {
    display: "flex",
    flexDirection: "row",
    justifyContent: "flex-start",
  }
  if (detailItemsStyleAttribute) {
    Object.assign(detailsItemsStyle, detailItemsStyleAttribute)
  }

  const handleSendTestMessage = async () => {
    sendTestEmail()
    alert('test email sent')
  }

  const handleUpdateCount = async () => {
    await updateCount({data: 1}).then(() => {
      router.invalidate()
    })
    // crappy way to get the count since I can't have a loader here
    // because its not a route
    doGetCount()
  }

  return <details>
    <summary>Developer Tools</summary>
    <div
      style={detailsItemsStyle}
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
