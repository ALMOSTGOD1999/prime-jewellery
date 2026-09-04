import { Head } from '@inertiajs/react'
import AppLayout from '~/components/app/layout'
import { Header } from '~/components/app/header'
import { Main } from '~/components/app/main'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'

interface Props {
  months: string[]
  selectedMonth: string
  summary: {
    total_txns: number
    unique_users: number
    total_credited: number
    total_reversed: number
  }
  transactions: {
    page: number
    perPage: number
    total: number
    totalPages: number
    data: Array<{
      id: string
      user_id: number
      user_name: string | null
      amount: string
      type: string
      remark: string
      created_at: string
    }>
  }
}

function f(amount: number) {
  return '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(amount)
}

function d(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function PayoutHistory({ months, selectedMonth, summary, transactions }: Props) {
  return (
    <>
      <Head title="Payout History" />
      <AppLayout>
        <Header>Payout History</Header>
        <Main className="space-y-6">
          {/* Month Tabs */}
          <div className="flex gap-2 flex-wrap">
            {months.map((m) => (
              <a
                key={m}
                href={`/admin/payout/history?month=${m}`}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  m === selectedMonth
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card hover:bg-muted border-border'
                }`}
              >
                {m}
              </a>
            ))}
          </div>

          {/* Summary */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Transactions', value: summary.total_txns },
              { label: 'Users Paid', value: summary.unique_users },
              { label: 'Credited', value: f(summary.total_credited), cls: 'text-emerald-600' },
              { label: 'Reversed', value: f(summary.total_reversed), cls: 'text-red-500' },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="py-4">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className={`text-2xl font-bold ${s.cls || ''}`}>{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Transactions — {selectedMonth}</CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.data.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No payout data for this month.
                </p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b-2 text-left text-xs text-muted-foreground uppercase tracking-wide">
                          <th className="py-3 px-3 w-[100px]">Date</th>
                          <th className="py-3 px-3 w-[100px]">User ID</th>
                          <th className="py-3 px-3">Name</th>
                          <th className="py-3 px-3 w-[120px] text-right">Amount</th>
                          <th className="py-3 px-3 w-[100px]">Type</th>
                          <th className="py-3 px-3 min-w-[200px]">Remark</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.data.map((txn, idx) => {
                          const rev = txn.remark?.includes('REVERSAL')
                          const inc =
                            txn.remark?.toLowerCase().includes('cashback wallet') ||
                            txn.remark?.toLowerCase().includes('income wallet')
                          const isEven = idx % 2 === 0
                          return (
                            <tr
                              key={txn.id}
                              className={`border-b last:border-0 hover:bg-muted/30 ${
                                rev ? 'bg-red-50/40' : isEven ? 'bg-muted/10' : ''
                              }`}
                            >
                              <td className="py-3 px-3 text-muted-foreground whitespace-nowrap text-xs">
                                {d(txn.created_at)}
                              </td>
                              <td className="py-3 px-3 font-mono text-xs font-medium">
                                PJ{String(txn.user_id).padStart(6, '0')}
                              </td>
                              <td className="py-3 px-3 font-medium">{txn.user_name || '—'}</td>
                              <td
                                className={`py-3 px-3 font-semibold text-right whitespace-nowrap ${
                                  rev ? 'text-red-600' : 'text-emerald-600'
                                }`}
                              >
                                {rev ? '−' : '+'}
                                {f(Number(txn.amount))}
                              </td>
                              <td className="py-3 px-3">
                                <Badge
                                  variant={rev ? 'destructive' : inc ? 'default' : 'secondary'}
                                >
                                  {rev ? 'REVERSAL' : inc ? 'Income' : 'Repurchase'}
                                </Badge>
                              </td>
                              <td className="py-3 px-3 text-xs text-muted-foreground max-w-[300px] truncate" title={txn.remark}>
                                {txn.remark}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <span className="text-sm text-muted-foreground">
                      Page {transactions.page} of {transactions.totalPages} ({transactions.total}{' '}
                      total records)
                    </span>
                    <div className="flex gap-2">
                      {transactions.page > 1 && (
                        <a
                          href={`?month=${selectedMonth}&page=${transactions.page - 1}`}
                          className="px-3 py-1.5 rounded-md text-sm font-medium border border-border hover:bg-muted transition-colors"
                        >
                          ← Previous
                        </a>
                      )}
                      {Array.from({ length: Math.min(transactions.totalPages, 7) }, (_, i) => {
                        let pageNum: number
                        if (transactions.totalPages <= 7) {
                          pageNum = i + 1
                        } else if (transactions.page <= 4) {
                          pageNum = i + 1
                        } else if (transactions.page >= transactions.totalPages - 3) {
                          pageNum = transactions.totalPages - 6 + i
                        } else {
                          pageNum = transactions.page - 3 + i
                        }
                        return (
                          <a
                            key={pageNum}
                            href={`?month=${selectedMonth}&page=${pageNum}`}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                              pageNum === transactions.page
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'border-border hover:bg-muted'
                            }`}
                          >
                            {pageNum}
                          </a>
                        )
                      })}
                      {transactions.page < transactions.totalPages && (
                        <a
                          href={`?month=${selectedMonth}&page=${transactions.page + 1}`}
                          className="px-3 py-1.5 rounded-md text-sm font-medium border border-border hover:bg-muted transition-colors"
                        >
                          Next →
                        </a>
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </Main>
      </AppLayout>
    </>
  )
}
