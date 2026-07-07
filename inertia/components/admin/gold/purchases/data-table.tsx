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
import { Input } from '~/components/ui/input'
import { useDebounce } from '~/hooks/use-debounce'

interface AdminGoldPurchasesDataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  meta: any
  hiddenColumns?: string[]
  hideSearch?: boolean
  toolbarActions?: React.ReactNode
}

export function AdminGoldPurchasesDataTable<TData, TValue>({
  columns,
  data,
  meta,
  hiddenColumns = [],
  hideSearch = false,
  toolbarActions,
}: AdminGoldPurchasesDataTableProps<TData, TValue>) {
  // URL Search Params
  const searchParams = new URLSearchParams(window.location.search)
  const initialStatus = searchParams.get('status') || 'all'
  const initialSortBy = searchParams.get('sortBy') || 'createdAt'
  const initialSortOrder = searchParams.get('sortOrder') || 'desc'
  const initialSearch = searchParams.get('search') || ''

  const [status, setStatus] = React.useState(initialStatus)
  const [search, setSearch] = React.useState(initialSearch)
  const debouncedSearch = useDebounce(search, 300)
  const [sorting, setSorting] = React.useState<SortingState>([
    {
      id: initialSortBy,
      desc: initialSortOrder === 'desc',
    },
  ])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(
    hiddenColumns.reduce((acc, col) => ({ ...acc, [col]: false }), {})
  )

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

  // Sync Status, Sorting, and Search with URL
  React.useEffect(() => {
    const currentSort = sorting[0]
    const sortBy = currentSort?.id || 'createdAt'
    const sortOrder = currentSort?.desc ? 'desc' : 'asc'

    if (
      status !== initialStatus ||
      sortBy !== initialSortBy ||
      sortOrder !== initialSortOrder ||
      debouncedSearch !== initialSearch
    ) {
      router.get(
        window.location.pathname,
        {
          status,
          sortBy,
          sortOrder,
          search: debouncedSearch,
          page: 1,
          limit: pageSize,
        },
        { preserveState: true, replace: true }
      )
    }
  }, [status, sorting, debouncedSearch, pageSize])

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
          search: debouncedSearch,
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

  const hasActiveFilters = status !== 'all' || search !== ''

  const handleClearFilters = () => {
    setStatus('all')
    setSearch('')
    setSorting([{ id: 'createdAt', desc: true }])
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2 md:flex-row md:items-center order-2 md:order-none w-full">
          {!hideSearch && (
            <Input
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full md:w-[250px]"
            />
          )}
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
                <SelectItem value="stopped">Stopped</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <DataTableViewOptions table={table} />
            {toolbarActions}
          </div>
        </div>
      </div>
      <DataTable table={table} showSelectionCount={false} />
    </div>
  )
}
