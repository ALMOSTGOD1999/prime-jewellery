import { Head } from '@inertiajs/react'
import { InformationCircleIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import AppLayout from '~/components/app/layout'
import { Main } from '~/components/app/main'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'
import { Header } from '~/components/app/header'
import { DataTablePagination } from '~/components/data-table/data-table-pagination'
import { router } from '@inertiajs/react'

interface LevelIncomeProps {
  levelIncome: {
    meta: any
    stats: {
      totalRewards: number
      thisMonthRewards: number
      totalWithdrawn: number
    }
    data: Array<{
      date: string
      amount: number
    }>
  }
  isPayoutReleased: boolean
}

export default function LevelIncomePage({ levelIncome, isPayoutReleased }: LevelIncomeProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <AppLayout>
      <Head title="Level Income" />
      <Header>Level Income</Header>
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
            <div className="text-sm font-medium text-muted-foreground mb-1">Total Level Income</div>
            <div className="text-2xl font-bold">{formatCurrency(levelIncome.stats.totalRewards)}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-1">This Month</div>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(levelIncome.stats.thisMonthRewards)}
            </div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Level income is earned from purchases made by your downline members. It is automatically
          added to your working wallet each month.
        </p>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {levelIncome.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="h-24 text-center">
                    No level income yet. Grow your team to start earning.
                  </TableCell>
                </TableRow>
              ) : (
                levelIncome.data.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell>{row.date}</TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                      {formatCurrency(row.amount)}
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
                  pageIndex: levelIncome.meta.currentPage - 1,
                  pageSize: levelIncome.meta.perPage,
                },
              }),
              getPageCount: () => levelIncome.meta.lastPage,
              nextPage: () => router.visit(levelIncome.meta.nextPageUrl!),
              previousPage: () => router.visit(levelIncome.meta.previousPageUrl!),
              getCanNextPage: () => !!levelIncome.meta.nextPageUrl,
              getCanPreviousPage: () => !!levelIncome.meta.previousPageUrl,
              setPageIndex: (index: number) => {
                router.get('/rewards/level-income', { page: index + 1 })
              },
              setPageSize: (size: number) => {
                router.get('/rewards/level-income', { limit: size, page: 1 })
              },
            } as any
          }
          showSelectionCount={false}
        />
      </Main>
    </AppLayout>
  )
}
