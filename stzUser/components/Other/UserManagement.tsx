import {
  useDeleteUserById,
  useSetUserRole,
  useDemoteUserToUserRole,
  useUpdateEmailVerificationStatus,
  userManagementKeys,
  type User,
} from '~stzUser/lib/users-client'
import { adminStatusKeys } from '~stzUser/lib/admin-queries'
import { hasStoredAdminRole, type AdminSource } from '~stzUser/lib/admin-identity'
import { HelpDisclosure } from '~stzUtils/components/HelpDisclosure'
import { Spacer } from '~stzUtils/components/Spacer'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { userRoles, userRolesType } from '~stzUser/constants'
import { testConstants } from '~stzUser/test/constants'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  createColumnHelper,
  flexRender,
  type SortingState,
} from '@tanstack/react-table'

// takes a database date and formats it as 5 Aug 25
const niceFormattedDate = (dateStringFromDB: string | Date) => {
  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: '2-digit'
  }

  const date = new Date(dateStringFromDB)

  // 'en-US' for English (United States) locale, but 'au',
  // miraculously, gets the format I want: 5 Aug 25
  const formatter = new Intl.DateTimeFormat('au', options);

  return formatter.format(date);
}

const columnHelper = createColumnHelper<User>()

const adminSourceLabels: Record<AdminSource, string> = {
  none: 'User',
  role: 'Stored-role admin',
  environment: 'Environment admin',
  both: 'Stored-role and environment admin',
}

const adminSourceRank: Record<AdminSource, number> = {
  none: 0,
  role: 1,
  environment: 2,
  both: 3,
}

function copyUserId(userId: string) {
  navigator.clipboard.writeText(userId)
  alert('User ID copied to clipboard!')
}

function AdminConfigurationDisclosure({ source }: { source: 'environment' | 'both' }) {
  return (
    <HelpDisclosure label={`Explain ${adminSourceLabels[source]}`}>
      <p>
        Admin set through <code>ADMIN_USER_IDS</code> in a deployment environment variable or
        an environment file such as <code>.env.production</code> or{' '}
        <code>.env.development</code>. It is not editable here.
      </p>
      <p>To convert this account to database-based admin:</p>
      <ol>
        <li>Ensure you have a second admin account.</li>
        <li>Remove the target user ID from <code>ADMIN_USER_IDS</code>.</li>
        <li>Restart or redeploy the app. The target will temporarily lose admin access.</li>
        <li>Sign in as the second administrator.</li>
        <li>Return here and enable <strong>Stored admin role</strong> for the target account.</li>
      </ol>
      <p>The target finishes with the same admin privileges, now stored in the database.</p>
    </HelpDisclosure>
  )
}

// Every callback and value used by the table columns is module-owned, so the
// strongest stable identity is a module constant rather than hook machinery.
const userManagementColumns = [
  columnHelper.accessor('name', {
    header: 'Name',
    cell: info => <strong>{info.getValue() || 'No name'}</strong>,
    enableSorting: true,  // doesn't seem necessary
  }),
  columnHelper.accessor('email', {
    header: 'Email',
    cell: info => info.getValue(),
    enableSorting: true,  // doesn't seem necessary
  }),
  columnHelper.accessor('createdAt', {
    header: 'Joined',
    // cell: info => `${new Date(info.getValue()).toLocaleDateString('en-US')}`,
    cell: info => niceFormattedDate(info.getValue()),
    enableSorting: true,  // doesn't seem necessary
    sortingFn: (rowA, rowB) => {
      const dateA = new Date(rowA.getValue('createdAt'))
      const dateB = new Date(rowB.getValue('createdAt'))
      return dateA.getTime() - dateB.getTime()
    },
  }),
  columnHelper.accessor('emailVerified', {
    header: 'Status',
    cell: info => info.getValue() ? 'Verified' : 'Unverified',
    enableSorting: true, // doesn't seem necessary
    sortingFn: (rowA, rowB) => {
      const valueA = rowA.getValue('emailVerified')
      const valueB = rowB.getValue('emailVerified')
      return valueA === valueB ? 0 : valueA ? 1 : -1
    },
  }),
  // This could be a columnHelper.display but sorting
  // doesn't seem to get enabled for that column type
  // Other have reported this issue/bug since 2022.
  columnHelper.accessor('id', {
    id: 'role',
    header: 'Admin access',
    cell: ({ row }) => {
      const user = row.original
      return (
        <span style={{ color: 'var(--color-text)', lineHeight: '1.5rem' }}>
          <span>{adminSourceLabels[user.adminSource]} {user.adminSource === 'none' ? '👤' : '👑'}</span>
          {user.adminSource === 'environment' || user.adminSource === 'both' ? (
            <AdminConfigurationDisclosure source={user.adminSource} />
          ) : null}
        </span>
      )
    },
    enableSorting: true,
    sortingFn: (rowA, rowB) => {
      return adminSourceRank[rowB.original.adminSource] -
        adminSourceRank[rowA.original.adminSource]
    },
  }),
  columnHelper.display({
    id: 'userId',
    header: 'User ID',
    cell: ({ row }) => {
      const user = row.original
      return (
        <div style={{ fontSize: '12px', fontFamily: 'monospace' }}>
          <span
            onClick={() => copyUserId(user.id)}
            style={{ cursor: 'pointer', textDecoration: 'underline', color: 'var(--color-link)' }}
            title="Click to copy User ID"
          >
            ID: {user.id.substring(0, 8)}...
          </span>
        </div>
      )
    },
  }),
]

export function UserManagement({ users }: { users: User[] }) {
  const queryClient = useQueryClient()
  const [sorting, setSorting] = useState<SortingState>([])
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const selectedUser = users.find((user) => user.id === selectedUserId) ?? null

  const refreshUsers = async () => {
    await queryClient.invalidateQueries({ queryKey: userManagementKeys.all })
  }

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
      try {
        await useDeleteUserById({ data: userId })
        setSelectedUserId(null)
        await refreshUsers()
      } catch (error) {
        console.error('Error deleting user:', error)
        // Show the specific error message from the server
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete user'
        alert(errorMessage)
      }
    }
  }

  const handleCleanTestUsers = async () => {
    const testUsers = users.filter(user =>
      // user.name === testConstants.defaultUserName && // this prevented deletion of certain test users
      (user.email.endsWith('@example.com') || user.email.endsWith(`@${testConstants.defaultUserDomain}`))
    )

    if (testUsers.length === 0) {
      alert('No test users found to delete.')
      return
    }

    if (confirm(`Are you sure you want to delete ${testUsers.length} test user(s)? This action cannot be undone.\n\nUsers to be deleted:\n${testUsers.map(u => `• ${u.name} (${u.email})`).join('\n')}`)) {
      try {
        // Delete users in sequence to avoid overwhelming the server
        for (const user of testUsers) {
          await useDeleteUserById({ data: user.id })
        }
        setSelectedUserId(null)
        await refreshUsers()
      } catch (error) {
        console.error('Error deleting test users:', error)
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete test users'
        alert(errorMessage)
      }
    }
  }

  const handleAdminToggle = async (userId: string) => {
    const user = users.find((candidate) => candidate.id === userId)
    if (!user || user.adminSource === 'environment' || user.adminSource === 'both') return

    const isCurrentlyAdmin = hasStoredAdminRole(user.role)

    try {
      if (isCurrentlyAdmin) {
        // Demote from admin to regular user
        await useDemoteUserToUserRole({ data: { userId } })
      } else {
        // Add admin role
        await useSetUserRole({ data: { userId, role: userRoles.admin as userRolesType } })
      }

      await Promise.all([
        refreshUsers(),
        queryClient.invalidateQueries({ queryKey: adminStatusKeys.all }),
      ])
      console.log('Admin role updated for user:', userId, 'Is admin:', !isCurrentlyAdmin)
    } catch (error) {
      console.error('Error updating admin role:', error)
      alert('Failed to update admin role')
    }
  }

  const handleEmailVerificationToggle = async (userId: string) => {
    if (!selectedUser || selectedUser.id !== userId) return

    const newEmailVerified = !selectedUser.emailVerified

    try {
      await useUpdateEmailVerificationStatus({ data: { userId, emailVerified: newEmailVerified } })
      await refreshUsers()

      console.log('Email verification status updated for user:', userId, 'Verified:', newEmailVerified)
    } catch (error) {
      console.error('Error updating email verification status:', error)
      alert('Failed to update email verification status')
    }
  }

  const table = useReactTable({
    data: users,
    columns: userManagementColumns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const checkboxAndLabelFlexStyle = {
    display: 'flex', // don't need because mvc.css inlines
    alignItems: 'center',
    width: '50px', // without this box and label are really wide
    marginLeft: '-20px',
    marginTop: '-13px', // why needed?


    // marginTop: '-10px' // can't get them verticallyl aligned without

    // failed tries:
    // paddingTop: '0', // no effect
    // paddingBottom: '0',  // no effect
    // textAlign: 'left', // causes typescript error
    // selfAlign: 'flex-start' // no effect
  }

  const checkboxStyle = {
    // margin: '0',
    // no effect maxWidth: '8px',
    // padding: '0',
  }
  const checkboxLabelStyle = {
    whiteSpace: 'nowrap',
    marginTop: '-12px' // aligns label and check box and packs the whole row tighter to match the other fields
    // margin: '0',


    //marginTop: '5px',
  }

  const CheckboxAndLabel = (
    {
      checked,
      changeHandler,
      label,
      inputId,
      userId,
    }: {
      checked: boolean,
      changeHandler: (userId: string) => void,
      label: string,
      inputId: string,
      userId: string,
    }
  ) => {
    return (
      <div
        style={checkboxAndLabelFlexStyle}
      >
        <input
          style={checkboxStyle}
          type="checkbox"
          id={inputId}
          checked={checked}
          onChange={() => changeHandler(userId)}
        />
        <label
          style={checkboxLabelStyle}
          htmlFor={inputId}
        >
          {label}
        </label>
      </div>
    )
  }

  return (
    <main>
      <section>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem' }}>
          <h3>Registered Users ({users.length})</h3>
          <div style={{ marginBottom: '1rem' }}>
            <button
              type="button"
              onClick={handleCleanTestUsers}
              style={{
                backgroundColor: "var(--color-warning, #ff9800)",
                borderColor: "var(--color-warning, #ff9800)",
                fontSize: '0.9rem',
                padding: '0.5rem 1rem'
              }}
            >
              Clean Test Users
            </button>
          </div>
        </div>
        <Spacer space={0} />
        {users.length === 0 ? (
          <p>No users registered yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', width: 'fit-content', margin: '0 auto' }}>
            <table style={{ borderCollapse: 'collapse' }}>
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
                          fontWeight: 'bold',
                          cursor: header.column.getCanSort() ? 'pointer' : 'default',
                          userSelect: 'none',
                          transition: 'background-color 0.2s ease'
                        }}
                        onClick={header.column.getToggleSortingHandler()}
                        onMouseEnter={(e) => {
                          if (header.column.getCanSort()) {
                            e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary, #f5f5f5)'
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                          {header.column.getCanSort() && (
                            <span style={{
                              fontSize: '14px',
                              opacity: 0.6,
                              fontWeight: 'normal',
                              minWidth: '12px',
                              textAlign: 'center'
                            }}>
                              {{
                                asc: '↑',
                                desc: '↓',
                              }[header.column.getIsSorted() as string] ?? '↕'}
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map(row => (
                  <tr
                    key={row.id}
                    onClick={() => {
                      const user = row.original
                      setSelectedUserId(user.id)
                    }}
                    style={{
                      cursor: 'pointer',
                      transition: 'background-color 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }}
                  >
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

        {selectedUser && (
          <>
            <Spacer />
            <section>
              <h3><span style={{ fontWeight: 'normal' }}>Edit User &nbsp;</span>{selectedUser.name || selectedUser.email}</h3>
              <Spacer space={0} />

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  // no effect: justifyContent: 'flex-start',
                  // no effect: alignItems: 'flex-start',
                  gap: '1rem'
                }}>
                <div>
                  <p><strong>Email:</strong> {selectedUser.email}</p>
                  <p><strong>ID:</strong> {selectedUser.id}</p>
                  <p><strong>Admin access:</strong> {adminSourceLabels[selectedUser.adminSource]}</p>
                </div>

                <CheckboxAndLabel
                  checked={selectedUser.emailVerified}
                  changeHandler={handleEmailVerificationToggle}
                  label={'Email Verified'}
                  inputId={'email-verified-checkbox'}
                  userId={selectedUser.id}
                />

                {selectedUser.adminSource === 'environment' || selectedUser.adminSource === 'both' ? (
                  <p>
                    <strong>Stored admin role:</strong>{' '}
                    {hasStoredAdminRole(selectedUser.role) ? 'Enabled' : 'Not enabled'} — read-only
                    while environment configuration grants this account admin access.
                  </p>
                ) : (
                  <CheckboxAndLabel
                    checked={hasStoredAdminRole(selectedUser.role)}
                    changeHandler={handleAdminToggle}
                    label={'Stored admin role'}
                    inputId={'admin-role-checkbox'}
                    userId={selectedUser.id}
                  />
                )}

                <div style={{ display: 'flex', justifyContent: 'stretch' }}>
                  <button
                    type="button"
                    onClick={() => handleDeleteUser(selectedUser.id, selectedUser.name || selectedUser.email)}
                    style={{
                      backgroundColor: "var(--color-error)",
                      borderColor: "var(--color-error)"
                    }}
                  >
                    Delete User
                  </button>
                  <Spacer orientation='horizontal' />
                  <button
                    type="button"
                    onClick={() => setSelectedUserId(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </section>
          </>
        )}
      </section>
    </main>
  )
}
