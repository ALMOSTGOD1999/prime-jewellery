import { Head } from '@inertiajs/react'
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

export default function AdminBlockingPage() {
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

  const handleBlock = async (userId: number) => {
    try {
      const res = await fetch(`/admin/users/${userId}/block`, { method: 'POST' })
      if (res.ok) {
        fetchUsers()
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleUnblock = async (userId: number) => {
    try {
      const res = await fetch(`/admin/users/${userId}/unblock`, { method: 'POST' })
      if (res.ok) {
        fetchUsers()
      }
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <>
      <Head title="Blocking" />
      <AppLayout>
        <Header>Blocking</Header>
        <Main>
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="text-lg font-semibold mb-2">Manage User Blocking</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Blocking a user prevents them from accessing their account. Income generation
                continues while blocked. The user will see "Your account is blocked by Admin" when
                trying to log in.
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
                          <Badge
                            variant={user.status === 'blocked' ? 'destructive' : 'default'}
                          >
                            {user.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          {user.status === 'blocked' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUnblock(user.id)}
                            >
                              Unblock
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleBlock(user.id)}
                            >
                              Block
                            </Button>
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
