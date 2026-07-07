import { InferPageProps } from '@adonisjs/inertia/types'
import { Head } from '@inertiajs/react'
import { HugeiconsIcon } from '@hugeicons/react'
import { InformationCircleIcon } from '@hugeicons/core-free-icons'

import type RewardsController from '#controllers/rewards_controller'

import AppLayout from '~/components/app/layout'
import { Header } from '~/components/app/header'
import { Main } from '~/components/app/main'
import { CashbackRewardsDataTable } from '~/components/rewards/cashback/data-table'
import { WithdrawalModal } from '~/components/rewards/withdrawal_modal'
import { columns } from '~/components/rewards/cashback/columns'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'

import { WITHDRAWAL_DATES } from '../../../app/constants/withdrawal'
import { WithdrawlTypeEnum } from '../../../app/enums/withdrawl'

export default function RewardCashbackPage({
  cashback,
  isPayoutReleased,
}: InferPageProps<RewardsController, 'cashbackPage'> & { isPayoutReleased: boolean }) {
  const { data, meta, stats } = cashback as any

  const allowedDates = WITHDRAWAL_DATES[WithdrawlTypeEnum.CASHBACK]
  const today = new Date()
  const currentDay = today.getDate()
  const isEndOfMonth =
    new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() === currentDay

  const isEnabled = allowedDates.some((d) => d === currentDay || (d === 0 && isEndOfMonth))
  const disabledMessage = `Withdrawal only available on ${allowedDates.map((d) => (d === 0 ? 'end of month' : `${d}th`)).join(', ')}`

  const availableBalance = Math.max(0, stats.totalRewards - (stats.totalWithdrawn || 0))

  return (
    <>
      <Head title="Cashback Rewards" />
      <AppLayout>
        <Header>Cashback Rewards</Header>
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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex flex-wrap gap-6">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Total Cashback Rewards
                </div>
                <div className="text-2xl font-bold">
                  {new Intl.NumberFormat('en-IN', {
                    style: 'currency',
                    currency: 'INR',
                  }).format(stats.totalRewards)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Withdrawn:{' '}
                  {new Intl.NumberFormat('en-IN', {
                    style: 'currency',
                    currency: 'INR',
                  }).format(stats.totalWithdrawn || 0)}
                </div>
                <div className="text-xs text-purple-600 font-medium mt-0.5">
                  Available:{' '}
                  {new Intl.NumberFormat('en-IN', {
                    style: 'currency',
                    currency: 'INR',
                  }).format(availableBalance)}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  This Month's Rewards
                </div>
                <div className="text-2xl font-bold">
                  {new Intl.NumberFormat('en-IN', {
                    style: 'currency',
                    currency: 'INR',
                  }).format(stats.thisMonthRewards)}
                </div>
              </div>
            </div>
            <WithdrawalModal
              maxAmount={availableBalance}
              type="cashback"
              label="Cashback Reward"
              enabled={isEnabled}
              disabledMessage={disabledMessage}
            />
          </div>
          <CashbackRewardsDataTable columns={columns} data={data} meta={meta} />
        </Main>
      </AppLayout>
    </>
  )
}
