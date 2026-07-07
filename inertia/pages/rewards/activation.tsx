import { InferPageProps } from '@adonisjs/inertia/types'
import { Head } from '@inertiajs/react'
import { useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { InformationCircleIcon } from '@hugeicons/core-free-icons'

import type RewardsController from '#controllers/rewards_controller'

import AppLayout from '~/components/app/layout'
import { Header } from '~/components/app/header'
import { Main } from '~/components/app/main'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { ActivationRewardsDataTable } from '~/components/rewards/activation/data-table'
import { columns, columnsWithoutLevel } from '~/components/rewards/activation/columns'
import { WithdrawalModal } from '~/components/rewards/withdrawal_modal'

import { WITHDRAWAL_DATES } from '../../../app/constants/withdrawal'
import { WithdrawlTypeEnum } from '../../../app/enums/withdrawl'

export default function RewardActivationPage({
  activationCashback,
  activationSponsor,
  activationLevel,
  isPayoutReleased,
}: InferPageProps<RewardsController, 'activationPage'> & { isPayoutReleased: boolean }) {
  const [activeTab, setActiveTab] = useState('cashback')

  const cashbackData = activationCashback as any
  const sponsorData = activationSponsor as any
  const levelData = activationLevel as any

  const getWithdrawalConfig = (type: WithdrawlTypeEnum) => {
    const allowedDates = WITHDRAWAL_DATES[type]

    // If no date restrictions (empty array), always enabled
    if (allowedDates.length === 0) {
      return { enabled: true, disabledMessage: '' }
    }

    const today = new Date()
    const currentDay = today.getDate()
    const isEndOfMonth =
      new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() === currentDay

    const enabled = allowedDates.some((d) => d === currentDay || (d === 0 && isEndOfMonth))
    const disabledMessage = `Withdrawal only available on ${allowedDates.map((d) => (d === 0 ? 'end of month' : `${d}th`)).join(', ')}`

    return { enabled, disabledMessage }
  }

  return (
    <>
      <Head title="Activation Rewards" />
      <AppLayout>
        <Header>Activation Rewards</Header>
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
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="cashback">Cashback</TabsTrigger>
              <TabsTrigger value="sponsor">Direct Sponsor</TabsTrigger>
              <TabsTrigger value="level">Activation Level</TabsTrigger>
            </TabsList>

            <TabsContent value="cashback" className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex flex-wrap gap-6">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Total Cashback (10%)
                    </div>
                    <div className="text-2xl font-bold">
                      {new Intl.NumberFormat('en-IN', {
                        style: 'currency',
                        currency: 'INR',
                      }).format(cashbackData.stats.totalRewards)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Available to Withdraw
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                      {new Intl.NumberFormat('en-IN', {
                        style: 'currency',
                        currency: 'INR',
                      }).format(
                        Math.max(
                          0,
                          cashbackData.stats.totalRewards - (cashbackData.stats.totalWithdrawn || 0)
                        )
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Withdrawn:{' '}
                      {new Intl.NumberFormat('en-IN', {
                        style: 'currency',
                        currency: 'INR',
                      }).format(cashbackData.stats.totalWithdrawn || 0)}
                    </div>
                  </div>
                </div>
                <WithdrawalModal
                  maxAmount={Math.max(
                    0,
                    cashbackData.stats.totalRewards - (cashbackData.stats.totalWithdrawn || 0)
                  )}
                  type="activation_cashback"
                  label="Cashback Reward"
                  {...getWithdrawalConfig(WithdrawlTypeEnum.ACTIVATION_CASHBACK)}
                />
              </div>
              <div className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md border border-blue-200 dark:border-blue-800">
                💡 Cashback rewards are released monthly after activation. Each month unlocks 5% of
                your activation amount.
              </div>
            </TabsContent>

            <TabsContent value="sponsor" className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex flex-wrap gap-6">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Total Direct Sponsor (10%)
                    </div>
                    <div className="text-2xl font-bold">
                      {new Intl.NumberFormat('en-IN', {
                        style: 'currency',
                        currency: 'INR',
                      }).format(sponsorData.stats.totalRewards)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Available to Withdraw
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                      {new Intl.NumberFormat('en-IN', {
                        style: 'currency',
                        currency: 'INR',
                      }).format(
                        Math.max(
                          0,
                          sponsorData.stats.totalRewards - (sponsorData.stats.totalWithdrawn || 0)
                        )
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Withdrawn:{' '}
                      {new Intl.NumberFormat('en-IN', {
                        style: 'currency',
                        currency: 'INR',
                      }).format(sponsorData.stats.totalWithdrawn || 0)}
                    </div>
                  </div>
                </div>
                <WithdrawalModal
                  maxAmount={Math.max(
                    0,
                    sponsorData.stats.totalRewards - (sponsorData.stats.totalWithdrawn || 0)
                  )}
                  type="activation_sponsor"
                  label="Direct Sponsor Reward"
                  {...getWithdrawalConfig(WithdrawlTypeEnum.ACTIVATION_SPONSOR)}
                />
              </div>
              <ActivationRewardsDataTable
                columns={columnsWithoutLevel}
                data={sponsorData.data}
                meta={sponsorData.meta}
              />
            </TabsContent>

            <TabsContent value="level" className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex flex-wrap gap-6">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Total Eligible
                    </div>
                    <div className="text-2xl font-bold">
                      {new Intl.NumberFormat('en-IN', {
                        style: 'currency',
                        currency: 'INR',
                      }).format(levelData.stats.totalEligible)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Total Withdrawable
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                      {new Intl.NumberFormat('en-IN', {
                        style: 'currency',
                        currency: 'INR',
                      }).format(levelData.stats.totalWithdrawable)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Available to Withdraw
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                      {new Intl.NumberFormat('en-IN', {
                        style: 'currency',
                        currency: 'INR',
                      }).format(
                        Math.max(
                          0,
                          levelData.stats.totalWithdrawable - (levelData.stats.totalWithdrawn || 0)
                        )
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Withdrawn:{' '}
                      {new Intl.NumberFormat('en-IN', {
                        style: 'currency',
                        currency: 'INR',
                      }).format(levelData.stats.totalWithdrawn || 0)}
                    </div>
                  </div>
                </div>
                <WithdrawalModal
                  maxAmount={Math.max(
                    0,
                    levelData.stats.totalWithdrawable - (levelData.stats.totalWithdrawn || 0)
                  )}
                  type="activation_level"
                  label="Activation Level Reward"
                  {...getWithdrawalConfig(WithdrawlTypeEnum.ACTIVATION_LEVEL)}
                />
              </div>
              <div className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md border border-blue-200 dark:border-blue-800">
                💡 Level rewards are for 2 months total. Month 1 shows that month's reward,
                withdrawable after the month passes. Month 2 shows total reward for both months,
                withdrawable after 2 full months. Withdrawals available on the 9th of each month.
              </div>
              <ActivationRewardsDataTable
                columns={columns}
                data={levelData.data}
                meta={levelData.meta}
              />
            </TabsContent>
          </Tabs>
        </Main>
      </AppLayout>
    </>
  )
}
