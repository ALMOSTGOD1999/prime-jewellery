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
import { Button } from '~/components/ui/button'
import { Cancel01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Input } from '~/components/ui/input'
import { useDebounce } from '~/hooks/use-debounce'

interface WalletDataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  meta: any
}

export function WalletDataTable<TData, TValue>({
  columns,
  data,
  meta,
}: WalletDataTableProps<TData, TValue>) {
  const searchParams = new URLSearchParams(window.location.search)
  const initialSearch = searchParams.get('search') || ''

  const [search, setSearch] = React.useState(initialSearch)
  const debouncedSearch = useDebounce(search, 300)
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})

  const [{ pageIndex, pageSize }, setPagination] = React.useState<PaginationState>({
    pageIndex: meta.currentPage - 1,
    pageSize: meta.perPage,
  })

  const pagination = React.useMemo(
    () => ({ pageIndex, pageSize }),
    [pageIndex, pageSize]
  )

  React.useEffect(() => {
    const currentSort = sorting[0]
    const sortBy = currentSort?.id || 'createdAt'
    const sortOrder = currentSort?.desc ? 'desc' : 'asc'

    router.get(
      window.location.pathname,
      {
        sortBy,
        sortOrder,
        search: debouncedSearch,
        page: 1,
        limit: pageSize,
      },
      { preserveState: true, replace: true }
    )
  }, [sorting, debouncedSearch, pageSize])

  React.useEffect(() => {
    if (pageIndex + 1 !== meta.currentPage || pageSize !== meta.perPage) {
      const currentSort = sorting[0]
      router.get(
        window.location.pathname,
        {
          sortBy: currentSort?.id || 'createdAt',
          sortOrder: currentSort?.desc ? 'desc' : 'asc',
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
    state: { pagination, sorting, columnVisibility },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
  })

  const hasActiveFilters = search !== ''

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2 md:flex-row md:items-center order-2 md:order-none w-full">
          <Input
            placeholder="Search users by name, email, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full md:w-[300px]"
          />
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                className="h-10 border-dashed"
                onClick={() => {
                  setSearch('')
                  setSorting([])
                }}
              >
                <HugeiconsIcon icon={Cancel01Icon} className="mr-2 h-4 w-4" />
                Clear
              </Button>
            )}
            <DataTableViewOptions table={table} />
          </div>
        </div>
      </div>
      <DataTable table={table} showSelectionCount={false} />
    </div>
  )
}
