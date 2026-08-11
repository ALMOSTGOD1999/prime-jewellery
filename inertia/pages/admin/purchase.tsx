import { Head, useForm } from '@inertiajs/react'
import { useState, useCallback, useEffect, useMemo } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Search01Icon,
  Loading01Icon,
  ShoppingBag03Icon,
  Cancel01Icon,
  RupeeCircleIcon,
} from '@hugeicons/core-free-icons'

import AppLayout from '~/components/app/layout'
import { Header } from '~/components/app/header'
import { Main } from '~/components/app/main'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Badge } from '~/components/ui/badge'
import { formatCurrency } from '~/lib/utils'

interface SearchResult {
  id: number
  name: string
  email: string
  phone: string
}

interface GoldPackage {
  name: string
  minAmount: number
  maxAmount: number | null
  monthlyReward: number
  maxReturn: number
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

// Default fallback slabs matching business rules
const DEFAULT_PACKAGES: GoldPackage[] = [
  { name: 'Silver', minAmount: 10000, maxAmount: 199999, monthlyReward: 3, maxReturn: 100 },
  { name: 'Gold', minAmount: 200000, maxAmount: 499999, monthlyReward: 3.5, maxReturn: 100 },
  { name: 'Platinum', minAmount: 500000, maxAmount: null, monthlyReward: 4, maxReturn: 100 },
]

const DEFAULT_RATES: BillingRates = {
  rate18ct: 5200,
  rate22ct: 6200,
  rate24ct: 6800,
  jewelleryValuePercent: 70,
  makingChargePercent: 37.85,
  gstPercent: 3,
  additionalChargePercent: 2,
}

const CARAT_OPTIONS = [
  { value: '18ct', label: '18 CT' },
  { value: '22ct', label: '22 CT' },
  { value: '24ct', label: '24 CT' },
]

function findPackage(packages: GoldPackage[], amount: number): GoldPackage | null {
  // Slabs are sorted by minAmount asc; find first slab where minAmount <= amount
  // AND (maxAmount is null or amount <= maxAmount)
  const sorted = [...packages].sort((a, b) => b.minAmount - a.minAmount)
  for (const pkg of sorted) {
    if (amount >= pkg.minAmount && (pkg.maxAmount === null || amount <= pkg.maxAmount)) {
      return pkg
    }
  }
  return null
}

export default function AdminPurchasePage({
  billingRates: billingRatesProp,
  goldPackages,
}: {
  billingRates?: BillingRates
  goldPackages?: GoldPackage[]
}) {
  const billingRates = billingRatesProp ?? DEFAULT_RATES
  const packages = useMemo(() => {
    if (goldPackages && goldPackages.length > 0) return goldPackages
    return DEFAULT_PACKAGES
  }, [goldPackages])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedUser, setSelectedUser] = useState<SearchResult | null>(null)

  const purchaseForm = useForm({
    amount: '',
    goldCarat: '22ct',
    goldWeight: '',
    goldRate: 0,
    goldPrice: 0,
    makingCharges: 0,
    gstAmount: 0,
    additionalCharges: 0,
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
    const weight = Number(purchaseForm.data.goldWeight)
    const carat = purchaseForm.data.goldCarat

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
      purchaseForm.setData('amount', '')
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
    purchaseForm.setData('amount', String(r(packageAmount)))
  }, [purchaseForm.data.goldWeight, purchaseForm.data.goldCarat])

  const selectedAmount = Number(purchaseForm.data.amount)
  const goldPackage =
    selectedUser && selectedAmount >= 10000 ? findPackage(packages, selectedAmount) : null

  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }
    setSearching(true)
    try {
      const response = await fetch(
        `/admin/users/lookup-users?search=${encodeURIComponent(query)}`
      )
      const data = await response.json()
      setSearchResults(data.error ? [] : data.users || [])
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) performSearch(searchQuery)
      else setSearchResults([])
    }, 400)
    return () => clearTimeout(timer)
  }, [searchQuery, performSearch])

  const handleSelectUser = (user: SearchResult) => {
    setSelectedUser(user)
    setSearchQuery('')
    setSearchResults([])
    purchaseForm.reset()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return
    // Set calculated gold billing values before submitting
    purchaseForm.setData('goldRate', calculation.goldRate)
    purchaseForm.setData('goldPrice', calculation.goldValue)
    purchaseForm.setData('makingCharges', calculation.makingCharges)
    purchaseForm.setData('gstAmount', calculation.gstAmount)
    purchaseForm.setData('additionalCharges', calculation.additionalCharges)
    purchaseForm.post(`/admin/users/${selectedUser.id}/purchase`, {
      onSuccess: () => {
        purchaseForm.reset()
      },
    })
  }

  return (
    <>
      <Head title="Make Purchase" />
      <AppLayout>
        <Header>Make a Purchase</Header>
        <Main className="max-w-2xl mx-auto space-y-6">
          {/* Search Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <HugeiconsIcon icon={Search01Icon} className="h-5 w-5 text-primary" />
                Search User
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Input
                  placeholder="Search by User ID, Name, Email or Phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {searching ? (
                    <HugeiconsIcon
                      icon={Loading01Icon}
                      className="h-4 w-4 animate-spin text-muted-foreground"
                    />
                  ) : (
                    <HugeiconsIcon icon={Search01Icon} className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>

              {searchResults.length > 0 && (
                <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                  {searchResults.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handleSelectUser(user)}
                      className="w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium text-sm">{user.name}</p>
                        <p className="text-xs text-muted-foreground">
                          ID: {user.id} · {user.email} · {user.phone}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {!searching && searchQuery && searchResults.length === 0 && (
                <p className="text-sm text-muted-foreground text-center">No users found</p>
              )}
            </CardContent>
          </Card>

          {/* Purchase Form */}
          {selectedUser && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <HugeiconsIcon icon={ShoppingBag03Icon} className="h-5 w-5 text-primary" />
                  Gold Purchase for {selectedUser.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* User Info */}
                  <div className="rounded-lg border border-border bg-muted/30 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{selectedUser.name}</p>
                        <p className="text-xs text-muted-foreground">ID: {selectedUser.id}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={() => {
                          setSelectedUser(null)
                          purchaseForm.reset()
                        }}
                      >
                        <HugeiconsIcon icon={Cancel01Icon} className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Billing Section — Fully Automatic */}
                  <div className="space-y-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <div className="flex items-center gap-2">
                      <HugeiconsIcon icon={RupeeCircleIcon} className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-semibold text-sm">Billing Details</p>
                        <p className="text-xs text-muted-foreground">
                          Enter gold weight — all values calculate automatically using today's
                          admin-configured rate
                        </p>
                      </div>
                    </div>

                    {/* Gold Carat */}
                    <div className="space-y-2">
                      <Label>Gold Carat</Label>
                      <div className="flex flex-wrap gap-3">
                        {CARAT_OPTIONS.map((carat) => (
                          <button
                            key={carat.value}
                            type="button"
                            onClick={() => purchaseForm.setData('goldCarat', carat.value)}
                            className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                              purchaseForm.data.goldCarat === carat.value
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border hover:border-primary/40'
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
                        Gold Weight (grams) <span className="text-primary">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="gold-weight"
                          type="number"
                          step="0.001"
                          min="0"
                          value={purchaseForm.data.goldWeight}
                          onChange={(e) => purchaseForm.setData('goldWeight', e.target.value)}
                          placeholder="Enter weight in grams"
                          className="pr-12 text-lg"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
                          gm
                        </span>
                      </div>
                    </div>

                    {/* Auto-calculated Summary */}
                    {calculation.goldValue > 0 && (
                      <div className="rounded-lg border-2 border-primary/20 bg-background/40 p-4 space-y-3">
                        <div className="flex items-center justify-between py-1 border-b border-border/50">
                          <span className="text-sm text-muted-foreground">
                            Today's Gold Rate (per gram)
                          </span>
                          <span className="text-sm font-mono font-semibold">
                            ₹{calculation.goldRate.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-1 border-b border-border/50">
                          <span className="text-sm text-muted-foreground">
                            Gold Value ({purchaseForm.data.goldWeight}g × ₹
                            {calculation.goldRate.toLocaleString('en-IN')})
                          </span>
                          <span className="text-sm font-mono font-semibold">
                            ₹{formatCurrency(calculation.goldValue)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-1 border-b border-border/50">
                          <span className="text-sm text-muted-foreground">Making Charge</span>
                          <span className="text-sm font-mono">
                            ₹{formatCurrency(calculation.makingCharges)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-1 border-b border-border/50">
                          <span className="text-sm text-muted-foreground">GST</span>
                          <span className="text-sm font-mono">
                            ₹{formatCurrency(calculation.gstAmount)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-1 border-b border-border/50">
                          <span className="text-sm text-muted-foreground">Additional Charge</span>
                          <span className="text-sm font-mono">
                            ₹{formatCurrency(calculation.additionalCharges)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-1 border-b border-border/50">
                          <span className="text-sm text-muted-foreground">Gold Jewellery Value</span>
                          <span className="text-sm font-mono font-semibold text-primary">
                            ₹{formatCurrency(calculation.jewelleryValue)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t-2 border-primary/30">
                          <span className="text-base font-bold text-foreground">
                            Total Package Amount
                          </span>
                          <span className="text-lg font-bold text-primary tracking-tight">
                            ₹{formatCurrency(calculation.packageAmount)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Amount (auto-filled) */}
                  <div className="space-y-2">
                    <Label htmlFor="purchase-amount">Purchase Amount (₹)</Label>
                    <Input
                      id="purchase-amount"
                      type="number"
                      min={10000}
                      step="1"
                      placeholder="Auto-calculated from gold weight"
                      value={purchaseForm.data.amount}
                      onChange={(e) => purchaseForm.setData('amount', e.target.value)}
                    />
                    {purchaseForm.errors.amount && (
                      <p className="text-sm text-destructive">{purchaseForm.errors.amount}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Auto-calculated from weight. Admin purchase — recorded directly against the
                      user's investment, no wallet deduction.
                    </p>
                  </div>

                  {/* Items & Remarks */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="total-items">Total Jewellery Items</Label>
                      <Input
                        id="total-items"
                        type="number"
                        min="1"
                        value={purchaseForm.data.totalItems}
                        onChange={(e) => purchaseForm.setData('totalItems', e.target.value)}
                        placeholder="Number of jewellery pieces"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="remark">Remarks</Label>
                      <Input
                        id="remark"
                        value={purchaseForm.data.remark}
                        onChange={(e) => purchaseForm.setData('remark', e.target.value)}
                        placeholder="Optional notes about the purchase"
                      />
                    </div>
                  </div>

                  {/* Package Info */}
                  {goldPackage && (
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="default">{goldPackage.name}</Badge>
                        <span className="text-xs text-muted-foreground">
                          ₹{formatCurrency(selectedAmount)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs">Monthly Reward</p>
                          <p className="font-semibold">{goldPackage.monthlyReward}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Max Return</p>
                          <p className="font-semibold">Up to {goldPackage.maxReturn}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Cashback Wallet</p>
                          <p className="font-semibold">70%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Repurchase Wallet</p>
                          <p className="font-semibold">20%</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedAmount > 0 && selectedAmount < 10000 && (
                    <p className="text-xs text-destructive">Minimum purchase amount is ₹10,000</p>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={!goldPackage || purchaseForm.processing}
                  >
                    {purchaseForm.processing ? (
                      <>
                        <HugeiconsIcon icon={Loading01Icon} className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <HugeiconsIcon icon={ShoppingBag03Icon} className="mr-2 h-4 w-4" />
                        Purchase ₹{formatCurrency(selectedAmount)} for {selectedUser.name}
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </Main>
      </AppLayout>
    </>
  )
}
