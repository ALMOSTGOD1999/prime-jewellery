import { Head, router } from '@inertiajs/react'
import { useState, useCallback, useEffect } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Search01Icon,
  Loading01Icon,
  CheckmarkCircle01Icon,
  UserCheck01Icon,
  Cancel01Icon,
  Clock01Icon,
  Wallet01Icon,
  Calendar01Icon,
  Calendar03Icon,
} from '@hugeicons/core-free-icons'

import AppLayout from '~/components/app/layout'
import { Header } from '~/components/app/header'
import { Main } from '~/components/app/main'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Badge } from '~/components/ui/badge'

// const ACTIVATION_OPTIONS = [0, 1000, 3000] // TODO: Enable when ₹3,000 package is ready
const ACTIVATION_OPTIONS = [0, 1000]

interface SearchResult {
  id: number
  name: string
  email: string
  phone: string
  status: string
  activatedAt: string | null
  activationAmount: number | null
}

interface RecentActivation {
  id: number
  name: string
  email: string
  phone: string
  activated_at: string
  activation_amount: number
}

interface ActivationStats {
  total_all: number
  total_month: number
  total_week: number
  total_users: number
  month_users: number
  week_users: number
}

function formatUserId(id: number) {
  return `PJ${String(id).padStart(6, '0')}`
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function timeAgo(dateStr: string) {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function ActivationPage({
  recentActivations = [],
  activationStats,
}: {
  recentActivations?: RecentActivation[]
  activationStats?: ActivationStats
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedUser, setSelectedUser] = useState<SearchResult | null>(null)
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
  const [activating, setActivating] = useState(false)
  const [activationError, setActivationError] = useState<string | null>(null)
  const [activationSuccess, setActivationSuccess] = useState(false)

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
      if (data.error) {
        setSearchResults([])
      } else {
        setSearchResults(data.users || [])
      }
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }, [])

  // Debounced search
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
    setSelectedAmount(null)
    setActivationError(null)
    setActivationSuccess(false)
  }

  const handleActivate = async () => {
    if (!selectedUser || !selectedAmount) return

    setActivating(true)
    setActivationError(null)
    setActivationSuccess(false)

    try {
      const response = await fetch('/admin/activation/user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-XSRF-TOKEN': getCsrfToken(),
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          amount: selectedAmount,
        }),
      })
      const data = await response.json()

      if (data.error) {
        setActivationError(data.error)
      } else {
        setActivationSuccess(true)
        setTimeout(() => {
          setSelectedUser(null)
          setSelectedAmount(null)
          setActivationSuccess(false)
          router.reload()
        }, 2000)
      }
    } catch {
      setActivationError('Activation failed. Please try again.')
    } finally {
      setActivating(false)
    }
  }

  function getCsrfToken(): string {
    const name = 'XSRF-TOKEN'
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
    if (match) return decodeURIComponent(match[2])
    return ''
  }

  return (
    <>
      <Head title="Activation Management" />
      <AppLayout>
        <Header>Activation Management</Header>
        <Main className="max-w-2xl mx-auto space-y-6">
          {/* Stats Cards */}
          {activationStats && (
            <div className="grid gap-4 grid-cols-3">
              <div className="relative overflow-hidden rounded-2xl border border-emerald/20 bg-gradient-to-br from-emerald/20 via-emerald/5 to-transparent p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="inline-flex size-8 items-center justify-center rounded-lg bg-emerald/10 text-emerald">
                    <HugeiconsIcon icon={Wallet01Icon} className="size-4" />
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">Total Collected</p>
                </div>
                <p className="text-2xl font-bold tracking-tight text-emerald">
                  {formatCurrency(activationStats.total_all)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{activationStats.total_users} users</p>
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-sky/20 bg-gradient-to-br from-sky/20 via-sky/5 to-transparent p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="inline-flex size-8 items-center justify-center rounded-lg bg-sky/10 text-sky">
                    <HugeiconsIcon icon={Calendar01Icon} className="size-4" />
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">This Month</p>
                </div>
                <p className="text-2xl font-bold tracking-tight text-sky">
                  {formatCurrency(activationStats.total_month)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{activationStats.month_users} users</p>
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-purple/20 bg-gradient-to-br from-purple/20 via-purple/5 to-transparent p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="inline-flex size-8 items-center justify-center rounded-lg bg-purple/10 text-purple">
                    <HugeiconsIcon icon={Calendar03Icon} className="size-4" />
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">This Week</p>
                </div>
                <p className="text-2xl font-bold tracking-tight text-purple">
                  {formatCurrency(activationStats.total_week)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{activationStats.week_users} users</p>
              </div>
            </div>
          )}

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

              {/* Search Results */}
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
                      {user.activatedAt ? (
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800 shrink-0">
                          Active · {formatCurrency(user.activationAmount || 0)}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs shrink-0">
                          Inactive
                        </Badge>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {!searching && searchQuery && searchResults.length === 0 && (
                <p className="text-sm text-muted-foreground text-center">No users found</p>
              )}
            </CardContent>
          </Card>

          {/* Selected User & Activation */}
          {selectedUser && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <HugeiconsIcon icon={UserCheck01Icon} className="h-5 w-5 text-primary" />
                  {selectedUser.activatedAt ? 'User Activated' : 'Activate User'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* User Info */}
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-lg">{selectedUser.name}</p>
                      <p className="text-sm text-muted-foreground">
                        ID: {selectedUser.id} · {selectedUser.email} · {selectedUser.phone}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedUser(null)
                        setSelectedAmount(null)
                        setActivationError(null)
                        setActivationSuccess(false)
                      }}
                    >
                      <HugeiconsIcon icon={Cancel01Icon} className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Already Activated — show activation details */}
                {selectedUser.activatedAt ? (
                  <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950 p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <HugeiconsIcon icon={CheckmarkCircle01Icon} className="h-5 w-5 text-green-600" />
                      <span className="font-semibold text-green-800 dark:text-green-200">Already Activated</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="space-y-1">
                        <p className="text-muted-foreground">Activated On</p>
                        <p className="font-medium">
                          {new Date(selectedUser.activatedAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-muted-foreground">Activation Amount</p>
                        <p className="font-semibold text-green-600 text-lg">
                          {formatCurrency(selectedUser.activationAmount || 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Not Activated — show activation form */}
                    {/* Activation Options */}
                    <div>
                      <Label className="mb-2 block">Select Activation Amount</Label>
                      <div className="grid grid-cols-2 gap-3">
                        {ACTIVATION_OPTIONS.map((amount) => {
                          return (
                            <button
                              key={amount}
                              type="button"
                              onClick={() => setSelectedAmount(amount)}
                              className={`relative flex items-center justify-between rounded-xl border-2 p-4 text-left transition-all ${
                                selectedAmount === amount
                                  ? 'border-primary bg-primary/5'
                                  : 'border-border hover:border-primary/50 hover:bg-muted/30'
                              }`}
                            >
                              <div>
                                <p className="font-semibold text-lg">
                                  ₹{amount.toLocaleString('en-IN')}
                                </p>
                                <p className="text-xs text-muted-foreground">Account Activation</p>
                              </div>
                              <div
                                className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                                  selectedAmount === amount
                                    ? 'border-primary bg-primary text-primary-foreground'
                                    : 'border-muted-foreground'
                                }`}
                              >
                                {selectedAmount === amount && (
                                  <HugeiconsIcon icon={CheckmarkCircle01Icon} className="h-4 w-4" />
                                )}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Error */}
                    {activationError && (
                      <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                        <p className="text-sm text-destructive">{activationError}</p>
                      </div>
                    )}

                    {/* Success */}
                    {activationSuccess && (
                      <div className="rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-3">
                        <div className="flex items-center gap-2">
                          <HugeiconsIcon
                            icon={CheckmarkCircle01Icon}
                            className="h-5 w-5 text-green-600"
                          />
                          <span className="text-sm font-medium text-green-800 dark:text-green-200">
                            {selectedUser.name} activated successfully!
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Activate Button */}
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={handleActivate}
                      disabled={!selectedAmount || activating}
                    >
                      {activating ? (
                        <>
                          <HugeiconsIcon icon={Loading01Icon} className="mr-2 h-4 w-4 animate-spin" />
                          Activating...
                        </>
                      ) : (
                        <>
                          <HugeiconsIcon icon={UserCheck01Icon} className="mr-2 h-4 w-4" />
                          Activate {selectedUser.name} (₹{(selectedAmount || 0).toLocaleString('en-IN')}
                          )
                        </>
                      )}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Recent Activations */}
          {recentActivations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <HugeiconsIcon icon={Clock01Icon} className="h-5 w-5 text-primary" />
                  Recent Activations
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {recentActivations.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50 border-b">
                          <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">User</th>
                          <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">ID</th>
                          <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Amount</th>
                          <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Activated</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {recentActivations.map((user) => (
                          <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3">
                              <p className="font-medium">{user.name}</p>
                              <p className="text-xs text-muted-foreground">{user.email || user.phone}</p>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className="text-xs font-mono">
                                {formatUserId(user.id)}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 font-semibold text-green-600">
                              {formatCurrency(user.activation_amount || 0)}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground text-xs">
                              {timeAgo(user.activated_at)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </Main>
      </AppLayout>
    </>
  )
}
