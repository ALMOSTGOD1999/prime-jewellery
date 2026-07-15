import { Head, useForm } from '@inertiajs/react'
import { useState, useCallback, useEffect, useMemo } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Search01Icon,
  Loading01Icon,
  ShoppingBag03Icon,
  Wallet01Icon,
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
import { formatCurrency } from '~/lib/utils'

interface SearchResult {
  id: number
  name: string
  email: string
  phone: string
  walletBalance: number
}

interface GoldPackage {
  name: string
  minAmount: number
  maxAmount: number | null
  monthlyReward: number
  maxReturn: number
}

// Default fallback slabs matching business rules
const DEFAULT_PACKAGES: GoldPackage[] = [
  { name: 'Silver', minAmount: 10000, maxAmount: 199999, monthlyReward: 3, maxReturn: 100 },
  { name: 'Gold', minAmount: 200000, maxAmount: 499999, monthlyReward: 3.5, maxReturn: 100 },
  { name: 'Platinum', minAmount: 500000, maxAmount: null, monthlyReward: 4, maxReturn: 100 },
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

export default function AdminPurchasePage({ goldPackages }: { goldPackages?: GoldPackage[] }) {
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
  })

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
      const response = await fetch(`/wallet/search?q=${encodeURIComponent(query)}`)
      const data = await response.json()
      setSearchResults(data.error ? [] : data.data || [])
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
                      <Badge variant="secondary">
                        ₹{user.walletBalance.toLocaleString('en-IN')}
                      </Badge>
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
                    <div className="mt-2 flex items-center gap-2">
                      <HugeiconsIcon icon={Wallet01Icon} className="h-4 w-4 text-primary" />
                      <span className="text-sm">
                        Wallet Balance:{' '}
                        <strong>₹{selectedUser.walletBalance.toLocaleString('en-IN')}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="space-y-2">
                    <Label htmlFor="purchase-amount">Purchase Amount (₹)</Label>
                    <Input
                      id="purchase-amount"
                      type="number"
                      min={10000}
                      step="1"
                      placeholder="Enter amount (min ₹10,000)"
                      value={purchaseForm.data.amount}
                      onChange={(e) => purchaseForm.setData('amount', e.target.value)}
                    />
                    {purchaseForm.errors.amount && (
                      <p className="text-sm text-destructive">{purchaseForm.errors.amount}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Admin purchase — no wallet deduction required.
                    </p>
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

                  {selectedAmount < 10000 && selectedAmount > 0 && (
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
