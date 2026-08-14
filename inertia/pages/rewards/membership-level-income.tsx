import { Head } from '@inertiajs/react'
import { router } from '@inertiajs/react'

import AppLayout from '~/components/app/layout'
import { Main } from '~/components/app/main'
import { Header } from '~/components/app/header'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'
import { DataTablePagination } from '~/components/data-table/data-table-pagination'

interface MembershipIncomeProps {
  membershipIncome: {
    meta: any
    stats: {
      totalIncome: number
    }
    data: Array<{
      id: string
      date: string | null
      level: number | null
      memberName: string | null
      amount: number
    }>
  }
}

export default function MembershipLevelIncomePage({ membershipIncome }: MembershipIncomeProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <AppLayout>
      <Head title="Membership Level Income" />
      <Header>Membership Level Income</Header>
      <Main className="space-y-4">
        <div className="flex flex-wrap gap-6">
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-1">
              Total Membership Level Income
            </div>
            <div className="text-2xl font-bold">{formatCurrency(membershipIncome.stats.totalIncome)}</div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          One-time income earned when members below you activate their account. Credited to your
          income wallet at the member's activation.
        </p>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Member</TableHead>
                <TableHead className="text-right">Level</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {membershipIncome.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No membership level income yet. Grow your team to start earning.
                  </TableCell>
                </TableRow>
              ) : (
                membershipIncome.data.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.date}</TableCell>
                    <TableCell>{row.memberName}</TableCell>
                    <TableCell className="text-right">{row.level}</TableCell>
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
                  pageIndex: membershipIncome.meta.currentPage - 1,
                  pageSize: membershipIncome.meta.perPage,
                },
              }),
              getPageCount: () => membershipIncome.meta.lastPage,
              nextPage: () => router.visit(membershipIncome.meta.nextPageUrl!),
              previousPage: () => router.visit(membershipIncome.meta.previousPageUrl!),
              getCanNextPage: () => !!membershipIncome.meta.nextPageUrl,
              getCanPreviousPage: () => !!membershipIncome.meta.previousPageUrl,
              setPageIndex: (index: number) => {
                router.get('/rewards/membership-level-income', { page: index + 1 })
              },
              setPageSize: (size: number) => {
                router.get('/rewards/membership-level-income', { limit: size, page: 1 })
              },
            } as any
          }
          showSelectionCount={false}
        />
      </Main>
    </AppLayout>
  )
}
