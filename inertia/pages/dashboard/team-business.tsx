import { Head, router } from '@inertiajs/react'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowLeft01Icon, Wallet01Icon } from '@hugeicons/core-free-icons'
import AppLayout from '~/components/app/layout'
import { Header } from '~/components/app/header'
import { Main } from '~/components/app/main'
import { Card, CardContent } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
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

interface Leg {
  id: number
  name: string
  volume: number
}

interface Legs {
  powerLeg: Leg | null
  weakerLegs: Leg[]
  weakerTotal: number
  grandTotal: number
}

interface TeamBusinessProps {
  purchases: Purchase[]
  page: number
  totalPages: number
  total: number
  legs: Legs
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function TeamBusinessPage({ purchases, page, totalPages, total, legs }: TeamBusinessProps) {
  const powerPercent = legs.grandTotal > 0 ? Math.round((legs.powerLeg?.volume || 0) / legs.grandTotal * 100) : 0
  const weakerPercent = legs.grandTotal > 0 ? Math.round(legs.weakerTotal / legs.grandTotal * 100) : 0
  const meets6040 = powerPercent >= 60 && weakerPercent >= 40

  return (
    <>
      <Head title="Total Business" />
      <AppLayout>
        <Header>Total Business</Header>
        <Main className="space-y-6">
          <button onClick={() => router.get('/dashboard')} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" /> Back to Dashboard
          </button>

          {/* Total */}
          <div className="relative overflow-hidden rounded-2xl border border-gold/20 bg-gradient-to-br from-gold/20 via-gold/5 to-transparent p-5">
            <p className="text-sm font-medium text-muted-foreground mb-1">Total Team Business</p>
            <p className="text-2xl font-bold tracking-tight text-gold">{formatCurrency(legs.grandTotal)}</p>
            <p className="text-xs text-muted-foreground mt-1">{total} purchases</p>
          </div>

          {/* 60:40 Power / Weaker Ratio */}
          {legs.grandTotal > 0 && (
            <Card className="border-border/50 shadow-sm">
              <div className="px-5 py-3 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">Power / Weaker Leg Ratio</p>
                  <Badge variant="outline" className={meets6040 ? 'bg-emerald/5 text-emerald border-emerald/20' : 'bg-amber-50 text-amber-600 border-amber-200'}>
                    {meets6040 ? '60:40 Met' : 'Below 60:40'}
                  </Badge>
                </div>
              </div>
              <div className="p-5 space-y-4">
                {/* Visual bar */}
                <div className="space-y-2">
                  <div className="flex h-4 rounded-full overflow-hidden bg-muted">
                    <div
                      className="bg-emerald transition-all duration-500"
                      style={{ width: `${powerPercent}%` }}
                    />
                    <div
                      className="bg-rose-300 transition-all duration-500"
                      style={{ width: `${weakerPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Power {powerPercent}%</span>
                    <span>Weaker {weakerPercent}%</span>
                  </div>
                </div>

                {/* Power leg */}
                {legs.powerLeg && (
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-emerald/5 border border-emerald/10">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-emerald shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{legs.powerLeg.name}</p>
                        <p className="text-xs text-muted-foreground">Power Leg · {formatUserId(legs.powerLeg.id, 'user')}</p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-emerald">{formatCurrency(legs.powerLeg.volume)}</p>
                  </div>
                )}

                {/* Weaker legs */}
                {legs.weakerLegs.map((leg) => (
                  <div key={leg.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-rose-50/50 border border-rose-100">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-rose-300 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{leg.name}</p>
                        <p className="text-xs text-muted-foreground">Weaker Leg · {formatUserId(leg.id, 'user')}</p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-rose-500">{formatCurrency(leg.volume)}</p>
                  </div>
                ))}

                {/* Weaker total */}
                {legs.weakerLegs.length > 1 && (
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30 border border-border/30">
                    <p className="text-sm text-muted-foreground">Combined Weaker ({legs.weakerLegs.length} legs)</p>
                    <p className="text-sm font-semibold text-foreground">{formatCurrency(legs.weakerTotal)}</p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Purchases list */}
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
              <div className="px-5 py-3 border-b border-border/50">
                <p className="text-sm font-semibold text-foreground">Purchase History</p>
              </div>
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
