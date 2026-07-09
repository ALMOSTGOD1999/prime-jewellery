import { Head, useForm } from '@inertiajs/react'
import AppLayout from '~/components/app/layout'
import { Header } from '~/components/app/header'
import { Main } from '~/components/app/main'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Wallet01Icon,
  PiggyBankIcon,
  InformationCircleIcon,
  CheckmarkCircle01Icon,
} from '@hugeicons/core-free-icons'

interface PayoutPageProps {
  incomeWalletPayoutMonth: string | null
  workingWalletPayoutMonth: string | null
  nextIncomeMonth: string
  nextWorkingMonth: string
  hasUnpaidIncome: boolean
  hasUnpaidWorking: boolean
}

export default function AdminPayoutPage({
  incomeWalletPayoutMonth,
  workingWalletPayoutMonth,
  nextIncomeMonth,
  nextWorkingMonth,
  hasUnpaidIncome,
  hasUnpaidWorking,
}: PayoutPageProps) {
  const incomeForm = useForm({ month: nextIncomeMonth })
  const workingForm = useForm({ month: nextWorkingMonth })

  const handleIncomePayout = () => {
    incomeForm.post('/admin/payout/income-wallet')
  }

  const handleWorkingPayout = () => {
    workingForm.post('/admin/payout/working-wallet')
  }

  const bothPaid = incomeWalletPayoutMonth === workingWalletPayoutMonth && !!incomeWalletPayoutMonth

  return (
    <>
      <Head title="Month-end Payout" />
      <AppLayout>
        <Header>Month-end Payout</Header>
        <Main className="space-y-6">
          <Alert className="border-amber-200 bg-amber-50/50">
            <HugeiconsIcon icon={InformationCircleIcon} className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800">Important</AlertTitle>
            <AlertDescription className="text-amber-700">
              Users cannot see their income, transactions, or Cashback until both payout buttons are
              clicked for the month. Click both buttons at the start of each month to release the
              previous month&apos;s earnings.
            </AlertDescription>
          </Alert>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Income Wallet Payout */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950/40">
                    <HugeiconsIcon icon={PiggyBankIcon} className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle>Income Wallet Payout</CardTitle>
                    <CardDescription>Cashback only — 70% income + 30% gold wallet</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Last payout month</span>
                    <span className="font-medium">{incomeWalletPayoutMonth ?? 'Never'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Next payout month</span>
                    <span className="font-medium text-blue-600">{nextIncomeMonth}</span>
                  </div>
                </div>

                {incomeWalletPayoutMonth === nextIncomeMonth && !hasUnpaidIncome ? (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <HugeiconsIcon icon={CheckmarkCircle01Icon} className="h-4 w-4" />
                    <span>Payout already completed for {nextIncomeMonth}</span>
                  </div>
                ) : (
                  <Button
                    onClick={handleIncomePayout}
                    disabled={incomeForm.processing}
                    className="w-full"
                  >
                    {incomeForm.processing
                      ? 'Processing...'
                      : `Payout Income Wallet for ${nextIncomeMonth}`}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Working Wallet Payout */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/40">
                    <HugeiconsIcon icon={Wallet01Icon} className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <CardTitle>Working Wallet Payout</CardTitle>
                    <CardDescription>All other incomes except Cashback</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Last payout month</span>
                    <span className="font-medium">{workingWalletPayoutMonth ?? 'Never'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Next payout month</span>
                    <span className="font-medium text-emerald-600">{nextWorkingMonth}</span>
                  </div>
                </div>

                {workingWalletPayoutMonth === nextWorkingMonth && !hasUnpaidWorking ? (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <HugeiconsIcon icon={CheckmarkCircle01Icon} className="h-4 w-4" />
                    <span>Payout already completed for {nextWorkingMonth}</span>
                  </div>
                ) : (
                  <Button
                    onClick={handleWorkingPayout}
                    disabled={workingForm.processing}
                    variant="outline"
                    className="w-full border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                  >
                    {workingForm.processing
                      ? 'Processing...'
                      : `Payout Working Wallet for ${nextWorkingMonth}`}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {bothPaid && (
            <Alert className="border-green-200 bg-green-50/50">
              <HugeiconsIcon icon={CheckmarkCircle01Icon} className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">All caught up</AlertTitle>
              <AlertDescription className="text-green-700">
                Both income and working wallet payouts are up to date for {incomeWalletPayoutMonth}.
                Users can now view their earnings and transactions.
              </AlertDescription>
            </Alert>
          )}
        </Main>
      </AppLayout>
    </>
  )
}
