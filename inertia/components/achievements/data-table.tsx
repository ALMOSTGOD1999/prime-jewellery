import * as React from 'react'
import {
  ColumnDef,
  getCoreRowModel,
  PaginationState,
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
import { Input } from '~/components/ui/input'
import { Cancel01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useDebounce } from '~/hooks/use-debounce'

interface AchievementsDataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  meta: any
  filters: {
    search?: string
    collected?: string
  }
}

export function AchievementsDataTable<TData, TValue>({
  columns,
  data,
  meta,
  filters,
}: AchievementsDataTableProps<TData, TValue>) {
  // URL Search Params
  const searchParams = new URLSearchParams(window.location.search)
  const initialSearch = searchParams.get('search') || initialFilters.search || ''
  const initialCollected = searchParams.get('collected') || initialFilters.collected || 'all'

  const [search, setSearch] = React.useState(initialSearch)
  const [debouncedSearch] = useDebounce(search, 500)
  const [collected, setCollected] = React.useState(initialCollected)

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

  // Sync Filters with URL
  React.useEffect(() => {
    if (
      debouncedSearch !== (filters.search || '') ||
      collected !== (filters.collected || 'all') ||
      pageIndex + 1 !== meta.currentPage ||
      pageSize !== meta.perPage
    ) {
      router.get(
        window.location.pathname,
        {
          search: debouncedSearch,
          collected: collected === 'all' ? undefined : collected,
          page: pageIndex + 1,
          limit: pageSize,
        },
        { preserveState: true, preserveScroll: true, replace: true }
      )
    }
  }, [debouncedSearch, collected, pageIndex, pageSize])

  const table = useReactTable({
    data,
    columns,
    pageCount: meta.lastPage,
    state: {
      pagination,
      columnVisibility,
    },
    onPaginationChange: setPagination,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  })

  const hasActiveFilters = search !== '' || collected !== 'all'

  const handleClearFilters = () => {
    setSearch('')
    setCollected('all')
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 items-center space-x-2">
          <Input
            placeholder="Search reward..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-8 w-[150px] lg:w-[250px]"
          />
          <Select value={collected} onValueChange={(value) => setCollected(value || 'all')}>
            <SelectTrigger className="h-8 w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="true">Collected</SelectItem>
              <SelectItem value="false">Pending</SelectItem>
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button variant="ghost" onClick={handleClearFilters} className="h-8 px-2 lg:px-3">
              Reset
              <HugeiconsIcon icon={Cancel01Icon} className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
        <DataTableViewOptions table={table} />
      </div>
      <DataTable table={table} showSelectionCount={false} />
    </div>
  )
}

const initialFilters = {
  search: '',
  collected: 'all',
}
