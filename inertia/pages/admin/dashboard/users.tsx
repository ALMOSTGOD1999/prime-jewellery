import { router } from '@inertiajs/react'
import { Head } from '@inertiajs/react'
import AppLayout from '~/components/app/layout'
import { Header } from '~/components/app/header'
import { Main } from '~/components/app/main'
import { Card, CardContent } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { formatUserId, formatDate } from '~/lib/utils'

interface User {
  id: number
  name: string
  email: string | null
  phone: string | null
  status: string
  activated_at: string | null
  parent_id: number | null
  created_at: string
}

interface UsersPageProps {
  users: User[]
  page: number
  totalPages: number
  total: number
  title: string
}

export default function AdminDashboardUsersPage({ users, page, totalPages, total, title }: UsersPageProps) {
  const goToPage = (p: number) => {
    const url = new URL(window.location.href)
    url.searchParams.set('page', String(p))
    router.get(url.pathname + url.search)
  }

  return (
    <>
      <Head title={title} />
      <AppLayout>
        <Header>
          <button onClick={() => router.get('/dashboard')} className="text-muted-foreground hover:text-foreground text-sm mr-2">
            ← Dashboard
          </button>
          {title}
        </Header>
        <Main className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{total.toLocaleString('en-IN')} users</p>
          </div>

          {users.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="py-8 text-center text-muted-foreground">No users found.</CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {users.map((u) => (
                <Card key={u.id} className="border-border/50 hover:shadow-sm transition-shadow">
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`size-2 rounded-full shrink-0 ${u.activated_at ? 'bg-emerald-500' : 'bg-red-400'}`} />
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{u.name}</p>
                        <p className="text-xs text-muted-foreground">{formatUserId(u.id)} · {u.email || u.phone || '—'}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge variant={u.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                        {u.status}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">{formatDate(u.created_at)}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                className="px-3 py-1.5 text-sm rounded-lg border border-border/50 bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
              <button
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-sm rounded-lg border border-border/50 bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </Main>
      </AppLayout>
    </>
  )
}
