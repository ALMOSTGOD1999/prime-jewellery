import { Head } from '@inertiajs/react'

import AppLayout from '~/components/app/layout'
import { Header } from '~/components/app/header'
import { Main } from '~/components/app/main'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { formatCurrency } from '~/lib/utils'

interface PurchasePageProps {
  billingRates: {
    rate18ct: number
    rate22ct: number
    rate24ct: number
    jewelleryValuePercent: number
    makingChargePercent: number
    gstPercent: number
    additionalChargePercent: number
  }
  user: {
    id: number
    name: string
    state: string | null
  }
  purchases: {
    data: any[]
    meta: any
    counts: { total: number; approved: number; rejected: number; pending: number }
  }
}

export default function PurchasePage({ user, purchases }: PurchasePageProps) {
  return (
    <>
      <Head title="Gold Jewellery Purchase" />
      <AppLayout>
        <Header>Gold Jewellery Purchase</Header>
        <Main className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Purchases for <span className="font-medium text-foreground">{user.name}</span> — new
            purchases are processed by the admin.
          </p>

          {/* Purchase History */}
          <Card>
            <CardHeader>
              <CardTitle>Purchase History</CardTitle>
              <CardDescription>
                {purchases.counts.total} total · {purchases.counts.approved} approved ·{' '}
                {purchases.counts.pending} pending · {purchases.counts.rejected} rejected
              </CardDescription>
            </CardHeader>
            <CardContent>
              {purchases.data.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No purchases found.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="py-2 pr-3 font-medium">ID</th>
                        <th className="py-2 pr-3 font-medium">Amount</th>
                        <th className="py-2 pr-3 font-medium">Buyer</th>
                        <th className="py-2 pr-3 font-medium">Quantity</th>
                        <th className="py-2 pr-3 font-medium">Status</th>
                        <th className="py-2 pr-3 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchases.data.map((p: any) => (
                        <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="py-2 pr-3 font-mono text-xs">{p.id}</td>
                          <td className="py-2 pr-3 font-medium">{formatCurrency(p.amount)}</td>
                          <td className="py-2 pr-3">{p.buyerName}</td>
                          <td className="py-2 pr-3">{p.quantity ?? '—'}</td>
                          <td className="py-2 pr-3">
                            <Badge
                              variant={
                                p.status === 'approved'
                                  ? 'default'
                                  : p.status === 'pending'
                                    ? 'secondary'
                                    : 'destructive'
                              }
                            >
                              {p.status}
                            </Badge>
                          </td>
                          <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">
                            {new Date(p.createdAt).toLocaleDateString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {purchases.meta.lastPage > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <span className="text-sm text-muted-foreground">
                    Page {purchases.meta.currentPage} of {purchases.meta.lastPage}
                  </span>
                  <div className="flex gap-2">
                    {purchases.meta.currentPage > 1 && (
                      <a
                        href={`?page=${purchases.meta.currentPage - 1}`}
                        className="text-sm text-primary hover:underline"
                      >
                        Previous
                      </a>
                    )}
                    {purchases.meta.currentPage < purchases.meta.lastPage && (
                      <a
                        href={`?page=${purchases.meta.currentPage + 1}`}
                        className="text-sm text-primary hover:underline"
                      >
                        Next
                      </a>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </Main>
      </AppLayout>
    </>
  )
}
