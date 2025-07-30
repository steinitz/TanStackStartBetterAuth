import { getAllUsers, deleteUserById, type User } from '~stzUser/lib/users'
import { Spacer } from '~stzUtils/components/Spacer'
import { useState } from 'react'

export function UserManagement({users}) {
  const [adminUsers, setAdminUsers] = useState<Set<string>>(new Set())

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
      try {
        await deleteUserById({ data: userId })
        // Refresh the page to show updated user list
        window.location.reload()
      } catch (error) {
        console.error('Error deleting user:', error)
        alert('Failed to delete user')
      }
    }
  }

  const handleAdminToggle = (userId: string) => {
    const newAdminUsers = new Set(adminUsers)
    if (newAdminUsers.has(userId)) {
      newAdminUsers.delete(userId)
    } else {
      newAdminUsers.add(userId)
    }
    setAdminUsers(newAdminUsers)
    
    // TODO: Implement actual admin role assignment via Better Auth API
    console.log('Admin users:', Array.from(newAdminUsers))
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