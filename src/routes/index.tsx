import { createFileRoute } from '@tanstack/react-router'
import { getCount } from '~/lib/count'
import { UserManagement } from '~stzUser/components/Other/UserManagement'
import { useGetAllUsers, useDeleteUserById, type User } from '~stzUser/lib/users-client'
import { Spacer } from '~stzUtils/components/Spacer'

export const Route = createFileRoute('/')({
  component: Home,
  loader: async () => {
    const [/* count, */users] = await Promise.all([
      // getCount(),
      useGetAllUsers()
    ])
    return { /* count, */users }
  },
})

function Home() {
  const {users} = Route.useLoaderData()

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

  return (
    <main>
      <section>
      <h1>Tanstack Start with Better Auth</h1>
      </section>

      <UserManagement users={users} />

    </main>
  )
}