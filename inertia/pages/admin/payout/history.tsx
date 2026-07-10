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
                        <tr className="border-b text-left text-xs text-muted-foreground">
                          <th className="py-2 pr-3">User ID</th>
                          <th className="py-2 pr-3">Name</th>
                          <th className="py-2 pr-3">Amount</th>
                          <th className="py-2 pr-3">Wallet</th>
                          <th className="py-2 pr-3">Remark</th>
                          <th className="py-2 pr-3">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.data.map((txn) => {
                          const rev = txn.remark?.includes('REVERSAL')
                          const inc = txn.remark?.toLowerCase().includes('income wallet')
                          return (
                            <tr
                              key={txn.id}
                              className={`border-b last:border-0 hover:bg-muted/30 ${rev ? 'bg-red-50/30' : ''}`}
                            >
                              <td className="py-2 pr-3 font-mono text-xs">{txn.user_id}</td>
                              <td className="py-2 pr-3">{txn.user_name || '—'}</td>
                              <td
                                className={`py-2 pr-3 font-medium ${rev ? 'text-red-600' : 'text-emerald-600'}`}
                              >
                                {rev ? '−' : ''}
                                {f(Number(txn.amount))}
                              </td>
                              <td className="py-2 pr-3">
                                <Badge
                                  variant={rev ? 'destructive' : inc ? 'default' : 'secondary'}
                                >
                                  {rev ? 'REVERSAL' : inc ? 'Income' : 'Repurchase'}
                                </Badge>
                              </td>
                              <td className="py-2 pr-3 text-xs text-muted-foreground max-w-[250px] truncate">
                                {txn.remark}
                              </td>
                              <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap text-xs">
                                {d(txn.created_at)}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {transactions.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <span className="text-sm text-muted-foreground">
                        Page {transactions.page} of {transactions.totalPages} ({transactions.total}{' '}
                        total)
                      </span>
                      <div className="flex gap-2">
                        {transactions.page > 1 && (
                          <a
                            href={`?month=${selectedMonth}&page=${transactions.page - 1}`}
                            className="text-sm text-primary hover:underline"
                          >
                            Previous
                          </a>
                        )}
                        {transactions.page < transactions.totalPages && (
                          <a
                            href={`?month=${selectedMonth}&page=${transactions.page + 1}`}
                            className="text-sm text-primary hover:underline"
                          >
                            Next
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </Main>
      </AppLayout>
    </>
  )
}
