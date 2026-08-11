import type React from 'react'
import { Head, useForm } from '@inertiajs/react'

import AppLayout from '~/components/app/layout'
import { Header } from '~/components/app/header'
import { Main } from '~/components/app/main'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Badge } from '~/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { formatCurrency } from '~/lib/utils'
import { formatDateWithRelative } from '~/lib/format'
import { HugeiconsIcon } from '@hugeicons/react'
import { InformationCircleIcon } from '@hugeicons/core-free-icons'

type Investment = {
  id: number
  amount: number
  monthlyReturnRate: number
  status: 'active' | 'closed'
  startedAt: string
  closedAt: string | null
  remark: string | null
}

type Distribution = {
  id: number
  investmentId: number
  periodMonth: string
  investmentAmount: number
  returnAmount: number
  incomeAmount: number
  goldAmount: number
  createdAt: string
}

type InvestmentPageProps = {
  stats: {
    activeInvestmentAmount: number
    totalReturn: number
    totalIncome: number
    totalGold: number
    totalWithdrawn: number
    availableIncome: number
    monthlyReturnPercent: number
    incomeWalletPercent: number
    goldWalletPercent: number
  }
  investments: Investment[]
  distributions: {
    meta: any
    data: Distribution[]
  }
  isPayoutReleased: boolean
}

export default function InvestmentsPage({
  stats,
  investments,
  distributions,
  isPayoutReleased,
}: InvestmentPageProps) {
  const withdrawalForm = useForm({
    amount: '',
  })

  const submitWithdrawal = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    withdrawalForm.post('/investments/withdraw-income', {
      onSuccess: () => withdrawalForm.reset(),
    })
  }

  return (
    <>
      <Head title="Investments" />
      <AppLayout>
        <Header>Investments</Header>
        <Main className="space-y-6">
          {!isPayoutReleased && (
            <Alert className="border-amber-200 bg-amber-50/50">
              <HugeiconsIcon icon={InformationCircleIcon} className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800">Month-end payout pending</AlertTitle>
              <AlertDescription className="text-amber-700">
                Your income, transactions, and Cashback will be visible after the admin processes
                the month-end payout.
              </AlertDescription>
            </Alert>
          )}
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <Card>
              <CardHeader>
                <CardDescription>Active Investment</CardDescription>
                <CardTitle className="text-2xl">
                  {formatCurrency(stats.activeInvestmentAmount)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Total Returns</CardDescription>
                <CardTitle className="text-2xl">{formatCurrency(stats.totalReturn)}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Cashback Wallet</CardDescription>
                <CardTitle className="text-2xl">{formatCurrency(stats.availableIncome)}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Gold Wallet Returns</CardDescription>
                <CardTitle className="text-2xl">{formatCurrency(stats.totalGold)}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card className="max-w-xl">
            <CardHeader>
              <CardTitle>Withdraw Cashback Wallet</CardTitle>
              <CardDescription>
                Cashback Wallet balance can be withdrawn to your approved bank account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={submitWithdrawal} className="space-y-4">
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-sm text-muted-foreground">Available Cashback Wallet</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.availableIncome)}</p>
                  <p className="text-xs text-muted-foreground">
                    Pending and approved withdrawals are deducted from this balance.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="withdraw-amount">Withdrawal Amount</Label>
                  <Input
                    id="withdraw-amount"
                    type="number"
                    min="1"
                    max={stats.availableIncome}
                    value={withdrawalForm.data.amount}
                    onChange={(event) => withdrawalForm.setData('amount', event.target.value)}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={
                    !isPayoutReleased ||
                    withdrawalForm.processing ||
                    Number(withdrawalForm.data.amount || 0) <= 0 ||
                    Number(withdrawalForm.data.amount || 0) > stats.availableIncome
                  }
                >
                  {withdrawalForm.processing ? 'Submitting...' : 'Request Withdrawal'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>My Investments</CardTitle>
              <CardDescription>Principal amounts that generate monthly returns.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-2 pr-4">ID</th>
                      <th className="py-2 pr-4">Amount</th>
                      <th className="py-2 pr-4">Monthly Return</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Started</th>
                    </tr>
                  </thead>
                  <tbody>
                    {investments.map((investment) => {
                      const date = formatDateWithRelative(investment.startedAt)
                      return (
                        <tr key={investment.id} className="border-b last:border-0">
                          <td className="py-3 pr-4">#{investment.id}</td>
                          <td className="py-3 pr-4 font-medium">
                            {formatCurrency(investment.amount)}
                          </td>
                          <td className="py-3 pr-4">{investment.monthlyReturnRate}%</td>
                          <td className="py-3 pr-4">
                            <Badge
                              variant={investment.status === 'active' ? 'default' : 'secondary'}
                            >
                              {investment.status}
                            </Badge>
                          </td>
                          <td className="py-3 pr-4">
                            {date.formatted}
                            <span className="block text-xs text-muted-foreground">
                              {date.relative}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                    {investments.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-muted-foreground">
                          No investments yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Return Distribution History</CardTitle>
              <CardDescription>
                Every monthly return is split into Income and Gold wallets.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-2 pr-4">Period</th>
                      <th className="py-2 pr-4">Investment</th>
                      <th className="py-2 pr-4">Return</th>
                      <th className="py-2 pr-4">Cashback Wallet</th>
                      <th className="py-2 pr-4">Gold Wallet</th>
                    </tr>
                  </thead>
                  <tbody>
                    {distributions.data.map((distribution) => (
                      <tr key={distribution.id} className="border-b last:border-0">
                        <td className="py-3 pr-4">{distribution.periodMonth}</td>
                        <td className="py-3 pr-4">
                          {formatCurrency(distribution.investmentAmount)}
                        </td>
                        <td className="py-3 pr-4 font-medium">
                          {formatCurrency(distribution.returnAmount)}
                        </td>
                        <td className="py-3 pr-4 text-green-600">
                          {formatCurrency(distribution.incomeAmount)}
                        </td>
                        <td className="py-3 pr-4 text-yellow-600">
                          {formatCurrency(distribution.goldAmount)}
                        </td>
                      </tr>
                    ))}
                    {distributions.data.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-muted-foreground">
                          No return distributions yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </Main>
      </AppLayout>
    </>
  )
}
