import { Head, router } from '@inertiajs/react'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowLeft01Icon, Wallet01Icon } from '@hugeicons/core-free-icons'
import AppLayout from '~/components/app/layout'
import { Header } from '~/components/app/header'
import { Main } from '~/components/app/main'
import { Card, CardContent } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'

interface Purchase {
  id: string
  amount: number
  buyer_name: string
  quantity: number
  gold_weight: number | null
  gold_carat: string | null
  gold_rate: number | null
  gold_price: number | null
  making_charges: number | null
  gst_amount: number | null
  hallmark_charges: number | null
  additional_charges: number | null
  approved_at: string | null
  created_at: string
}

interface SelfBusinessProps {
  purchases: Purchase[]
  total: number
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function SelfBusinessPage({ purchases, total }: SelfBusinessProps) {
  return (
    <>
      <Head title="Self Business" />
      <AppLayout>
        <Header>Self Business</Header>
        <Main className="space-y-6">
          <button
            onClick={() => router.get('/dashboard')}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
            Back to Dashboard
          </button>

          {/* Summary */}
          <div className="relative overflow-hidden rounded-2xl border border-sky/20 bg-gradient-to-br from-sky/20 via-sky/5 to-transparent p-5">
            <p className="text-sm font-medium text-muted-foreground mb-1">Total Self Business</p>
            <p className="text-2xl font-bold tracking-tight text-sky">{formatCurrency(total)}</p>
          </div>

          {/* Purchases list */}
          {purchases.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="inline-flex size-12 items-center justify-center rounded-xl bg-sky/10 text-sky mb-4">
                  <HugeiconsIcon icon={Wallet01Icon} className="size-6" />
                </div>
                <p className="text-muted-foreground">No purchases yet.</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/50 shadow-sm overflow-hidden">
              <div className="divide-y divide-border/50">
                {purchases.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="inline-flex size-9 items-center justify-center rounded-xl bg-sky/10 text-sky shrink-0">
                      <HugeiconsIcon icon={Wallet01Icon} className="size-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground truncate">
                          {p.buyer_name || 'Gold Purchase'}
                        </p>
                        <Badge variant="outline" className="text-[10px] bg-emerald/5 text-emerald border-emerald/20">
                          Approved
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(p.approved_at || p.created_at)}
                        {p.gold_weight ? ` · ${p.gold_weight}g ${p.gold_carat || ''}` : ''}
                        {p.quantity ? ` · Qty: ${p.quantity}` : ''}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-foreground">
                        {formatCurrency(Number(p.amount))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </Main>
      </AppLayout>
    </>
  )
}
