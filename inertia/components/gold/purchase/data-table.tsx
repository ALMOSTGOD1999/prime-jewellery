import * as React from 'react'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  SortingState,
  VisibilityState,
  PaginationState,
} from '@tanstack/react-table'
import { router } from '@inertiajs/react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'
import { DataTablePagination } from '~/components/data-table/data-table-pagination'
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
import { DataTableViewOptions } from '~/components/data-table/data-table-view-options'

interface PurchaseDataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  meta: any
  counts: {
    total: number
    pending: number
    approved: number
    rejected: number
  }
}

export function PurchaseDataTable<TData, TValue>({
  columns,
  data,
  meta,
  counts,
}: PurchaseDataTableProps<TData, TValue>) {
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
          page: 1,
          limit: pageSize,
        },
        { preserveState: true, replace: true }
      )
    }
  }, [status, sorting, pageSize])

  // Sync Pagination with URL
  React.useEffect(() => {
    const currentSort = sorting[0]
    const sortBy = currentSort?.id || 'createdAt'
    const sortOrder = currentSort?.desc ? 'desc' : 'asc'

    if (pageIndex + 1 !== meta.currentPage || pageSize !== meta.perPage) {
      router.get(
        window.location.pathname,
        {
          status,
          sortBy,
          sortOrder,
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
        <div className="flex gap-4 text-sm text-muted-foreground order-1 md:order-none flex-wrap">
          <div>
            Total: <span className="font-medium text-foreground">{counts.total}</span>
          </div>
          <div>
            Pending: <span className="font-medium text-foreground">{counts.pending}</span>
          </div>
          <div>
            Approved: <span className="font-medium text-foreground">{counts.approved}</span>
          </div>
          <div>
            Rejected: <span className="font-medium text-foreground">{counts.rejected}</span>
          </div>
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:items-center order-2 md:order-none">
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
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full md:w-[150px]">
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
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} showSelectionCount={false} />
    </div>
  )
}
