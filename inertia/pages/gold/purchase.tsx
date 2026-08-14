import { Head, useForm } from '@inertiajs/react'
import { useMemo } from 'react'

import AppLayout from '~/components/app/layout'
import { Header } from '~/components/app/header'
import { Main } from '~/components/app/main'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
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

const CARATS = ['18ct', '22ct', '24ct'] as const
const MIN_PURCHASE_AMOUNT = 10000

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

export default function PurchasePage({ billingRates, user, purchases }: PurchasePageProps) {
  const form = useForm({ carat: '22ct', weight: '' })

  const breakdown = useMemo(() => {
    const grams = Number(form.data.weight)
    if (!grams || grams <= 0) return null

    const rate =
      form.data.carat === '18ct'
        ? billingRates.rate18ct
        : form.data.carat === '24ct'
          ? billingRates.rate24ct
          : billingRates.rate22ct

    const goldValue = r2(grams * rate)
    const investment = r2(goldValue / (billingRates.jewelleryValuePercent / 100))
    const gstAmount = r2((goldValue * billingRates.gstPercent) / 100)
    const additionalCharges = r2((goldValue * billingRates.additionalChargePercent) / 100)
    const makingCharges = r2(investment - goldValue - gstAmount - additionalCharges)
    const makingPercent = goldValue > 0 ? r2((makingCharges / goldValue) * 100) : 0

    return {
      rate,
      goldValue,
      investment,
      gstAmount,
      additionalCharges,
      makingCharges,
      makingPercent,
    }
  }, [form.data.carat, form.data.weight, billingRates])

  const belowMinimum = breakdown !== null && breakdown.investment < MIN_PURCHASE_AMOUNT

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!breakdown || belowMinimum) return
    form.post('/gold/purchase', {
      preserveScroll: true,
      onSuccess: () => {
        form.setData('weight', '')
      },
    })
  }

  const breakdownRow = (label: string, value: string, accent = false) => (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-medium ${accent ? 'text-primary' : ''}`}>{value}</span>
    </div>
  )

  return (
    <>
      <Head title="Gold Jewellery Purchase" />
      <AppLayout>
        <Header>Gold Jewellery Purchase</Header>
        <Main className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Purchases for <span className="font-medium text-foreground">{user.name}</span> — enter
            the gold weight and every other amount fills in automatically at today's rates. New
            purchases are processed by the admin.
          </p>

          {/* New Purchase Request */}
          <Card>
            <CardHeader>
              <CardTitle>New Purchase Request</CardTitle>
              <CardDescription>
                Gold weight is the only input — rate, gold value, making charges, GST and total are
                calculated from the current admin-set gold rates.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="purchase-carat">Gold Carat</Label>
                    <Select
                      value={form.data.carat}
                      onValueChange={(val) => form.setData('carat', val || '22ct')}
                    >
                      <SelectTrigger id="purchase-carat" className="w-full">
                        <SelectValue placeholder="Select carat" className="capitalize" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {CARATS.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c.toUpperCase()}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="purchase-weight">Gold Weight (grams)</Label>
                    <Input
                      id="purchase-weight"
                      type="number"
                      min="0.001"
                      step="0.001"
                      inputMode="decimal"
                      placeholder="e.g. 10.500"
                      value={form.data.weight}
                      onChange={(e) => form.setData('weight', e.target.value)}
                    />
                  </div>
                </div>

                {/* Auto-filled breakdown */}
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                  {breakdown ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between border-b border-primary/10 pb-2">
                        <span className="text-sm text-muted-foreground">
                          Gold Rate ({form.data.carat.toUpperCase()})
                        </span>
                        <span className="text-sm font-semibold">
                          {formatCurrency(breakdown.rate)}/gm
                        </span>
                      </div>
                      {breakdownRow('Gold Value (Weight × Rate)', formatCurrency(breakdown.goldValue))}
                      {breakdownRow(
                        'Making Charges',
                        `${formatCurrency(breakdown.makingCharges)} (${breakdown.makingPercent}%)`
                      )}
                      {breakdownRow(
                        'GST',
                        `${formatCurrency(breakdown.gstAmount)} (${billingRates.gstPercent}%)`
                      )}
                      {breakdownRow(
                        'Additional Charges',
                        `${formatCurrency(breakdown.additionalCharges)} (${billingRates.additionalChargePercent}%)`
                      )}
                      <div className="flex items-center justify-between border-t border-primary/10 pt-2">
                        <span className="text-sm font-semibold">Total Package</span>
                        <span className="text-base font-bold text-primary">
                          {formatCurrency(breakdown.investment)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="py-3 text-center text-sm text-muted-foreground">
                      Enter a gold weight above to see the auto-filled breakdown.
                    </p>
                  )}
                </div>

                {belowMinimum && (
                  <p className="text-xs text-destructive">
                    Minimum purchase amount is {formatCurrency(MIN_PURCHASE_AMOUNT)} — please enter
                    a higher gold weight.
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={!breakdown || belowMinimum || form.processing}
                >
                  {form.processing ? 'Submitting...' : 'Submit Purchase Request'}
                </Button>
              </form>
            </CardContent>
          </Card>

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
                        <th className="py-2 pr-3 font-medium">Weight</th>
                        <th className="py-2 pr-3 font-medium">Carat</th>
                        <th className="py-2 pr-3 font-medium">Amount</th>
                        <th className="py-2 pr-3 font-medium">Status</th>
                        <th className="py-2 pr-3 font-medium">Date</th>
                        <th className="py-2 pr-3 font-medium">Bill</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchases.data.map((p: any) => (
                        <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="py-2 pr-3 font-mono text-xs">{p.id}</td>
                          <td className="py-2 pr-3">
                            {p.goldWeight ? `${Number(p.goldWeight).toFixed(3)} gm` : '—'}
                          </td>
                          <td className="py-2 pr-3 uppercase">{p.goldCarat || '—'}</td>
                          <td className="py-2 pr-3 font-medium">{formatCurrency(p.amount)}</td>
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
                          <td className="py-2 pr-3">
                            {p.status === 'approved' ? (
                              <a
                                href={`/gold/purchase/${p.id}/bill`}
                                className="text-sm text-primary hover:underline whitespace-nowrap"
                              >
                                Download
                              </a>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
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
