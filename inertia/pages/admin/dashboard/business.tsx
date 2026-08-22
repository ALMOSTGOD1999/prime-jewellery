import { router } from '@inertiajs/react'
import { Head } from '@inertiajs/react'
import AppLayout from '~/components/app/layout'
import { Header } from '~/components/app/header'
import { Main } from '~/components/app/main'
import { Card, CardContent } from '~/components/ui/card'
import { formatUserId, formatDate } from '~/lib/utils'

interface Purchase {
  id: string
  amount: number
  buyer_name: string | null
  approved_at: string
  created_at: string
  member_id: number
  member_name: string
}

interface BusinessPageProps {
  purchases: Purchase[]
  page: number
  totalPages: number
  total: number
  title: string
}

export default function AdminDashboardBusinessPage({ purchases, page, totalPages, total, title }: BusinessPageProps) {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)

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
            <p className="text-sm text-muted-foreground">{total.toLocaleString('en-IN')} purchases</p>
          </div>

          {purchases.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="py-8 text-center text-muted-foreground">No purchases found.</CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {purchases.map((p) => (
                <Card key={p.id} className="border-border/50 hover:shadow-sm transition-shadow">
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{p.buyer_name || p.member_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatUserId(p.member_id)} · {p.id}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-foreground">{formatCurrency(p.amount)}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(p.approved_at)}</p>
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
