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

interface WithdrawalsDataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  meta: any
}

export function WithdrawalsDataTable<TData, TValue>({
  columns,
  data,
  meta,
}: WithdrawalsDataTableProps<TData, TValue>) {
  // URL Search Params
  const searchParams = new URLSearchParams(window.location.search)
  const initialSortBy = searchParams.get('sortBy') || 'createdAt'
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

  // Sync Sorting with URL
  React.useEffect(() => {
    const currentSort = sorting[0]
    const sortBy = currentSort?.id || 'createdAt'
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
    if (pageIndex + 1 !== meta.currentPage || pageSize !== meta.perPage) {
      const currentSort = sorting[0]
      const sortBy = currentSort?.id || 'createdAt'
      const sortOrder = currentSort?.desc ? 'desc' : 'asc'

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

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <DataTableViewOptions table={table} />
      </div>
      <DataTable table={table} showSelectionCount={false} />
    </div>
  )
}
