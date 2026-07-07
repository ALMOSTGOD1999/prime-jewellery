import { Head, Link } from '@inertiajs/react'
import { useState } from 'react'
import { router } from '@inertiajs/react'
import { HugeiconsIcon } from '@hugeicons/react'

import AppLayout from '~/components/app/layout'
import { Header } from '~/components/app/header'
import { Main } from '~/components/app/main'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { Input } from '~/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { formatDateWithRelative } from '~/lib/format'
import { formatCurrency } from '~/lib/utils'

interface Transaction {
  id: number
  amount: number
  type: string
  remark: string | null
  createdAt: string
  approvedAt: string | null
  user: {
    id: number
    name: string
    email: string
    phone: string
  } | null
}

interface Meta {
  total: number
  perPage: number
  currentPage: number
  lastPage: number
}

interface StatementsPageProps {
  transactions: {
    data: Transaction[]
    meta: Meta
  }
  transactionTypes: string[]
}

const statusColors: Record<string, string> = {
  activation: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  wallet_credit: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  wallet_debit: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  topup: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  emi: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  investment: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
}

export default function AdminStatementsPage({
  transactions,
  transactionTypes,
}: StatementsPageProps) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [sortField, setSortField] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const handleSort = (field: string) => {
    const newOrder = sortField === field && sortOrder === 'desc' ? 'asc' : 'desc'
    setSortField(field)
    setSortOrder(newOrder)
    router.get(
      '/admin/statements',
      { sortBy: field, sortOrder: newOrder, search, type: typeFilter, page: 1 },
      { preserveState: true, replace: true }
    )
  }

  const applyFilters = () => {
    router.get(
      '/admin/statements',
      { sortBy: sortField, sortOrder, search, type: typeFilter, page: 1 },
      { preserveState: true, replace: true }
    )
  }

  return (
    <>
      <Head title="All Statements" />
      <AppLayout>
        <Header>All Statements &amp; Invoices</Header>
        <Main className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transaction Records</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <Input
                  placeholder="Search by user name, email or phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                  className="md:w-[300px]"
                />
                <Select value={typeFilter} onValueChange={(v) => v && setTypeFilter(v)}>
                  <SelectTrigger className="md:w-[180px]">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {transactionTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={applyFilters}>
                  Apply
                </Button>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">ID</th>
                      <th
                        className="text-left py-3 px-4 font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                        onClick={() => handleSort('userId')}
                      >
                        User
                      </th>
                      <th
                        className="text-left py-3 px-4 font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                        onClick={() => handleSort('type')}
                      >
                        Type
                      </th>
                      <th
                        className="text-right py-3 px-4 font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                        onClick={() => handleSort('amount')}
                      >
                        Amount
                      </th>
                      <th
                        className="text-left py-3 px-4 font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                        onClick={() => handleSort('createdAt')}
                      >
                        Date
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                        Remark
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.data.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-muted-foreground">
                          No transactions found
                        </td>
                      </tr>
                    ) : (
                      transactions.data.map((tx) => (
                        <tr key={tx.id} className="border-b hover:bg-muted/30">
                          <td className="py-3 px-4 text-muted-foreground text-xs">{tx.id}</td>
                          <td className="py-3 px-4">
                            {tx.user ? (
                              <Link
                                href={`/admin/users/${tx.user.id}`}
                                className="font-medium hover:underline"
                              >
                                {tx.user.name}
                              </Link>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              className={
                                statusColors[tx.type] ||
                                'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                              }
                              variant="outline"
                            >
                              {tx.type.replace(/_/g, ' ')}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-medium">
                            {formatCurrency(tx.amount)}
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-xs text-muted-foreground">
                              {formatDateWithRelative(tx.createdAt).formatted}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs text-muted-foreground max-w-[200px] truncate">
                            {tx.remark || '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Page {transactions.meta.currentPage} of {transactions.meta.lastPage} ·{' '}
                  {transactions.meta.total} total
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={transactions.meta.currentPage <= 1}
                    onClick={() =>
                      router.get(
                        '/admin/statements',
                        {
                          sortBy: sortField,
                          sortOrder,
                          search,
                          type: typeFilter,
                          page: transactions.meta.currentPage - 1,
                        },
                        { preserveState: true, preserveScroll: true }
                      )
                    }
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={transactions.meta.currentPage >= transactions.meta.lastPage}
                    onClick={() =>
                      router.get(
                        '/admin/statements',
                        {
                          sortBy: sortField,
                          sortOrder,
                          search,
                          type: typeFilter,
                          page: transactions.meta.currentPage + 1,
                        },
                        { preserveState: true, preserveScroll: true }
                      )
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </Main>
      </AppLayout>
    </>
  )
}
