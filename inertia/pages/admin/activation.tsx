import { Head, router } from '@inertiajs/react'
import { useState, useCallback, useEffect } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Search01Icon,
  Loading01Icon,
  CheckmarkCircle01Icon,
  UserCheck01Icon,
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

const ACTIVATION_OPTIONS = [1000]

interface SearchResult {
  id: number
  name: string
  email: string
  phone: string
  walletBalance: number
}

export default function ActivationPage() {
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
      const response = await fetch(`/wallet/search?q=${encodeURIComponent(query)}`)
      const data = await response.json()
      if (data.error) {
        setSearchResults([])
      } else {
        setSearchResults(data.data || [])
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

          {/* Selected User & Activation */}
          {selectedUser && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <HugeiconsIcon icon={UserCheck01Icon} className="h-5 w-5 text-primary" />
                  Activate User
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
                  <div className="mt-3 flex items-center gap-2">
                    <HugeiconsIcon icon={Wallet01Icon} className="h-4 w-4 text-primary" />
                    <span className="text-sm">
                      Wallet Balance:{' '}
                      <strong>₹{selectedUser.walletBalance.toLocaleString('en-IN')}</strong>
                    </span>
                  </div>
                </div>

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
              </CardContent>
            </Card>
          )}
        </Main>
      </AppLayout>
    </>
  )
}
