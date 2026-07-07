import * as React from 'react'
import {
  ColumnDef,
  getCoreRowModel,
  PaginationState,
  SortingState,
  useReactTable,
  VisibilityState,
} from '@tanstack/react-table'
import { router } from '@inertiajs/react'
import { DataTable } from '~/components/data-table/data-table'
import { DataTableViewOptions } from '~/components/data-table/data-table-view-options'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Button } from '~/components/ui/button'
import { Cancel01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { formatCurrency } from '~/lib/format'

interface AdminWithdrawalDataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  meta: any
  stats: {
    pending: number
    approved: number
    rejected: number
  }
}

export function AdminWithdrawalDataTable<TData, TValue>({
  columns,
  data,
  meta,
  stats,
}: AdminWithdrawalDataTableProps<TData, TValue>) {
  // URL Search Params
  const searchParams = new URLSearchParams(window.location.search)
  const initialStatus = searchParams.get('status') || 'all'
  const initialSortBy = searchParams.get('sortBy') || 'createdAt'
  const initialSortOrder = searchParams.get('sortOrder') || 'desc'

  const [status, setStatus] = React.useState(initialStatus)
  const [sorting, setSorting] = React.useState<SortingState>([
    {
      id: initialSortBy,
      desc: initialSortOrder === 'desc',
    },
  ])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})

  // Pagination State
  const [{ pageIndex, pageSize }, setPagination] = React.useState<PaginationState>({
    pageIndex: meta.currentPage - 1,
    pageSize: meta.perPage,
  })

  const pagination = React.useMemo(
    () => ({
      pageIndex,
      pageSize,
    }),
    [pageIndex, pageSize]
  )

  // Sync Status and Sorting with URL
  React.useEffect(() => {
    const currentSort = sorting[0]
    const sortBy = currentSort?.id || 'createdAt'
    const sortOrder = currentSort?.desc ? 'desc' : 'asc'

    if (status !== initialStatus || sortBy !== initialSortBy || sortOrder !== initialSortOrder) {
      router.get(
        window.location.pathname,
        {
          status,
          sortBy,
          sortOrder,
          page: 1, // Reset to first page
          limit: pageSize,
        },
        { preserveState: true, replace: true }
      )
    }
  }, [status, sorting, pageSize])

  // Sync Pagination with URL
  React.useEffect(() => {
    if (pageIndex + 1 !== meta.currentPage || pageSize !== meta.perPage) {
      router.get(
        window.location.pathname,
        {
          status,
          sortBy: sorting[0]?.id || 'createdAt',
          sortOrder: sorting[0]?.desc ? 'desc' : 'asc',
          page: pageIndex + 1,
          limit: pageSize,
        },
        { preserveState: true, preserveScroll: true }
      )
    }
  }, [pageIndex, pageSize])

  const table = useReactTable({
    data,
    columns,
    pageCount: meta.lastPage,
    state: {
      pagination,
      sorting,
      columnVisibility,
    },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
  })

  const hasActiveFilters = status !== 'all'

  const handleClearFilters = () => {
    setStatus('all')
    setSorting([{ id: 'createdAt', desc: true }])
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-4 text-sm text-muted-foreground order-1 md:order-none">
          <div>
            Total Pending:{' '}
            <span className="font-medium text-foreground">{formatCurrency(stats.pending)}</span>
          </div>
          <div>
            Total Accepted:{' '}
            <span className="font-medium text-green-600">{formatCurrency(stats.approved)}</span>
          </div>
          <div>
            Total Rejected:{' '}
            <span className="font-medium text-red-600">{formatCurrency(stats.rejected)}</span>
          </div>
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:items-center order-2 md:order-none ml-auto">
          {/* ... existing toolbar items ... */}
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                className="h-10 border-dashed"
                onClick={handleClearFilters}
              >
                <HugeiconsIcon icon={Cancel01Icon} className="mr-2 h-4 w-4" />
                Clear
              </Button>
            )}
            <Select value={status} onValueChange={(val) => setStatus(val || 'all')}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DataTableViewOptions table={table} />
        </div>
      </div>
      <DataTable table={table} showSelectionCount={false} />
    </div>
  )
}
