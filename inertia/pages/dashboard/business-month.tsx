import { Head, router } from '@inertiajs/react'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowLeft01Icon, Calendar01Icon } from '@hugeicons/core-free-icons'
import AppLayout from '~/components/app/layout'
import { Header } from '~/components/app/header'
import { Main } from '~/components/app/main'
import { Card, CardContent } from '~/components/ui/card'
import { formatUserId } from '~/lib/utils'

interface Purchase {
  id: string
  amount: number
  buyer_name: string
  approved_at: string | null
  created_at: string
  member_id: number
  member_name: string
}

interface BusinessMonthProps {
  purchases: Purchase[]
  page: number
  totalPages: number
  total: number
  month: string
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function BusinessMonthPage({ purchases, page, totalPages, total, month }: BusinessMonthProps) {
  const totalAmount = purchases.reduce((sum, p) => sum + Number(p.amount), 0)

  return (
    <>
      <Head title="Business (Month)" />
      <AppLayout>
        <Header>Business ({month})</Header>
        <Main className="space-y-6">
          <button onClick={() => router.get('/dashboard')} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" /> Back to Dashboard
          </button>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="relative overflow-hidden rounded-2xl border border-sky/20 bg-gradient-to-br from-sky/20 via-sky/5 to-transparent p-5">
              <p className="text-sm font-medium text-muted-foreground mb-1">Purchases This Month</p>
              <p className="text-2xl font-bold tracking-tight text-sky">{total}</p>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-sky/20 bg-gradient-to-br from-sky/20 via-sky/5 to-transparent p-5">
              <p className="text-sm font-medium text-muted-foreground mb-1">Total Amount</p>
              <p className="text-2xl font-bold tracking-tight text-sky">{formatCurrency(totalAmount)}</p>
            </div>
          </div>

          {purchases.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="inline-flex size-12 items-center justify-center rounded-xl bg-sky/10 text-sky mb-4">
                  <HugeiconsIcon icon={Calendar01Icon} className="size-6" />
                </div>
                <p className="text-muted-foreground">No team purchases this month.</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/50 shadow-sm overflow-hidden">
              <div className="divide-y divide-border/50">
                {purchases.map((p) => (
                  <div key={p.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors">
                    <div className="inline-flex size-9 items-center justify-center rounded-xl bg-sky/10 text-sky shrink-0">
                      <HugeiconsIcon icon={Calendar01Icon} className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{p.member_name} {formatUserId(p.member_id, 'user')}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{p.buyer_name || 'Gold Purchase'} · {formatDate(p.approved_at || p.created_at)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-foreground">{formatCurrency(Number(p.amount))}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button onClick={() => router.get(`/dashboard/business-month?page=${page - 1}`)} disabled={page <= 1} className="px-3 py-1.5 text-sm rounded-lg border border-border/50 hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Previous</button>
              <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
              <button onClick={() => router.get(`/dashboard/business-month?page=${page + 1}`)} disabled={page >= totalPages} className="px-3 py-1.5 text-sm rounded-lg border border-border/50 hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Next</button>
            </div>
          )}
        </Main>
      </AppLayout>
    </>
  )
}
