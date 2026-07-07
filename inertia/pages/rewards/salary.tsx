import { Head, router } from '@inertiajs/react'
import { InformationCircleIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useState } from 'react'
import { Info as LuxonInfo } from 'luxon'

import AppLayout from '~/components/app/layout'
import { Main } from '~/components/app/main'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Header } from '~/components/app/header'
import { DataTablePagination } from '~/components/data-table/data-table-pagination'
import { WithdrawalModal } from '~/components/rewards/withdrawal_modal'

import { WITHDRAWAL_DATES } from '#constants/withdrawal'
import { WithdrawlTypeEnum } from '#enums/withdrawl'

interface SalaryRewardsProps {
  rewards: {
    meta: any
    stats: {
      totalAllTimeReward: number
      totalUnlocked: number
      totalWithdrawn: number
      availableBalance: number
    }
    data: Array<{
      id: number
      date: string
      totalReward: number
      breakdown: {
        monthlyIncentive: number
        houseFund: number | null
        travelAllowance: number
        carFund: number | null
      }
      designation: string
      carryingForward: number
      power: number
      weaker: number
    }>
  }
  filters: {
    month?: string
    year?: string
  }
  years: number[]
  isPayoutReleased: boolean
}

export default function SalaryRewards({
  rewards,
  filters,
  years,
  isPayoutReleased,
}: SalaryRewardsProps) {
  const [month, setMonth] = useState(filters.month || 'all')
  const [year, setYear] = useState(filters.year || 'all')

  const handleFilterChange = (key: string, value: string) => {
    if (key === 'month') setMonth(value)
    if (key === 'year') setYear(value)

    const newMonth = key === 'month' ? value : month
    const newYear = key === 'year' ? value : year

    const newFilters: any = {
      ...filters,
      month: newMonth !== 'all' ? newMonth : undefined,
      year: newYear !== 'all' ? newYear : undefined,
      page: 1,
    }

    // remove undefined keys
    Object.keys(newFilters).forEach((k) => {
      if (!newFilters[k]) {
        delete newFilters[k]
      }
    })

    router.get('/rewards/salaries', newFilters, {
      preserveState: true,
      preserveScroll: true,
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const months = LuxonInfo.months('long').map((m, i) => ({ value: (i + 1).toString(), label: m }))

  const allowedDates = WITHDRAWAL_DATES[WithdrawlTypeEnum.SALARY]
  const today = new Date()
  const currentDay = today.getDate()
  const isEnabled = allowedDates.includes(currentDay)
  const disabledMessage = `Withdrawals only available on ${allowedDates.map((d) => `${d}th`).join(' and ')}`

  return (
    <AppLayout>
      <Head title="Salary Rewards" />
      <Header>Salary Rewards</Header>
      <Main className="space-y-4">
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
                Total Lifetime Earnings
              </div>
              <div className="text-2xl font-bold">
                {formatCurrency(rewards.stats.totalAllTimeReward)}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Total Unlocked</div>
              <div className="text-2xl font-bold">
                {formatCurrency(rewards.stats.totalUnlocked)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Withdrawn: {formatCurrency(rewards.stats.totalWithdrawn || 0)}
              </div>
              <div className="text-xs text-purple-600 font-medium mt-0.5">
                Available: {formatCurrency(rewards.stats.availableBalance)}
              </div>
            </div>
          </div>
          <WithdrawalModal
            maxAmount={rewards.stats.availableBalance}
            type="salary"
            label="Salary Reward"
            enabled={isEnabled}
            disabledMessage={disabledMessage}
          />
        </div>

        <div className="flex gap-4">
          <Select value={month} onValueChange={(v) => handleFilterChange('month', v!)}>
            <SelectTrigger className="w-45">
              <SelectValue placeholder="All Months" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {months.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={year} onValueChange={(v) => handleFilterChange('year', v!)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Years" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {years.map((y) => (
                <SelectItem key={y} value={y.toString()}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month Year</TableHead>
                <TableHead>Total Reward</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Carrying Forward</TableHead>
                <TableHead>Power / Weaker</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rewards.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No results.
                  </TableCell>
                </TableRow>
              ) : (
                rewards.data.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.date}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-green-600">
                          {formatCurrency(row.totalReward)}
                        </span>
                        <Popover>
                          <PopoverTrigger>
                            <HugeiconsIcon
                              icon={InformationCircleIcon}
                              className="h-4 w-4 text-muted-foreground hover:text-primary cursor-pointer"
                            />
                          </PopoverTrigger>
                          <PopoverContent className="w-80">
                            <div className="space-y-2">
                              <h4 className="font-medium leading-none">Reward Breakdown</h4>
                              <div className="grid gap-2 text-sm">
                                <div className="grid grid-cols-2 items-center gap-4">
                                  <span>Monthly Incentive:</span>
                                  <span className="text-right font-medium">
                                    {formatCurrency(row.breakdown.monthlyIncentive)}
                                  </span>
                                </div>
                                {row.breakdown.houseFund !== null && (
                                  <div className="grid grid-cols-2 items-center gap-4">
                                    <span>House Fund:</span>
                                    <span className="text-right font-medium">
                                      {formatCurrency(row.breakdown.houseFund)}
                                    </span>
                                  </div>
                                )}
                                <div className="grid grid-cols-2 items-center gap-4">
                                  <span>Travel Allowance:</span>
                                  <span className="text-right font-medium">
                                    {formatCurrency(row.breakdown.travelAllowance)}
                                  </span>
                                </div>
                                {row.breakdown.carFund !== null && (
                                  <div className="grid grid-cols-2 items-center gap-4">
                                    <span>Car Fund:</span>
                                    <span className="text-right font-medium">
                                      {formatCurrency(row.breakdown.carFund)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary text-primary-foreground hover:bg-primary/80">
                        {row.designation}
                      </span>
                    </TableCell>
                    <TableCell>{formatCurrency(row.carryingForward)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col text-xs">
                        <span className="text-yellow-600 font-medium">
                          Power: {formatCurrency(row.power)}
                        </span>
                        <span className="text-red-500 font-medium">
                          Weaker: {formatCurrency(row.weaker)}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <DataTablePagination
          table={
            {
              getState: () => ({
                pagination: {
                  pageIndex: rewards.meta.currentPage - 1,
                  pageSize: rewards.meta.perPage,
                },
              }),
              getPageCount: () => rewards.meta.lastPage,
              nextPage: () => router.visit(rewards.meta.nextPageUrl!),
              previousPage: () => router.visit(rewards.meta.previousPageUrl!),
              getCanNextPage: () => !!rewards.meta.nextPageUrl,
              getCanPreviousPage: () => !!rewards.meta.previousPageUrl,
              setPageIndex: (index: number) => {
                router.get('/rewards/salaries', { ...filters, page: index + 1 })
              },
              setPageSize: (size: number) => {
                router.get('/rewards/salaries', { ...filters, limit: size, page: 1 })
              },
            } as any
          }
          showSelectionCount={false}
        />
      </Main>
    </AppLayout>
  )
}
