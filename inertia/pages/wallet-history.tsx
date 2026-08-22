import { Head, router } from '@inertiajs/react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowLeft01Icon,
  Wallet01Icon,
  ArrowUp01Icon,
  ArrowDown01Icon,
} from '@hugeicons/core-free-icons'
import AppLayout from '~/components/app/layout'
import { Header } from '~/components/app/header'
import { Main } from '~/components/app/main'
import { Card, CardContent } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'

interface WalletTransaction {
  id: string
  amount: number
  type: 'wallet_credit' | 'wallet_debit'
  remark: string | null
  approved_at: string | null
  created_at: string
}

interface WalletHistoryProps {
  wallet: string
  walletLabel: string
  transactions: WalletTransaction[]
}

const walletColors: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  income: {
    bg: 'from-emerald/20 via-emerald/5 to-transparent',
    border: 'border-emerald/20',
    text: 'text-emerald',
    badge: 'bg-emerald/10 text-emerald border-emerald/20',
  },
  repurchase: {
    bg: 'from-violet/20 via-violet/5 to-transparent',
    border: 'border-violet/20',
    text: 'text-violet',
    badge: 'bg-violet/10 text-violet border-violet/20',
  },
  working: {
    bg: 'from-purple/20 via-purple/5 to-transparent',
    border: 'border-purple/20',
    text: 'text-purple',
    badge: 'bg-purple/10 text-purple border-purple/20',
  },
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function WalletHistoryPage({ wallet, walletLabel, transactions }: WalletHistoryProps) {
  const colors = walletColors[wallet] || walletColors.income

  const totalCredits = transactions
    .filter((t) => t.type === 'wallet_credit')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const totalDebits = transactions
    .filter((t) => t.type === 'wallet_debit')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  return (
    <>
      <Head title={`${walletLabel} History`} />
      <AppLayout>
        <Header>{walletLabel} History</Header>
        <Main className="space-y-6">
          {/* Back link */}
          <button
            onClick={() => router.get('/dashboard')}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
            Back to Dashboard
          </button>

          {/* Summary cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className={`relative overflow-hidden rounded-2xl border ${colors.border} bg-gradient-to-br ${colors.bg} p-5`}>
              <p className="text-sm font-medium text-muted-foreground mb-1">Current Balance</p>
              <p className={`text-2xl font-bold tracking-tight ${colors.text}`}>
                {formatCurrency(totalCredits - totalDebits)}
              </p>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-emerald/20 bg-gradient-to-br from-emerald/20 via-emerald/5 to-transparent p-5">
              <p className="text-sm font-medium text-muted-foreground mb-1">Total Credits</p>
              <p className="text-2xl font-bold tracking-tight text-emerald">
                +{formatCurrency(totalCredits)}
              </p>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 via-rose-5 to-transparent p-5">
              <p className="text-sm font-medium text-muted-foreground mb-1">Total Debits</p>
              <p className="text-2xl font-bold tracking-tight text-rose-500">
                -{formatCurrency(totalDebits)}
              </p>
            </div>
          </div>

          {/* Transactions list */}
          {transactions.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className={`inline-flex size-12 items-center justify-center rounded-xl ${colors.badge} mb-4`}>
                  <HugeiconsIcon icon={Wallet01Icon} className="size-6" />
                </div>
                <p className="text-muted-foreground">No transactions found for this wallet.</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/50 shadow-sm overflow-hidden">
              <div className="divide-y divide-border/50">
                {transactions.map((tx) => {
                  const isCredit = tx.type === 'wallet_credit'
                  return (
                    <div
                      key={tx.id}
                      className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors"
                    >
                      {/* Icon */}
                      <div
                        className={`inline-flex size-9 items-center justify-center rounded-xl shrink-0 ${
                          isCredit
                            ? 'bg-emerald/10 text-emerald'
                            : 'bg-rose-50 text-rose-500'
                        }`}
                      >
                        <HugeiconsIcon
                          icon={isCredit ? ArrowDown01Icon : ArrowUp01Icon}
                          className="size-4"
                        />
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {tx.remark || (isCredit ? 'Wallet credited' : 'Wallet debited')}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(tx.created_at)} at {formatTime(tx.created_at)}
                        </p>
                      </div>

                      {/* Amount */}
                      <div className="text-right shrink-0">
                        <p
                          className={`text-sm font-semibold ${
                            isCredit ? 'text-emerald' : 'text-rose-500'
                          }`}
                        >
                          {isCredit ? '+' : '-'}{formatCurrency(Number(tx.amount))}
                        </p>
                        <Badge
                          variant="outline"
                          className={`text-[10px] mt-0.5 ${
                            isCredit
                              ? 'bg-emerald/5 text-emerald border-emerald/20'
                              : 'bg-rose-50 text-rose-500 border-rose-200'
                          }`}
                        >
                          {isCredit ? 'Credit' : 'Debit'}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}
        </Main>
      </AppLayout>
    </>
  )
}
