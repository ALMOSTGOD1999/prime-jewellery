import { Head, router } from '@inertiajs/react'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowLeft01Icon, Wallet01Icon } from '@hugeicons/core-free-icons'
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

interface TeamBusinessProps {
  purchases: Purchase[]
  page: number
  totalPages: number
  total: number
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function TeamBusinessPage({ purchases, page, totalPages, total }: TeamBusinessProps) {
  return (
    <>
      <Head title="Total Business" />
      <AppLayout>
        <Header>Total Business</Header>
        <Main className="space-y-6">
          <button onClick={() => router.get('/dashboard')} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" /> Back to Dashboard
          </button>

          <div className="relative overflow-hidden rounded-2xl border border-gold/20 bg-gradient-to-br from-gold/20 via-gold/5 to-transparent p-5">
            <p className="text-sm font-medium text-muted-foreground mb-1">Total Team Business</p>
            <p className="text-2xl font-bold tracking-tight text-gold">{total} purchases</p>
          </div>

          {purchases.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="inline-flex size-12 items-center justify-center rounded-xl bg-gold/10 text-gold mb-4">
                  <HugeiconsIcon icon={Wallet01Icon} className="size-6" />
                </div>
                <p className="text-muted-foreground">No team purchases yet.</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/50 shadow-sm overflow-hidden">
              <div className="divide-y divide-border/50">
                {purchases.map((p) => (
                  <div key={p.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors">
                    <div className="inline-flex size-9 items-center justify-center rounded-xl bg-gold/10 text-gold shrink-0">
                      <HugeiconsIcon icon={Wallet01Icon} className="size-4" />
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
              <button onClick={() => router.get(`/dashboard/team-business?page=${page - 1}`)} disabled={page <= 1} className="px-3 py-1.5 text-sm rounded-lg border border-border/50 hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Previous</button>
              <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
              <button onClick={() => router.get(`/dashboard/team-business?page=${page + 1}`)} disabled={page >= totalPages} className="px-3 py-1.5 text-sm rounded-lg border border-border/50 hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Next</button>
            </div>
          )}
        </Main>
      </AppLayout>
    </>
  )
}
