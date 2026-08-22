import { Head, router } from '@inertiajs/react'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowLeft01Icon, Wallet01Icon } from '@hugeicons/core-free-icons'
import AppLayout from '~/components/app/layout'
import { Header } from '~/components/app/header'
import { Main } from '~/components/app/main'
import { Card, CardContent } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'

interface Distribution {
  id: number
  period_month: string
  investment_amount: number
  return_amount: number
  income_amount: number
  gold_amount: number
  paid_out_at: string | null
  created_at: string
  investment_total: number
  started_at: string
  closed_at: string | null
  investment_status: string
}

interface Investment {
  id: number
  amount: number
  status: string
  started_at: string
  closed_at: string | null
  monthly_return_rate: number
  purchase_id: string | null
}

interface SelfInvestmentProps {
  distributions: Distribution[]
  investments: Investment[]
  summary: { totalReturn: number; totalIncome: number; totalGold: number }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatMonth(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

export default function SelfInvestmentPage({ distributions, investments, summary }: SelfInvestmentProps) {
  return (
    <>
      <Head title="Self Investment" />
      <AppLayout>
        <Header>Self Investment</Header>
        <Main className="space-y-6">
          <button onClick={() => router.get('/dashboard')} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" /> Back to Dashboard
          </button>

          {/* Summary */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="relative overflow-hidden rounded-2xl border border-emerald/20 bg-gradient-to-br from-emerald/20 via-emerald/5 to-transparent p-5">
              <p className="text-sm font-medium text-muted-foreground mb-1">Total Returns</p>
              <p className="text-2xl font-bold tracking-tight text-emerald">{formatCurrency(summary.totalReturn)}</p>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-violet/20 bg-gradient-to-br from-violet/20 via-violet/5 to-transparent p-5">
              <p className="text-sm font-medium text-muted-foreground mb-1">Income Wallet</p>
              <p className="text-2xl font-bold tracking-tight text-violet">{formatCurrency(summary.totalIncome)}</p>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-gold/20 bg-gradient-to-br from-gold/20 via-gold/5 to-transparent p-5">
              <p className="text-sm font-medium text-muted-foreground mb-1">Repurchase Wallet</p>
              <p className="text-2xl font-bold tracking-tight text-gold">{formatCurrency(summary.totalGold)}</p>
            </div>
          </div>

          {/* Investments */}
          {investments.length > 0 && (
            <Card className="border-border/50 shadow-sm">
              <div className="px-5 py-3 border-b border-border/50">
                <p className="text-sm font-semibold text-foreground">Active Investments</p>
              </div>
              <div className="divide-y divide-border/50">
                {investments.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{formatCurrency(inv.amount)}</p>
                      <p className="text-xs text-muted-foreground">Started {formatDate(inv.started_at)} · {inv.monthly_return_rate}%/mo</p>
                    </div>
                    <Badge variant="outline" className={inv.status === 'active' ? 'bg-emerald/5 text-emerald border-emerald/20' : 'bg-muted text-muted-foreground'}>
                      {inv.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Distributions */}
          {distributions.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="inline-flex size-12 items-center justify-center rounded-xl bg-emerald/10 text-emerald mb-4">
                  <HugeiconsIcon icon={Wallet01Icon} className="size-6" />
                </div>
                <p className="text-muted-foreground">No return distributions yet.</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/50 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-border/50">
                <p className="text-sm font-semibold text-foreground">Return History</p>
              </div>
              <div className="divide-y divide-border/50">
                {distributions.map((d) => (
                  <div key={d.id} className="px-5 py-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-foreground">{formatMonth(d.period_month)}</p>
                      <Badge variant="outline" className="text-[10px] bg-emerald/5 text-emerald border-emerald/20">
                        {formatCurrency(d.return_amount)}
                      </Badge>
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>Invested: {formatCurrency(d.investment_amount)}</span>
                      <span className="text-violet">Income: {formatCurrency(d.income_amount)}</span>
                      <span className="text-gold">Repurchase: {formatCurrency(d.gold_amount)}</span>
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
