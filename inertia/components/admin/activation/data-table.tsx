import * as React from 'react'
import {
  ColumnDef,
  getCoreRowModel,
  useReactTable,
  PaginationState,
  SortingState,
  VisibilityState,
} from '@tanstack/react-table'
import { router } from '@inertiajs/react'
import { DataTable } from '~/components/data-table/data-table'
import { DataTableViewOptions } from '~/components/data-table/data-table-view-options'
import { Input } from '~/components/ui/input'
import { useDebounce } from '~/hooks/use-debounce'
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

interface AdminActivationDataTableProps<TData, TValue> {
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

export function AdminActivationDataTable<TData, TValue>({
  columns,
  data,
  meta,
  counts,
}: AdminActivationDataTableProps<TData, TValue>) {
  // URL Search Params
  const searchParams = new URLSearchParams(window.location.search)
  const initialSearch = searchParams.get('search') || ''
  const initialStatus = searchParams.get('status') || 'all'
  const initialSortBy = searchParams.get('sortBy') || 'createdAt'
  const initialSortOrder = searchParams.get('sortOrder') || 'desc'

  const [search, setSearch] = React.useState(initialSearch)
  const [status, setStatus] = React.useState(initialStatus)
  const [sorting, setSorting] = React.useState<SortingState>([
    {
      id: initialSortBy,
      desc: initialSortOrder === 'desc',
    },
  ])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const debouncedSearch = useDebounce(search, 500)

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

  // Sync Search, Status, and Sorting with URL
  React.useEffect(() => {
    const currentSort = sorting[0]
    const sortBy = currentSort?.id || 'createdAt'
    const sortOrder = currentSort?.desc ? 'desc' : 'asc'

    if (
      debouncedSearch !== initialSearch ||
      status !== initialStatus ||
      sortBy !== initialSortBy ||
      sortOrder !== initialSortOrder
    ) {
      router.get(
        window.location.pathname,
        {
          search: debouncedSearch,
          status,
          sortBy,
          sortOrder,
          page: 1,
          limit: pageSize,
        },
        { preserveState: true, replace: true }
      )
    }
  }, [debouncedSearch, status, sorting, pageSize])

  // Sync Pagination with URL
  React.useEffect(() => {
    const currentSort = sorting[0]
    const sortBy = currentSort?.id || 'createdAt'
    const sortOrder = currentSort?.desc ? 'desc' : 'asc'

    if (pageIndex + 1 !== meta.currentPage || pageSize !== meta.perPage) {
      router.get(
        window.location.pathname,
        {
          search: debouncedSearch,
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

  const hasActiveFilters = search !== '' || status !== 'all'

  const handleClearFilters = () => {
    setSearch('')
    setStatus('all')
    setSorting([{ id: 'createdAt', desc: true }])
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-4 text-sm text-muted-foreground order-1 md:order-none">
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
          <Input
            placeholder="Search requests..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full md:max-w-sm"
          />
          <DataTableViewOptions table={table} />
        </div>
      </div>
      <DataTable table={table} showSelectionCount={false} />
    </div>
  )
}
