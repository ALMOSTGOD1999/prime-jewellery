import { Head, useForm, router } from '@inertiajs/react'
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ShoppingBag03Icon,
  RupeeCircleIcon,
  UserIcon,
  Loading01Icon,
  Search01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import AppLayout from '~/components/app/layout'
import { Header } from '~/components/app/header'
import { Main } from '~/components/app/main'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { formatCurrency, formatUserId } from '~/lib/utils'

interface Customer {
  id: number
  name: string
  email: string
  phone: string
  walletBalance: number
  state: string | null
}

interface BillingRates {
  rate18ct: number
  rate22ct: number
  rate24ct: number
  jewelleryValuePercent: number
  makingChargePercent: number
  gstPercent: number
  additionalChargePercent: number
}

interface PurchasePageProps {
  balance: number
  billingRates: BillingRates
  user: {
    id: number
    name: string
    walletBalance: number
    state: string | null
  }
  purchases: {
    data: any[]
    meta: any
    counts: { total: number; approved: number; rejected: number; pending: number }
  }
}

const CARAT_OPTIONS = [
  { value: '18ct', label: '18 CT' },
  { value: '22ct', label: '22 CT' },
  { value: '24ct', label: '24 CT' },
]

export default function PurchasePage({
  balance,
  billingRates,
  user,
  purchases,
}: PurchasePageProps) {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Customer[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchRef = useRef<HTMLDivElement>(null)

  const form = useForm({
    customerId: user.id,
    goldCarat: '22ct',
    goldWeight: '',
    amount: '',
    totalItems: '1',
    remark: '',
  })

  const [calculation, setCalculation] = useState({
    goldRate: billingRates.rate22ct,
    goldValue: 0,
    investment: 0,
    jewelleryValue: 0,
    makingCharges: 0,
    makingChargePercent: 0,
    gstAmount: 0,
    additionalCharges: 0,
    packageAmount: 0,
  })

  // Auto-calculate whenever carat or weight changes
  useEffect(() => {
    const weight = Number(form.data.goldWeight)
    const carat = form.data.goldCarat

    if (!weight || weight <= 0 || !carat) {
      setCalculation({
        goldRate: 0,
        goldValue: 0,
        investment: 0,
        jewelleryValue: 0,
        makingCharges: 0,
        makingChargePercent: 0,
        gstAmount: 0,
        additionalCharges: 0,
        packageAmount: 0,
      })
      form.setData('amount', '')
      return
    }

    const rate =
      carat === '18ct'
        ? billingRates.rate18ct
        : carat === '24ct'
          ? billingRates.rate24ct
          : billingRates.rate22ct

    // Gold Value = Weight × Rate
    const goldValue = rate * weight

    // Investment (Total Package) = Gold Value ÷ (jewelleryValuePercent / 100)
    const investment = goldValue / (billingRates.jewelleryValuePercent / 100)

    // GST & Additional are calculated on Gold Value only
    const gstAmount = (goldValue * billingRates.gstPercent) / 100
    const additionalCharges = (goldValue * billingRates.additionalChargePercent) / 100

    // Making Charge is the remainder so that Total = Investment
    const makingCharges = investment - goldValue - gstAmount - additionalCharges
    const makingChargePercent = goldValue > 0 ? (makingCharges / goldValue) * 100 : 0

    // Total Package = Investment (they are now the same)
    const packageAmount = investment

    const r = (n: number) => Math.round(n * 100) / 100

    setCalculation({
      goldRate: rate,
      goldValue: r(goldValue),
      investment: r(investment),
      jewelleryValue: r(goldValue),
      makingCharges: r(makingCharges),
      makingChargePercent: r(makingChargePercent),
      gstAmount: r(gstAmount),
      additionalCharges: r(additionalCharges),
      packageAmount: r(packageAmount),
    })
    form.setData('amount', String(r(packageAmount)))
  }, [form.data.goldWeight, form.data.goldCarat])

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (!query || query.length < 2) {
      setSearchResults([])
      setShowResults(false)
      return
    }
    setSearchLoading(true)
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`/gold/customers/search?q=${encodeURIComponent(query)}`)
        const json = await res.json()
        setSearchResults(json.data || [])
        setShowResults(true)
      } catch {
        setSearchResults([])
      } finally {
        setSearchLoading(false)
      }
    }, 300)
  }, [])

  const selectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer)
    form.setData('customerId', customer.id)
    setSearchQuery('')
    setSearchResults([])
    setShowResults(false)
  }

  const clearCustomer = () => {
    setSelectedCustomer(null)
    form.setData('customerId', user.id)
    setSearchQuery('')
    setSearchResults([])
    setShowResults(false)
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const activeCustomer = selectedCustomer || {
    id: user.id,
    name: user.name,
    email: '',
    phone: '',
    walletBalance: user.walletBalance,
    state: user.state,
  }

  const canPurchase =
    calculation.packageAmount > 0 && activeCustomer.walletBalance >= calculation.packageAmount

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canPurchase) return
    form.post('/gold/purchase', {
      onSuccess: () => {
        form.reset()
        setSelectedCustomer(null)
        setCalculation({
          goldRate: 0,
          goldValue: 0,
          investment: 0,
          jewelleryValue: 0,
          makingCharges: 0,
          makingChargePercent: 0,
          gstAmount: 0,
          additionalCharges: 0,
          packageAmount: 0,
        })
        router.reload({ only: ['balance', 'purchases'] })
      },
    })
  }

  return (
    <>
      <Head title="Gold Jewellery Purchase" />
      <AppLayout>
        <Header>Gold Jewellery Purchase</Header>
        <Main className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Customer Information */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950/40">
                    <HugeiconsIcon icon={UserIcon} className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <CardTitle>Customer Information</CardTitle>
                    <CardDescription>Select a customer or use your own account</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {!selectedCustomer && (
                  <div className="relative" ref={searchRef}>
                    <Label htmlFor="customer-search">Search Customer</Label>
                    <div className="relative mt-1.5">
                      <HugeiconsIcon
                        icon={Search01Icon}
                        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                      />
                      <Input
                        id="customer-search"
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        placeholder="Search by name, email, phone or ID..."
                        className="pl-9"
                        autoComplete="off"
                      />
                      {searchLoading && (
                        <HugeiconsIcon
                          icon={Loading01Icon}
                          className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin"
                        />
                      )}
                    </div>
                    {showResults && searchResults.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 rounded-lg border bg-popover shadow-lg">
                        {searchResults.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => selectCustomer(c)}
                            className="w-full text-left px-4 py-3 hover:bg-muted/50 border-b last:border-0 flex items-center justify-between"
                          >
                            <div>
                              <p className="font-medium text-sm">{c.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatUserId(c.id)} · {c.phone || c.email}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {formatCurrency(c.walletBalance)}
                            </Badge>
                          </button>
                        ))}
                      </div>
                    )}
                    {showResults && searchResults.length === 0 && searchQuery.length >= 2 && (
                      <div className="absolute z-50 w-full mt-1 rounded-lg border bg-popover shadow-lg p-3 text-sm text-muted-foreground">
                        No customers found.
                      </div>
                    )}
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border bg-muted/30 p-4 space-y-1">
                    <p className="text-xs text-muted-foreground">Customer Code</p>
                    <p className="font-semibold">{formatUserId(activeCustomer.id)}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-4 space-y-1">
                    <p className="text-xs text-muted-foreground">Customer Name</p>
                    <p className="font-semibold">{activeCustomer.name}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-4 space-y-1">
                    <p className="text-xs text-muted-foreground">Wallet Balance</p>
                    <p className="font-semibold text-emerald-600">
                      {formatCurrency(activeCustomer.walletBalance)}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-4 space-y-1">
                    <p className="text-xs text-muted-foreground">State</p>
                    <p className="font-semibold">{activeCustomer.state || 'N/A'}</p>
                  </div>
                </div>

                {selectedCustomer && (
                  <Button type="button" variant="ghost" size="sm" onClick={clearCustomer}>
                    Use my account instead
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Billing Section — Fully Automatic */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gold/10">
                    <HugeiconsIcon icon={RupeeCircleIcon} className="h-5 w-5 text-gold" />
                  </div>
                  <div>
                    <CardTitle>Billing Details</CardTitle>
                    <CardDescription>
                      Enter gold weight — all values calculate automatically using the
                      admin-configured rates
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Gold Carat */}
                <div className="space-y-2">
                  <Label>Gold Carat</Label>
                  <div className="flex flex-wrap gap-3">
                    {CARAT_OPTIONS.map((carat) => (
                      <button
                        key={carat.value}
                        type="button"
                        onClick={() => form.setData('goldCarat', carat.value)}
                        className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                          form.data.goldCarat === carat.value
                            ? 'border-gold bg-gold/10 text-gold'
                            : 'border-border hover:border-gold/40'
                        }`}
                      >
                        {carat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Gold Weight — Only Input */}
                <div className="space-y-2 max-w-sm">
                  <Label htmlFor="gold-weight">
                    Gold Weight (grams) <span className="text-gold">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="gold-weight"
                      type="number"
                      step="0.001"
                      min="0"
                      value={form.data.goldWeight}
                      onChange={(e) => form.setData('goldWeight', e.target.value)}
                      placeholder="Enter weight in grams"
                      className="pr-12 text-lg"
                      autoFocus
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
                      gm
                    </span>
                  </div>
                </div>

                {/* Auto-calculated Summary */}
                {calculation.goldValue > 0 && (
                  <div className="rounded-xl border-2 border-gold/20 bg-gradient-to-br from-gold/5 to-transparent p-6 space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse" />
                      <h3 className="text-sm font-semibold text-gold uppercase tracking-wider">
                        Auto-Calculated Breakdown
                      </h3>
                    </div>

                    {/* Today's Rate */}
                    <div className="flex items-center justify-between py-2 border-b border-border/50">
                      <span className="text-sm text-muted-foreground">
                        Today's Gold Rate (per gram)
                      </span>
                      <span className="text-sm font-mono font-semibold">
                        ₹{calculation.goldRate.toLocaleString('en-IN')}
                      </span>
                    </div>

                    {/* Gold Value */}
                    <div className="flex items-center justify-between py-2 border-b border-border/50">
                      <span className="text-sm text-muted-foreground">
                        Gold Value ({form.data.goldWeight}g × ₹
                        {calculation.goldRate.toLocaleString('en-IN')})
                      </span>
                      <span className="text-sm font-mono font-semibold">
                        ₹{formatCurrency(calculation.goldValue)}
                      </span>
                    </div>

                    {/* Making Charge */}
                    <div className="flex items-center justify-between py-2 border-b border-border/50">
                      <span className="text-sm text-muted-foreground">
                        Making Charge ({calculation.makingChargePercent}%)
                      </span>
                      <span className="text-sm font-mono">
                        ₹{formatCurrency(calculation.makingCharges)}
                      </span>
                    </div>

                    {/* GST */}
                    <div className="flex items-center justify-between py-2 border-b border-border/50">
                      <span className="text-sm text-muted-foreground">GST</span>
                      <span className="text-sm font-mono">
                        ₹{formatCurrency(calculation.gstAmount)}
                      </span>
                    </div>

                    {/* Additional Charge */}
                    <div className="flex items-center justify-between py-2 border-b border-border/50">
                      <span className="text-sm text-muted-foreground">Additional Charge</span>
                      <span className="text-sm font-mono">
                        ₹{formatCurrency(calculation.additionalCharges)}
                      </span>
                    </div>

                    {/* Jewellery Value */}
                    <div className="flex items-center justify-between py-2 border-b border-border/50">
                      <span className="text-sm text-muted-foreground">
                        Gold Jewellery Value ({billingRates.jewelleryValuePercent}% of investment)
                      </span>
                      <span className="text-sm font-mono font-semibold text-amber-600">
                        ₹{formatCurrency(calculation.jewelleryValue)}
                      </span>
                    </div>

                    {/* Customer Investment */}
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-muted-foreground">Customer Investment</span>
                      <span className="text-sm font-mono font-semibold text-blue-600">
                        ₹{formatCurrency(calculation.investment)}
                      </span>
                    </div>

                    {/* Total */}
                    <div className="flex items-center justify-between pt-3 border-t-2 border-gold/30">
                      <span className="text-base font-bold text-foreground">
                        Total Package Amount
                      </span>
                      <span className="text-xl font-bold text-gold tracking-tight">
                        ₹{formatCurrency(calculation.packageAmount)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Items & Remarks */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="total-items">
                      Total Jewellery Items <span className="text-gold">*</span>
                    </Label>
                    <Input
                      id="total-items"
                      type="number"
                      min="1"
                      value={form.data.totalItems}
                      onChange={(e) => form.setData('totalItems', e.target.value)}
                      placeholder="Number of jewellery pieces"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="remark">Remarks</Label>
                    <Input
                      id="remark"
                      value={form.data.remark}
                      onChange={(e) => form.setData('remark', e.target.value)}
                      placeholder="Optional notes about the purchase"
                    />
                  </div>
                </div>

                {/* Insufficient Balance */}
                {!canPurchase && calculation.packageAmount > 0 && (
                  <Alert className="border-red-200 bg-red-50/50">
                    <AlertTitle className="text-red-800">Insufficient Balance</AlertTitle>
                    <AlertDescription className="text-red-700">
                      Customer wallet balance ({formatCurrency(activeCustomer.walletBalance)}) is
                      less than the package amount ({formatCurrency(calculation.packageAmount)}).
                    </AlertDescription>
                  </Alert>
                )}

                {/* Submit */}
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="text-sm text-muted-foreground">
                    Your wallet:{' '}
                    <span className="font-medium text-foreground">{formatCurrency(balance)}</span>
                  </div>
                  <Button
                    type="submit"
                    disabled={!canPurchase || form.processing}
                    className="bg-gold hover:bg-gold/90 text-white"
                    size="lg"
                  >
                    {form.processing ? (
                      <>
                        <HugeiconsIcon icon={Loading01Icon} className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <HugeiconsIcon icon={ShoppingBag03Icon} className="mr-2 h-4 w-4" />
                        Purchase for {formatCurrency(calculation.packageAmount)}
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>

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
