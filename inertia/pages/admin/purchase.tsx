import { Head, useForm } from '@inertiajs/react'
import { useState, useCallback, useEffect, useMemo } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Search01Icon,
  Loading01Icon,
  ShoppingBag03Icon,
  Cancel01Icon,
} from '@hugeicons/core-free-icons'

import AppLayout from '~/components/app/layout'
import { Header } from '~/components/app/header'
import { Main } from '~/components/app/main'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Badge } from '~/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
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

const CARATS = ['18ct', '22ct', '24ct'] as const
const MIN_PURCHASE_AMOUNT = 10000
const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

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
  goldPackages,
  billingRates,
}: {
  goldPackages?: GoldPackage[]
  billingRates?: BillingRates
}) {
  const packages = useMemo(() => {
    if (goldPackages && goldPackages.length > 0) return goldPackages
    return DEFAULT_PACKAGES
  }, [goldPackages])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedUser, setSelectedUser] = useState<SearchResult | null>(null)

  const purchaseForm = useForm({
    carat: '22ct',
    weight: '',
  })

  // Auto-filled breakdown from the current admin-set gold rates (same formula as the user page)
  const breakdown = useMemo(() => {
    const grams = Number(purchaseForm.data.weight)
    if (!billingRates || !grams || grams <= 0) return null

    const rate =
      purchaseForm.data.carat === '18ct'
        ? billingRates.rate18ct
        : purchaseForm.data.carat === '24ct'
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
  }, [purchaseForm.data.carat, purchaseForm.data.weight, billingRates])

  const selectedAmount = breakdown ? breakdown.investment : 0
  const goldPackage =
    selectedUser && selectedAmount >= MIN_PURCHASE_AMOUNT
      ? findPackage(packages, selectedAmount)
      : null
  const belowMinimum = breakdown !== null && breakdown.investment < MIN_PURCHASE_AMOUNT

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
    if (!selectedUser || !breakdown || belowMinimum) return
    purchaseForm.post(`/admin/users/${selectedUser.id}/purchase`, {
      preserveScroll: true,
      onSuccess: () => {
        purchaseForm.setData('weight', '')
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
                          ID: {user.id} ┬╖ {user.email} ┬╖ {user.phone}
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

                  {/* Carat + Weight */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="purchase-carat">Gold Carat</Label>
                      <Select
                        value={purchaseForm.data.carat}
                        onValueChange={(val) => purchaseForm.setData('carat', val || '22ct')}
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
                        value={purchaseForm.data.weight}
                        onChange={(e) => purchaseForm.setData('weight', e.target.value)}
                      />
                      {purchaseForm.errors.weight && (
                        <p className="text-sm text-destructive">
                          {purchaseForm.errors.weight}
                        </p>
                      )}
                      {(purchaseForm.errors as any).amount && (
                        <p className="text-sm text-destructive">
                          {(purchaseForm.errors as any).amount}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Auto-filled breakdown */}
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                    {breakdown ? (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between border-b border-primary/10 pb-2">
                          <span className="text-sm text-muted-foreground">
                            Gold Rate ({purchaseForm.data.carat.toUpperCase()})
                          </span>
                          <span className="text-sm font-semibold">
                            {formatCurrency(breakdown.rate)}/gm
                          </span>
                        </div>
                        {breakdownRow(
                          'Gold Value (Weight ├ù Rate)',
                          formatCurrency(breakdown.goldValue)
                        )}
                        {breakdownRow(
                          'Making Charges',
                          `${formatCurrency(breakdown.makingCharges)} (${breakdown.makingPercent}%)`
                        )}
                        {breakdownRow(
                          'GST',
                          `${formatCurrency(breakdown.gstAmount)} (${billingRates?.gstPercent}%)`
                        )}
                        {breakdownRow(
                          'Additional Charges',
                          `${formatCurrency(breakdown.additionalCharges)} (${billingRates?.additionalChargePercent}%)`
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

                  {/* Package Info */}
                  {goldPackage && (
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="default">{goldPackage.name}</Badge>
                        <span className="text-xs text-muted-foreground">
                          Γé╣{formatCurrency(selectedAmount)}
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

                  {belowMinimum && (
                    <p className="text-xs text-destructive">
                      Minimum purchase amount is {formatCurrency(MIN_PURCHASE_AMOUNT)} ΓÇö please
                      enter a higher gold weight.
                    </p>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={!breakdown || belowMinimum || purchaseForm.processing}
                  >
                    {purchaseForm.processing ? (
                      <>
                        <HugeiconsIcon
                          icon={Loading01Icon}
                          className="mr-2 h-4 w-4 animate-spin"
                        />
                        Processing...
                      </>
                    ) : (
                      <>
                        <HugeiconsIcon icon={ShoppingBag03Icon} className="mr-2 h-4 w-4" />
                        Purchase {formatCurrency(selectedAmount)} for {selectedUser.name}
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
