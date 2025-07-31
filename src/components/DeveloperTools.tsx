// import { Route as RootRoute } from '~/routes/__root'; // Import the root route
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { sendTestEmail } from '~stzUser/lib/mail-utilities'
import { updateCount } from '~/lib/count'
import { useLoaderData, useRouter } from '@tanstack/react-router'
import { Spacer } from '~stzUtils/components/Spacer'
import { useEffect, useState } from 'react'
import { getCount } from '~/lib/count'

type DetailsItemsStyleAttributeType = {
  position: string
  top: string
  left: string
}

export const DeveloperTools = ({
  detailItemsStyleAttribute,
}: {
  detailItemsStyleAttribute: DetailsItemsStyleAttributeType
}) => {
  // const {count} = useLoaderData({from: RootRoute.id})
  const [count, setCount] = useState(0)
  const router = useRouter()
  
   
  useEffect(() => {
    // declare the data fetching function
    const doGetCount = async () => {
      setCount( await getCount())
    }

    // call the function
    doGetCount()
      // make sure to catch any error
      .catch(console.error);
  }, []) 

  const detailsItemsStyle: any = {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'flex-start',
  }
  if (detailItemsStyleAttribute) {
    Object.assign(detailsItemsStyle, detailItemsStyleAttribute)
  }

  const handleSendTestMessage = async () => {
    sendTestEmail()
    alert('test email sent')
  }

  const handleUpdateCount = async () => {
    await updateCount({ data: 1 }).then(() => {
      // this makes the count value update in the UI
      // router.invalidate()
    })
    setCount(await getCount())
  }

  return (
    <>
      <details>
        <summary>Developer Tools</summary>
        <div style={detailsItemsStyle}>
          <button type="button" onClick={handleSendTestMessage}>
            Send Test Email
          </button>
          <Spacer orientation={'horizontal'} />
          <button type="button" onClick={handleUpdateCount}>
            Add 1 to {count}
          </button>
        </div>
        <TanStackRouterDevtools initialIsOpen={false} position="bottom-right" router={router} />
      </details>
    </>
  )
}