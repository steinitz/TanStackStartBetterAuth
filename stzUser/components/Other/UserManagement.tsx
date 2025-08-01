import { useDeleteUserById, useSetUserRole, useRemoveUserRole, type User } from '~stzUser/lib/users-client'
import { Spacer } from '~stzUtils/components/Spacer'
import { useState, useEffect } from 'react'
import { admin, useSession } from '~stzUser/lib/auth-client'
import { userRoles, userRolesType } from '~stzUser/constants'

export function UserManagement({users}) {
  const {data: session} = useSession()
  const signedInUser = session?.user
  const signedInUserHasAdminRole = signedInUser?.role === userRoles.admin

  const [adminUsers, setAdminUsers] = useState<Set<string>>(new Set())

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
      try {
        await useDeleteUserById({ data: userId })
        // Refresh the page to show updated user list
        window.location.reload()
      } catch (error) {
        console.error('Error deleting user:', error)
        // Show the specific error message from the server
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete user'
        alert(errorMessage)
      }
    }
  }

  const handleAdminToggle = async (userId: string) => {
    const newAdminUsers = new Set(adminUsers)
    const isCurrentlyAdmin = newAdminUsers.has(userId)
    
    try {
      if (isCurrentlyAdmin) {
        // Remove admin role
        await useRemoveUserRole({ data: { userId } })
        newAdminUsers.delete(userId)
      } else {
        // Add admin role
        await useSetUserRole({ data: { userId, role: userRoles.admin as userRolesType } })
        newAdminUsers.add(userId)
      }
      
      setAdminUsers(newAdminUsers)
      console.log('Admin role updated for user:', userId, 'Is admin:', !isCurrentlyAdmin)
    } catch (error) {
      console.error('Error updating admin role:', error)
      alert('Failed to update admin role')
    }
  }

  const copyUserId = (userId: string) => {
    navigator.clipboard.writeText(userId)
    alert('User ID copied to clipboard!')
  }

  // Load admin users on component mount
  useEffect(() => {
    const loadAdminUsers = async () => {
      try {
        const { data: usersData, error } = await admin.listUsers({
          query: {}
        })
        if (!error && usersData) {
          const usersList = Array.isArray(usersData) ? usersData : usersData.users || []
          const adminUserIds = new Set(
            usersList
              .filter(user => user.role === userRoles.admin)
              .map(user => user.id)
          )
          setAdminUsers(adminUserIds)
          console.log('Loaded admin users:', adminUserIds)
        }
      } catch (error) {
        console.error('Error loading admin users:', error)
      }
    }
    
    loadAdminUsers()
  }, [])

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
        alert(`✅ listUsers success! Found ${userCount} users`)
      }
    } catch (error) {
      console.error('listUsers exception:', error)
      alert(`❌ listUsers exception: ${error.message || 'Permission denied'}`)
    }
  }

  return (
    <main>
      <section>
       <button 
          onClick={testListUsers}
        >
          Test Admin Privilege
        </button>
        <Spacer/>
        <h3>Registered Users ({users.length})</h3>
         {users.length === 0 ? (
          <p>No users registered yet.</p>
        ) : (
          <article style={{width: '100%'}}>
            {users.map((user: User) => (
              <div 
                key={user.id} 
                style={{
                  display: 'flex', 
                  alignItems: 'flex-end', 
                  justifyContent: 'space-between', 
                  flexDirection: 'row', 
                  width: '100%',
                  marginBottom: '21px',
                  textAlign: 'left'
                }}
                >
                  <div >
                    <strong>{user.name || 'No name'}</strong>
                  </div>
                  <div>
                    {user.email}
                  </div>
                  <div >
                    Joined: {new Date(user.createdAt).toLocaleDateString('en-US')}
                  </div>
                  <div>
                    {user.emailVerified ? 'Verified' : 'Unverified'}
                  </div>
                  {signedInUserHasAdminRole && 
                    <div 
                      style={{
                        color: (adminUsers.has(user.id) ? 
                          'var(--color-text)' : 
                          'var(--color-text-secondary)')
                        }
                      }>
                      Role: {adminUsers.has(user.id) ? userRoles.admin : userRoles.user}&nbsp;
                            {adminUsers.has(user.id) ? '👑' : '👤'}
                    </div>
                  }
                  <div style={{fontSize: '12px', fontFamily: 'monospace'}}>
                    <span 
                      onClick={() => copyUserId(user.id)}
                      style={{cursor: 'pointer', textDecoration: 'underline', color: '#0066cc'}}
                      title="Click to copy User ID"
                    >
                      ID: {user.id.substring(0, 8)}...
                    </span>
                  </div>
                {signedInUserHasAdminRole && <>
                  <div style={{ marginBottom: '-17px', }}>
                    <label style={{ display: 'flex', fontSize: '13px' }}>
                      <input
                        type="checkbox"
                        checked={adminUsers.has(user.id)}
                        onChange={() => handleAdminToggle(user.id)}
                        style={{ marginRight: '-0px', marginLeft: '-21px' }}
                      />
                      Admin
                    </label>
                  </div>
                  <div>
                    <button
                      onClick={() => handleDeleteUser(user.id, user.name || user.email)}
                      style={{
                        backgroundColor: "var(--color-error)",
                        borderColor: "var(--color-error)",
                        paddingTop: '0px',
                        paddingLeft: '3px',
                        paddingRight: '3px',
                        fontSize: '12px',
                        marginBottom: '-10px',
                        height: '21px',
                      }}
                    >
                      Delete
                    </button>
                  </div>
                  </>
                }
              </div>
            ))}
          </article>
        )}
      </section>
    </main>
  )
}