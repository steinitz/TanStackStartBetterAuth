// import { Route as RootRoute } from '~/routes/__root'; // Import the root route
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { sendTestEmail } from '~stzUser/lib/mail-utilities'
import { updateCount } from '~/lib/count'
import { useLoaderData, useRouter } from '@tanstack/react-router'
import { Spacer } from '~stzUtils/components/Spacer'
import { useEffect, useState } from 'react'
import { getCount } from '~/lib/count'
import { admin, useSession } from '~stzUser/lib/auth-client'

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
  const {data: session} = useSession()
  
   
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

  const testListUsers = async () => {
    try {
      const { data: users, error } = await admin.listUsers({
        query: {}
      })
      if (error) {
        console.error('listUsers error:', error)
        alert(`❌ listUsers failed: ${error.message || 'Permission denied'}`)
      } else {
        console.log('✅ listUsers success:', users)
        const userCount = Array.isArray(users) ? users.length : (users?.users?.length || 0)
        const userEmail = session?.user?.email || 'current user'
        alert(`✅ Call to admin.listUsers succeeded returning ${userCount} users. This confirms user ${userEmail} has admin privileges.`)
      }
    } catch (error) {
      console.error('listUsers exception:', error)
      alert(`❌ listUsers exception: ${error.message || 'Permission denied'}`)
    }
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
          <Spacer orientation={'horizontal'} />
          <button type="button" onClick={testListUsers}>
            Test Admin Privilege
          </button>
        </div>
        <TanStackRouterDevtools initialIsOpen={false} position="bottom-right" router={router} />
      </details>
    </>
  )
}