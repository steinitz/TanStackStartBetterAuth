import { useGetAllUsers, useDeleteUserById, useSetUserRole, useRemoveUserRole, type User } from '~stzUser/lib/users-client'
import { Spacer } from '~stzUtils/components/Spacer'
import { useState } from 'react'

export function UserManagement({users}) {
  const [adminUsers, setAdminUsers] = useState<Set<string>>(new Set())

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
      try {
        await useDeleteUserById({ data: userId })
        // Refresh the page to show updated user list
        window.location.reload()
      } catch (error) {
        console.error('Error deleting user:', error)
        alert('Failed to delete user')
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
        await useSetUserRole({ data: { userId, role: 'admin' } })
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

  return (
    <main>
      <section>
        <h3>Registered Users ({users.length})</h3>
        <Spacer/>
        {users.length === 0 ? (
          <p>No users registered yet.</p>
        ) : (
          <article style={{width: '100%'}}>
            {users.map((user: User) => (
              <div 
                key={user.id} 
                style={{
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  flexDirection: 'row', 
                  width: '100%',
                  marginBottom: '21px'
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
                  <div style={{fontSize: '12px', fontFamily: 'monospace'}}>
                    <span 
                      onClick={() => copyUserId(user.id)}
                      style={{cursor: 'pointer', textDecoration: 'underline', color: '#0066cc'}}
                      title="Click to copy User ID"
                    >
                      ID: {user.id.substring(0, 8)}...
                    </span>
                  </div>
                  <div >
                    <label style={{display: 'flex', fontSize: '13px'}}>
                      <input
                        type="checkbox"
                        checked={adminUsers.has(user.id)}
                        onChange={() => handleAdminToggle(user.id)}
                        style={{marginRight: '-0px', marginLeft: '-21px'}}
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
                        marginTop: '-14px',
                        height: '21px',
                      }}
                    >
                      Delete
                    </button>
                  </div>
                  </div>
            ))}
          </article>
        )}
      </section>
    </main>
  )
}