import { Head, router } from '@inertiajs/react'
import { useState } from 'react'

import type { InferPageProps } from '@adonisjs/inertia/types'
import type SettingsController from '#controllers/settings_controller'

import { Header } from '~/components/app/header'
import { Main } from '~/components/app/main'
import AppLayout from '~/components/app/layout'
import {
  CheckmarkCircle01Icon,
  Loading01Icon,
  UserCheck01Icon,
  Wallet01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Button } from '~/components/ui/button'

const ACTIVATION_OPTIONS = [500, 1000]

export default function AccountsActivatePage({
  isActivated,
  walletBalance,
}: InferPageProps<SettingsController, 'activatePage'>) {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
  const [activating, setActivating] = useState(false)
  const [activationError, setActivationError] = useState<string | null>(null)
  const [activationSuccess, setActivationSuccess] = useState(false)

  const canAfford500 = walletBalance >= 500

  const handleActivate = async () => {
    if (!selectedAmount) return
    setActivating(true)
    setActivationError(null)

    try {
      const response = await fetch('/settings/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': getCsrfToken() },
        body: JSON.stringify({ amount: selectedAmount }),
      })
      const data = await response.json()

      if (data.error) {
        setActivationError(data.error)
      } else {
        setActivationSuccess(true)
        setTimeout(() => {
          router.reload()
        }, 2000)
      }
    } catch (err) {
      setActivationError('Activation failed. Please try again.')
    } finally {
      setActivating(false)
    }
  }

  if (isActivated) {
    return (
      <>
        <Head title="Account Activation" />
        <AppLayout>
          <Header>Account Activation</Header>
          <Main className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-4">
              <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-4 w-fit mx-auto">
                <HugeiconsIcon icon={CheckmarkCircle01Icon} className="h-12 w-12 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold">Account Activated</h2>
              <p className="text-muted-foreground">
                Your account has been activated. You now have access to all features.
              </p>
              <Button onClick={() => router.visit('/dashboard')}>Go to Dashboard</Button>
            </div>
          </Main>
        </AppLayout>
      </>
    )
  }

  return (
    <>
      <Head title="Activate Account" />
      <AppLayout>
        <Header>Activate Account</Header>
        <Main className="max-w-lg mx-auto space-y-6">
          {/* Wallet Balance */}
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <HugeiconsIcon icon={Wallet01Icon} className="h-5 w-5 text-primary" />
              <p className="text-sm text-muted-foreground">Your Wallet Balance</p>
            </div>
            <p className="text-3xl font-bold text-primary">
              ₹{Number(walletBalance).toLocaleString('en-IN')}
            </p>
          </div>

          {/* Activation Options */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="text-center">
              <h2 className="text-xl font-semibold">Select Activation Amount</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Choose how much to pay for account activation. The amount will be deducted from your
                wallet.
              </p>
            </div>

            <div className="grid gap-3">
              {ACTIVATION_OPTIONS.map((amount) => {
                const affordable = walletBalance >= amount
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
                      <p className="font-semibold text-lg">₹{amount.toLocaleString('en-IN')}</p>
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

            {!canAfford500 && (
              <p className="text-sm text-destructive text-center">
                You need at least ₹500 in your wallet to activate your account.
              </p>
            )}
          </div>

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
                Activate Now (₹{(selectedAmount || 0).toLocaleString('en-IN')})
              </>
            )}
          </Button>

          {/* Error Message */}
          {activationError && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
              <p className="text-sm text-destructive">{activationError}</p>
            </div>
          )}

          {/* Success Message */}
          {activationSuccess && (
            <div className="rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-4 text-center space-y-2">
              <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-3 w-fit mx-auto">
                <HugeiconsIcon icon={CheckmarkCircle01Icon} className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
                Congratulations! 🎉
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300">
                Your account has been activated successfully! You now have access to all features.
              </p>
            </div>
          )}
        </Main>
      </AppLayout>
    </>
  )
}

/**
 * Get CSRF token from the XSRF-TOKEN cookie set by AdonisJS Shield.
 */
function getCsrfToken(): string {
  const name = 'XSRF-TOKEN'
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  if (match) return decodeURIComponent(match[2])
  return ''
}
