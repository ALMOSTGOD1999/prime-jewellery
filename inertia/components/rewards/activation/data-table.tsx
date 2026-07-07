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

interface ActivationRewardsDataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  meta: any
}

export function ActivationRewardsDataTable<TData, TValue>({
  columns,
  data,
  meta,
}: ActivationRewardsDataTableProps<TData, TValue>) {
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
          page: 1, // Reset to first page on sort change
          limit: pageSize,
          search,
        },
        { preserveState: true, replace: true }
      )
    }
  }, [sorting, pageSize])

  // Sync Pagination with URL
  React.useEffect(() => {
    if (pageIndex + 1 !== meta.current_page || pageSize !== meta.per_page) {
      router.get(
        window.location.pathname,
        {
          sortBy: initialSortBy,
          sortOrder: initialSortOrder,
          page: pageIndex + 1,
          limit: pageSize,
          search,
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

  const [search, setSearch] = React.useState(searchParams.get('search') || '')

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== (searchParams.get('search') || '')) {
        router.get(
          window.location.pathname,
          {
            sortBy: initialSortBy,
            sortOrder: initialSortOrder,
            page: 1,
            limit: pageSize,
            search,
          },
          { preserveState: true, replace: true }
        )
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [search])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1">
          <input
            placeholder="Search by name..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 max-w-sm"
          />
        </div>
        <DataTableViewOptions table={table} />
      </div>
      <DataTable table={table} showSelectionCount={false} />
    </div>
  )
}
