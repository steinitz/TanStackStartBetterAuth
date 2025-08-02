// import { Route as RootRoute } from '~/routes/__root'; // Import the root route
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { sendTestEmail } from '~stzUser/lib/mail-utilities'
import { updateCount } from '~/lib/count'
import { useLoaderData, useRouter } from '@tanstack/react-router'
import { Spacer } from '~stzUtils/components/Spacer'
import { useEffect, useState } from 'react'
import { getCount } from '~/lib/count'
import { admin, useSession } from '~stzUser/lib/auth-client'
import { UserManagement } from '~stzUser/components/Other/UserManagement'
import { useGetAllUsers, type User } from '~stzUser/lib/users-client'

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
  const { data: session } = useSession()
  const [users, setUsers] = useState<User[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)


  useEffect(() => {
    // declare the data fetching function
    const doGetCount = async () => {
      setCount(await getCount())
    }

    // call the function
    doGetCount()
      // make sure to catch any error
      .catch(console.error);
  }, [])

  // Load users data when component mounts or session changes
  useEffect(() => {
    const loadUsers = async () => {
      if (!session?.user) return // Only load if user is signed in

      setIsLoadingUsers(true)
      try {
        const usersData = await useGetAllUsers()
        setUsers(usersData || [])
      } catch (error) {
        console.error('Error loading users:', error)
        setUsers([])
      } finally {
        setIsLoadingUsers(false)
      }
    }

    loadUsers()
  }, [session?.user?.id, session?.user?.role]) // Reload when user or role changes

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
    const userEmail = session?.user?.email || 'current user'

    const createErrorMessage = (errorMessage: string, isException = false) => {
      const failureType = isException ? 'failed with exception' : 'failed'
      return `❌ User ${userEmail} does not have admin privileges.\n\nBetter Auth reports a permission error on the test call to auth.listUsers: \n\n    ${failureType}: ${errorMessage}.`
    }

    try {
      const { data: users, error } = await admin.listUsers({
        query: {}
      })
      if (error) {
        console.error('listUsers error:', error)
        alert(createErrorMessage(error.message || 'Permission denied'))
      } else {
        console.log('✅ listUsers success:', users)
        const userCount = Array.isArray(users) ? users.length : (users?.users?.length || 0)
        alert(`✅ Call to admin.listUsers succeeded returning ${userCount} users. This confirms user ${userEmail} has admin privileges.`)
      }
    } catch (error) {
      console.error('listUsers exception:', error)
      alert(createErrorMessage(error.message || 'Permission denied', true))
    }
  }

  return (
    <>
      <details>
        <summary>Developer Tools</summary>
        <div style={detailsItemsStyle}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', flexDirection: 'row', gap: '10px' }}>
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

            <Spacer orientation={'vertical'} />

            {session?.user && (
              <div>
                <h3>User Management</h3>
                {isLoadingUsers ? (
                  <p>Loading users...</p>
                ) : (
                  <UserManagement users={users} />
                )}
              </div>
            )}
            
            <div>
              <section>
                <p>Session exists: {session?.user ? 'Yes' : 'No'}</p>
                <p>Session user: {session?.user?.email || 'Not signed in'}</p>
                <p>Loading users: {isLoadingUsers ? 'Yes' : 'No'}</p>
                <p>Users count: {users.length}</p>
              </section>
            </div>

          </div>

          </div>
      </details>

      {/* <TanStackRouterDevtools initialIsOpen={false} position="bottom-right" router={router} /> */}
    </>
  )
}