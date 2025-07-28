import { Spacer } from '~stzUtils/components/Spacer'
import { sendTestEmail } from '~stzUser/lib/mail-utilities'
import { getCount, updateCount } from '~/lib/count'
import { useLoaderData, useRouter } from '@tanstack/react-router'

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
  // const count = useLoaderData({ from: '/_app' })

  const router = useRouter()
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
    // await updateCount({ data: 1 }).then(() => {
    //   // this makes the count value update in the UI
    //   router.invalidate()
    // })
  }

  return (
    <details>
      <summary>Developer Tools</summary>
      <div style={detailsItemsStyle}>
        <button type="button" onClick={handleSendTestMessage}>
          Send Test Email
        </button>
        <Spacer orientation={'horizontal'} />
        <button type="button" onClick={handleUpdateCount}>
          {/* Add 1 to {count} */}
          Add 1 to NaN
        </button>
      </div>
    </details>
  )
}