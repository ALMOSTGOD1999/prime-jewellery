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

interface CashbackRewardsDataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  meta: any
}

export function CashbackRewardsDataTable<TData, TValue>({
  columns,
  data,
  meta,
}: CashbackRewardsDataTableProps<TData, TValue>) {
  // URL Search Params
  const searchParams = new URLSearchParams(window.location.search)
  const initialSortBy = searchParams.get('sortBy') || 'date'
  const initialSortOrder = searchParams.get('sortOrder') || 'desc'

  const [sorting, setSorting] = React.useState<SortingState>([
    {
      id: initialSortBy,
      desc: initialSortOrder === 'desc',
    },
  ])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})

  // Pagination State
  const [{ pageIndex, pageSize }, setPagination] = React.useState<PaginationState>({
    pageIndex: meta.current_page - 1,
    pageSize: meta.per_page,
  })

  const pagination = React.useMemo(
    () => ({
      pageIndex,
      pageSize,
    }),
    [pageIndex, pageSize]
  )

  // Sync Sorting with URL
  React.useEffect(() => {
    const currentSort = sorting[0]
    const sortBy = currentSort?.id || 'date'
    const sortOrder = currentSort?.desc ? 'desc' : 'asc'

    if (sortBy !== initialSortBy || sortOrder !== initialSortOrder) {
      router.get(
        window.location.pathname,
        {
          sortBy,
          sortOrder,
          page: 1,
          limit: pageSize,
        },
        { preserveState: true, replace: true }
      )
    }
  }, [sorting, pageSize])

  // Sync Pagination with URL
  React.useEffect(() => {
    const currentSort = sorting[0]
    const sortBy = currentSort?.id || 'date'
    const sortOrder = currentSort?.desc ? 'desc' : 'asc'

    if (pageIndex + 1 !== meta.current_page || pageSize !== meta.per_page) {
      router.get(
        window.location.pathname,
        {
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
    pageCount: meta.last_page,
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

  return (
    <div className="space-y-4">
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
