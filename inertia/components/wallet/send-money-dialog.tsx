import { useState, useCallback, useEffect } from 'react'
import { router } from '@inertiajs/react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog'
import { Button, buttonVariants } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import {
  MoneySend01Icon,
  Search01Icon,
  Loading01Icon,
  CheckmarkCircle01Icon,
  Cancel01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Badge } from '~/components/ui/badge'
import { useDebounce } from '~/hooks/use-debounce'

interface SendMoneyDialogProps {
  walletBalance: number
}

interface SearchResult {
  id: number
  name: string
  email: string
  phone: string
  walletBalance: number
}

export function SendMoneyDialog({ walletBalance }: SendMoneyDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebounce(searchQuery, 400)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [selectedUser, setSelectedUser] = useState<SearchResult | null>(null)
  const [amount, setAmount] = useState<number>(0)
  const [remark, setRemark] = useState('')
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Perform search when debounced value changes
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setSearching(true)
    setError(null)

    try {
      const response = await fetch(`/wallet/search?q=${encodeURIComponent(query)}`)
      const data = await response.json()

      if (data.error) {
        setError(data.error)
        setSearchResults([])
      } else {
        setSearchResults(data.data || [])
        if (data.data?.length === 0) {
          setError('No users found matching your search')
        }
      }
    } catch (err) {
      setError('Failed to search users')
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }, [])

  // Trigger search when debounced value changes
  useEffect(() => {
    if (debouncedSearch) {
      performSearch(debouncedSearch)
    } else {
      setSearchResults([])
    }
  }, [debouncedSearch, performSearch])

  const handleSelectUser = (user: SearchResult) => {
    setSelectedUser(user)
    setSearchQuery('')
    setSearchResults([])
    setError(null)
  }

  const handleClearSelected = () => {
    setSelectedUser(null)
    setAmount(0)
    setRemark('')
    setError(null)
  }

  /**
   * Get CSRF token from the XSRF-TOKEN cookie set by AdonisJS Shield.
   * The token must be sent back as X-XSRF-TOKEN header for POST requests.
   */
  function getCsrfToken(): string {
    const name = 'XSRF-TOKEN'
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
    if (match) return decodeURIComponent(match[2])
    return ''
  }

  const handleSubmit = async () => {
    if (!selectedUser || amount <= 0) return
    if (amount > walletBalance) {
      setError('Insufficient wallet balance')
      return
    }

    setLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const response = await fetch('/wallet/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-XSRF-TOKEN': getCsrfToken(),
        },
        body: JSON.stringify({
          receiverId: selectedUser.id,
          amount,
          remark,
        }),
      })

      if (!response.ok) {
        // Try to parse error JSON, fall back to generic message
        const errorData = await response.json().catch(() => ({ error: 'Transfer failed' }))
        setError(errorData.error || `Server error (${response.status})`)
        return
      }

      await response.json()
      setSuccessMessage(
        `₹${amount.toLocaleString('en-IN')} sent to ${selectedUser.name} successfully!`
      )
      // Reset form after success
      setTimeout(() => {
        setIsOpen(false)
        handleClearSelected()
        setSuccessMessage(null)
        // Refresh the page to show updated balance
        router.reload()
      }, 1500)
    } catch (err) {
      console.error('Transfer error:', err)
      setError('Transfer failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      handleClearSelected()
      setSuccessMessage(null)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger className={buttonVariants({ variant: 'default' })}>
        <HugeiconsIcon icon={MoneySend01Icon} className="mr-2 h-4 w-4" />
        Send Money
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Money</DialogTitle>
          <DialogDescription>
            Send money from your wallet to another user. Enter their User ID (e.g., PJR7638545) or
            name to search.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Balance */}
          <div className="rounded-lg bg-muted p-3">
            <span className="text-sm text-muted-foreground">Your Wallet Balance</span>
            <p className="text-lg font-bold">₹{walletBalance.toLocaleString('en-IN')}</p>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-3">
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={CheckmarkCircle01Icon} className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-800 dark:text-green-200">
                  {successMessage}
                </span>
              </div>
            </div>
          )}

          {/* Step 1: Search User */}
          {!selectedUser && (
            <div className="space-y-2">
              <Label>Search User</Label>
              <div className="relative">
                <Input
                  placeholder="Search by User ID (PJR7638545) or name..."
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
                <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                  {searchResults.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handleSelectUser(user)}
                      className="w-full px-3 py-2.5 text-left hover:bg-muted/50 transition-colors flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground">
                          ID: PJR{user.id} {user.phone ? `· ${user.phone}` : ''}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        ₹{user.walletBalance.toLocaleString('en-IN')}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}

              {/* Error / No Results */}
              {error && !searching && <p className="text-sm text-destructive">{error}</p>}
            </div>
          )}

          {/* Step 2: Selected User Confirmation */}
          {selectedUser && (
            <>
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      Sending to: <span className="text-primary">{selectedUser.name}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">User ID: PJR{selectedUser.id}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearSelected}
                    className="h-8 w-8 p-0"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    Name verified ✓
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    Balance: ₹{selectedUser.walletBalance.toLocaleString('en-IN')}
                  </Badge>
                </div>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="send-amount">Amount (₹)</Label>
                <Input
                  id="send-amount"
                  type="number"
                  min="1"
                  max={walletBalance}
                  step="1"
                  value={amount || ''}
                  onChange={(e) => {
                    setAmount(Number(e.target.value))
                    setError(null)
                  }}
                  placeholder="Enter amount"
                />
                {amount > walletBalance && (
                  <p className="text-xs text-destructive">Amount exceeds your wallet balance</p>
                )}
              </div>

              {/* Remark */}
              <div className="space-y-2">
                <Label htmlFor="send-remark">Remark (Optional)</Label>
                <Input
                  id="send-remark"
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="e.g. Payment for..."
                />
              </div>

              {/* Error */}
              {error && <p className="text-sm text-destructive">{error}</p>}
            </>
          )}
        </div>

        <DialogFooter>
          {selectedUser && (
            <Button
              onClick={handleSubmit}
              disabled={amount <= 0 || amount > walletBalance || loading}
              className="w-full sm:w-auto"
            >
              {loading ? (
                <>
                  <HugeiconsIcon icon={Loading01Icon} className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <HugeiconsIcon icon={MoneySend01Icon} className="mr-2 h-4 w-4" />
                  Send ₹{amount.toLocaleString('en-IN')}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
