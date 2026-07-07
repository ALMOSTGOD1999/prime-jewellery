import { Head } from '@inertiajs/react'
import AppLayout from '~/components/app/layout'
import { Header } from '~/components/app/header'
import { Main } from '~/components/app/main'
import {
  UserCheck01Icon,
  CheckmarkCircle01Icon,
  Loading01Icon,
  InformationCircleIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { router } from '@inertiajs/react'
import { useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'

// Admin components
import { WalletDataTable } from '~/components/admin/wallet/data-table'
import { columns } from '~/components/admin/wallet/columns'
import { WalletHistoryDataTable } from '~/components/admin/wallet/history-data-table'

// User components
import { SendMoneyDialog } from '~/components/wallet/send-money-dialog'
import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog'

const ACTIVATION_OPTIONS = [500, 1000]

interface WalletPageProps {
  isAdmin: boolean
  wallets?: {
    data: any[]
    meta: any
  }
  totalWalletBalance?: number
  user: {
    id: number
    name: string
    walletBalance: number
    email?: string
    phone?: string
  }
  transactions?: {
    data: any[]
    meta: any
  }
  activationAmount?: number
  isActivated?: boolean
  isPayoutReleased?: boolean
}

export default function WalletPage(props: WalletPageProps) {
  const {
    isAdmin,
    wallets,
    totalWalletBalance,
    user,
    transactions,
    isActivated = false,
    isPayoutReleased = true,
  } = props

  if (isAdmin) {
    return (
      <AdminWalletView wallets={wallets!} totalWalletBalance={totalWalletBalance!} user={user} />
    )
  }

  return (
    <UserWalletView
      user={user}
      transactions={transactions!}
      isActivated={isActivated}
      isPayoutReleased={isPayoutReleased}
    />
  )
}

function AdminWalletView({
  wallets,
  totalWalletBalance,
  user,
}: {
  wallets: { data: any[]; meta: any }
  totalWalletBalance: number
  user: { id: number; name: string; walletBalance: number }
}) {
  return (
    <>
      <Head title="Wallet Management" />
      <AppLayout>
        <Header>Wallet Management</Header>
        <Main>
          <div className="space-y-6">
            {/* Stats + Actions Row */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-sm text-muted-foreground">Total Wallet Balance (All Users)</p>
                <p className="text-2xl font-bold text-primary">
                  ₹{Number(totalWalletBalance).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-sm text-muted-foreground">Your Wallet Balance</p>
                <p className="text-2xl font-bold text-foreground">
                  ₹{Number(user.walletBalance).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-center">
                <SendMoneyDialog walletBalance={user.walletBalance} />
              </div>
            </div>

            {/* Users Table */}
            <WalletDataTable columns={columns} data={wallets.data} meta={wallets.meta} />
          </div>
        </Main>
      </AppLayout>
    </>
  )
}

function UserWalletView({
  user,
  transactions,
  isActivated,
  isPayoutReleased,
}: {
  user: { id: number; name: string; walletBalance: number }
  transactions: { data: any[]; meta: any }
  isActivated: boolean
  isPayoutReleased: boolean
}) {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
  const [activating, setActivating] = useState(false)
  const [activationError, setActivationError] = useState<string | null>(null)
  const [activationSuccess, setActivationSuccess] = useState(false)

  const canAfford500 = user.walletBalance >= 500
  const minRequired = 500

  const handleActivate = async () => {
    if (!selectedAmount) return
    setActivating(true)
    setActivationError(null)

    try {
      const response = await fetch('/wallet/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: selectedAmount }),
      })
      const data = await response.json()

      if (data.error) {
        setActivationError(data.error)
      } else {
        setActivationSuccess(true)
        setTimeout(() => {
          router.reload()
        }, 1500)
      }
    } catch (err) {
      setActivationError('Activation failed. Please try again.')
    } finally {
      setActivating(false)
    }
  }

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setSelectedAmount(null)
      setActivationError(null)
    }
  }

  return (
    <>
      <Head title="My Wallet" />
      <AppLayout>
        <Header>My Wallet</Header>
        <Main className="space-y-6">
          {!isPayoutReleased && (
            <Alert className="border-amber-200 bg-amber-50/50">
              <HugeiconsIcon icon={InformationCircleIcon} className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800">Month-end payout pending</AlertTitle>
              <AlertDescription className="text-amber-700">
                Your income, transactions, and ROI will be visible after the admin processes the
                month-end payout.
              </AlertDescription>
            </Alert>
          )}

          {/* Balance + Actions */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-sm text-muted-foreground">Available Wallet Balance</p>
              <p className="text-2xl font-bold text-primary">
                ₹{Number(user.walletBalance).toLocaleString('en-IN')}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-center">
              <SendMoneyDialog walletBalance={user.walletBalance} />
            </div>

            <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-center">
              {isActivated ? (
                <div className="flex items-center gap-2 text-green-600">
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} className="h-5 w-5" />
                  <span className="font-medium text-sm">Account Activated</span>
                </div>
              ) : (
                <Dialog onOpenChange={handleDialogClose}>
                  <DialogTrigger
                    render={
                      <Button variant={canAfford500 ? 'default' : 'outline'}>
                        <HugeiconsIcon icon={UserCheck01Icon} className="mr-2 h-4 w-4" />
                        Activate Account
                      </Button>
                    }
                  />
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Activate Your Account</DialogTitle>
                      <DialogDescription>
                        Your wallet balance is{' '}
                        <strong>₹{user.walletBalance.toLocaleString('en-IN')}</strong>. Select an
                        activation amount below.
                      </DialogDescription>
                    </DialogHeader>

                    {/* Activation Options */}
                    <div className="grid gap-3 py-2">
                      {ACTIVATION_OPTIONS.map((amount) => {
                        const affordable = user.walletBalance >= amount
                        return (
                          <button
                            key={amount}
                            type="button"
                            onClick={() => affordable && setSelectedAmount(amount)}
                            disabled={!affordable}
                            className={`relative flex items-center justify-between rounded-xl border-2 p-4 text-left transition-all ${
                              selectedAmount === amount
                                ? 'border-primary bg-primary/5'
                                : affordable
                                  ? 'border-border hover:border-primary/50 hover:bg-muted/30'
                                  : 'border-border opacity-40 cursor-not-allowed'
                            }`}
                          >
                            <div>
                              <p className="font-semibold text-lg">
                                ₹{amount.toLocaleString('en-IN')}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {amount === 500 ? 'Basic Activation' : 'Premium Activation'}
                              </p>
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
                            Account activated successfully!
                          </span>
                        </div>
                      </div>
                    )}

                    <DialogFooter className="gap-2 sm:justify-end">
                      <Button variant="outline" onClick={() => handleDialogClose(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleActivate} disabled={!selectedAmount || activating}>
                        {activating ? (
                          <>
                            <HugeiconsIcon
                              icon={Loading01Icon}
                              className="mr-2 h-4 w-4 animate-spin"
                            />
                            Activating...
                          </>
                        ) : (
                          `Activate Now (₹${(selectedAmount || 0).toLocaleString('en-IN')})`
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>

          {/* Insufficient Balance Warning */}
          {!isActivated && user.walletBalance < minRequired && (
            <div className="rounded-xl border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950 p-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                You need at least ₹{minRequired.toLocaleString('en-IN')} in your wallet to activate
                your account. Add funds or receive transfers from other users.
              </p>
            </div>
          )}

          {/* Transaction History */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Transaction History</h2>
            <WalletHistoryDataTable data={transactions.data} meta={transactions.meta} />
          </div>
        </Main>
      </AppLayout>
    </>
  )
}
