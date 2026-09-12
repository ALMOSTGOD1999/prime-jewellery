import { Head, router } from '@inertiajs/react'
import { HugeiconsIcon } from '@hugeicons/react'
import { InformationCircleIcon } from '@hugeicons/core-free-icons'

import AppLayout from '~/components/app/layout'
import { Header } from '~/components/app/header'
import { Main } from '~/components/app/main'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { Badge } from '~/components/ui/badge'
import { DataTablePagination } from '~/components/data-table/data-table-pagination'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'

interface LevelIncomePerUserProps {
  levelIncomePerUser: {
    meta: any
    stats: {
      totalLevelIncome: number
      totalMembers: number
    }
    data: Array<{
      userId: number
      name: string
      level: number
      percentage: number
      totalPurchase: number
      totalLevelIncome: number
    }>
  }
  isPayoutReleased: boolean
}

const levelBadgeColors: Record<number, string> = {
  1: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  2: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  3: 'bg-blue-50 text-blue-700 border-blue-200',
  4: 'bg-blue-50 text-blue-600 border-blue-200',
  5: 'bg-violet-50 text-violet-700 border-violet-200',
  6: 'bg-violet-50 text-violet-600 border-violet-200',
  7: 'bg-purple-50 text-purple-700 border-purple-200',
}

function getLevelBadgeColor(level: number): string {
  return levelBadgeColors[level] || 'bg-gray-50 text-gray-700 border-gray-200'
}

export default function LevelIncomeHistoryPage({
  levelIncomePerUser,
  isPayoutReleased,
}: LevelIncomePerUserProps) {
  const { data, meta, stats } = levelIncomePerUser

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount)

  return (
    <>
      <Head title="Level Income History" />
      <AppLayout>
        <Header>Level Income History</Header>
        <Main className="space-y-4">
          {!isPayoutReleased && (
            <Alert className="border-amber-200 bg-amber-50/50">
              <HugeiconsIcon icon={InformationCircleIcon} className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800">Month-end payout pending</AlertTitle>
              <AlertDescription className="text-amber-700">
                Your income and transactions will be visible after the admin processes the month-end
                payout.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-wrap gap-6">
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">
                Total Level Income
              </div>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalLevelIncome)}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">
                Earning Members
              </div>
              <div className="text-2xl font-bold text-blue-600">{stats.totalMembers}</div>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Level income is earned from purchases made by your downline members. This page shows
            which members contributed to your level income and at what level.
          </p>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead className="text-center">Level</TableHead>
                  <TableHead className="text-right">Purchase Amount</TableHead>
                  <TableHead className="text-right">Income %</TableHead>
                  <TableHead className="text-right">Level Income</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No level income yet. Grow your team to start earning.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((row) => (
                    <TableRow key={row.userId}>
                      <TableCell>
                        <div className="font-medium">{row.name}</div>
                        <div className="text-xs text-muted-foreground">
                          PJ{String(row.userId).padStart(6, '0')}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={`text-xs font-medium ${getLevelBadgeColor(row.level)}`}
                        >
                          L{row.level}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatCurrency(row.totalPurchase)}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {row.percentage}%
                      </TableCell>
                      <TableCell className="text-right font-medium text-emerald-600">
                        +{formatCurrency(row.totalLevelIncome)}
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
                    pageIndex: meta.current_page - 1,
                    pageSize: meta.per_page,
                  },
                }),
                getPageCount: () => meta.last_page,
                nextPage: () => meta.next_page_url && router.visit(meta.next_page_url),
                previousPage: () =>
                  meta.previous_page_url && router.visit(meta.previous_page_url),
                getCanNextPage: () => !!meta.next_page_url,
                getCanPreviousPage: () => !!meta.previous_page_url,
                setPageIndex: (index: number) => {
                  router.get('/rewards/level-income-history', { page: index + 1 })
                },
                setPageSize: (size: number) => {
                  router.get('/rewards/level-income-history', { limit: size, page: 1 })
                },
              } as any
            }
            showSelectionCount={false}
          />
        </Main>
      </AppLayout>
    </>
  )
}
