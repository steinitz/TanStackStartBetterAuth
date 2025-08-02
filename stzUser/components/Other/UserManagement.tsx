import { useDeleteUserById, useSetUserRole, useRemoveUserRole, type User } from '~stzUser/lib/users-client'
import { Spacer } from '~stzUtils/components/Spacer'
import { useState, useEffect, useMemo } from 'react'
import { admin, useSession } from '~stzUser/lib/auth-client'
import { userRoles, userRolesType } from '~stzUser/constants'
import { useReactTable, getCoreRowModel, createColumnHelper, flexRender } from '@tanstack/react-table'

export function UserManagement({users}) {
  const {data: session} = useSession()
  const signedInUser = session?.user
  const signedInUserHasAdminRole = signedInUser?.role === userRoles.admin

  const [adminUsers, setAdminUsers] = useState<Set<string>>(new Set())
  const columnHelper = createColumnHelper<User>()

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

  const columns = useMemo(() => [
    columnHelper.accessor('name', {
      header: 'Name',
      cell: info => <strong>{info.getValue() || 'No name'}</strong>,
    }),
    columnHelper.accessor('email', {
      header: 'Email',
      cell: info => info.getValue(),
    }),
    columnHelper.accessor('createdAt', {
      header: 'Joined',
      cell: info => `Joined: ${new Date(info.getValue()).toLocaleDateString('en-US')}`,
    }),
    columnHelper.accessor('emailVerified', {
      header: 'Status',
      cell: info => info.getValue() ? 'Verified' : 'Unverified',
    }),
    ...(signedInUserHasAdminRole ? [
      columnHelper.display({
        id: 'role',
        header: 'Role',
        cell: ({ row }) => {
          const user = row.original
          return (
            <div
              style={{
                color: (adminUsers.has(user.id) ? 
                  'var(--color-text)' : 
                  'var(--color-text-secondary)')
              }}
            >
              Role: {adminUsers.has(user.id) ? userRoles.admin : userRoles.user}&nbsp;
              {adminUsers.has(user.id) ? '👑' : '👤'}
            </div>
          )
        },
      })
    ] : []),
    columnHelper.display({
      id: 'userId',
      header: 'User ID',
      cell: ({ row }) => {
        const user = row.original
        return (
          <div style={{fontSize: '12px', fontFamily: 'monospace'}}>
            <span 
              onClick={() => copyUserId(user.id)}
              style={{cursor: 'pointer', textDecoration: 'underline', color: '#0066cc'}}
              title="Click to copy User ID"
            >
              ID: {user.id.substring(0, 8)}...
            </span>
          </div>
        )
      },
    }),
    ...(signedInUserHasAdminRole ? [
      columnHelper.display({
        id: 'adminToggle',
        header: 'Admin',
        cell: ({ row }) => {
          const user = row.original
          return (
            <div style={{ marginBottom: '-17px' }}>
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
          )
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const user = row.original
          return (
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
          )
        },
      })
    ] : []),
  ], [adminUsers, signedInUserHasAdminRole, handleAdminToggle, handleDeleteUser, copyUserId])

  const table = useReactTable({
    data: users,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <main>
      <section>
        <h3>Registered Users ({users.length})</h3>
        {users.length === 0 ? (
          <p>No users registered yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <th
                        key={header.id}
                        style={{
                          padding: '8px',
                          textAlign: 'left',
                          borderBottom: '2px solid var(--color-border)',
                          fontWeight: 'bold'
                        }}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map(row => (
                  <tr key={row.id}>
                    {row.getVisibleCells().map(cell => (
                      <td
                        key={cell.id}
                        style={{
                          padding: '8px',
                          borderBottom: '1px solid var(--color-border)',
                          verticalAlign: 'top'
                        }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}