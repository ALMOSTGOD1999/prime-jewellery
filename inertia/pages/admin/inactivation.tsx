import { Head, router } from '@inertiajs/react'
import AppLayout from '~/components/app/layout'
import { Header } from '~/components/app/header'
import { Main } from '~/components/app/main'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Badge } from '~/components/ui/badge'
import { useState, useEffect } from 'react'
import { formatUserId } from '~/lib/utils'

interface User {
  id: number
  name: string
  email: string
  phone: string
  status: string
  activatedAt: string | null
}

export default function AdminInactivationPage() {
  const [users, setUsers] = useState<User[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const url = search
        ? `/admin/users/lookup-users?search=${encodeURIComponent(search)}`
        : `/admin/users/lookup-users`
      const res = await fetch(url)
      const data = await res.json()
      setUsers(data.users || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleInactivate = (userId: number) => {
    router.post(
      `/admin/users/${userId}/inactivate`,
      {},
      {
        onSuccess: () => fetchUsers(),
      }
    )
  }

  const handleReactivate = (userId: number) => {
    router.post(
      `/admin/users/${userId}/reactivate`,
      {},
      {
        onSuccess: () => fetchUsers(),
      }
    )
  }

  return (
    <>
      <Head title="Inactivation" />
      <AppLayout>
        <Header>Inactivation</Header>
        <Main>
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="text-lg font-semibold mb-2">Manage User Inactivation</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Inactivating a user stops all income generation and monthly returns. Existing wallet
                amounts are preserved. Reactivate to resume.
              </p>

              <div className="flex gap-2 mb-4">
                <Input
                  placeholder="Search by name, email or ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="max-w-sm"
                />
                <Button onClick={fetchUsers} disabled={loading}>
                  {loading ? 'Loading...' : 'Search'}
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 text-sm font-medium">ID</th>
                      <th className="text-left p-3 text-sm font-medium">Name</th>
                      <th className="text-left p-3 text-sm font-medium">Email</th>
                      <th className="text-left p-3 text-sm font-medium">Phone</th>
                      <th className="text-left p-3 text-sm font-medium">Status</th>
                      <th className="text-right p-3 text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-t">
                        <td className="p-3 text-sm">{formatUserId(user.id)}</td>
                        <td className="p-3 text-sm font-medium">{user.name}</td>
                        <td className="p-3 text-sm text-muted-foreground">{user.email}</td>
                        <td className="p-3 text-sm text-muted-foreground">{user.phone}</td>
                        <td className="p-3">
                          <Badge variant={user.status === 'active' ? 'default' : 'destructive'}>
                            {user.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          {user.status === 'inactive' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReactivate(user.id)}
                            >
                              Reactivate
                            </Button>
                          ) : user.status === 'active' ? (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleInactivate(user.id)}
                            >
                              Inactivate
                            </Button>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              Blocked — unblock first
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && !loading && (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-muted-foreground">
                          No users found. Use search to find users.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Main>
      </AppLayout>
    </>
  )
}
