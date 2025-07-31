import { Route as RootRoute } from '~/routes/__root'; // Import the root route
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { sendTestEmail } from '~stzUser/lib/mail-utilities'
import { updateCount } from '~/lib/count'
import { useLoaderData, useRouter } from '@tanstack/react-router'
import { Spacer } from '~stzUtils/components/Spacer'
import { useEffect, useState } from 'react'

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
  const [isClient, setIsClient] = useState(false)
  const {count} = useLoaderData({from: RootRoute.id})
  const router = useRouter()
  
  useEffect(() => {
    setIsClient(true)
  }, [])
  
  if (!isClient) {
    return null
  }

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
      router.invalidate()
    })
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